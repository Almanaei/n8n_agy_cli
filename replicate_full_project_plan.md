# Complete Project Replication Plan: Standalone Voice AI, Web Client, & n8n Automation System

This document contains a comprehensive plan, design specification, and file-by-file blueprints for replicating, building, and deploying the complete Voice AI system from scratch.

A new developer or agent can read this guide to rebuild the entire codebase, configure the services, set up the network tunnels, establish the n8n workflows, and connect Twilio and SMTP servers for automated post-call notifications.

---

## 📂 Repository & Project Structure

Recreate the project using the following directory structure:
```
n8n_agy_cli/
├── package.json              # NPM dependencies & startup scripts
├── .env                      # API keys and local URLs
├── server.js                 # App Server (Express/HTTP, handles signed URLs)
├── index.html                # Frontend User Interface (Cairo font, glowing mesh UI)
├── cloudflared_manager.js    # Background Cloudflare Tunnel Manager
├── standalone_voice_plan.md  # Blueprint to replace ElevenLabs with open-source models
└── replicate_full_project_plan.md # This replication blueprint
```

---

## 1. Environment & Project Setup

### `package.json`
```json
{
  "name": "n8n_agy_cli",
  "version": "1.0.0",
  "description": "Voice AI integration with n8n, sheets, and communication channels",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "tunnel": "node cloudflared_manager.js"
  },
  "dependencies": {},
  "devDependencies": {}
}
```

### `.env`
```ini
# n8n API configuration
N8N_API_URL=http://localhost:5678/api/v1
N8N_API_KEY=your_n8n_api_key_here

# ElevenLabs API configuration (if using ElevenLabs)
ELEVENLABS_API_KEY=896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c
ELEVENLABS_AGENT_ID=agent_1601kv6ytcwwfh1sfk46qqhrrq3j
```

---

## 2. Frontend Client (`index.html`)

The client interface is a single-page web app styled with dark-mode, frosted-glass components, and animated gradient meshes.

### Core Frontend Tasks:
1.  **WebSocket Safepatch**: ElevenLabs sends microphone audio frames over WebSockets. If the WebSocket connection closes, sending raw frames causes console flooding. Inject this WebSocket prototype patch in `<head>`:
    ```javascript
    (function() {
        const originalSend = WebSocket.prototype.send;
        WebSocket.prototype.send = function(data) {
            if (this.readyState === WebSocket.OPEN) {
                try {
                    originalSend.call(this, data);
                } catch (err) {
                    console.error("Error sending WebSocket message:", err);
                }
            } else {
                if (!this.hasWarnedClosed) {
                    console.warn("WebSocket is closed (readyState: " + this.readyState + "). Suppressed.");
                    this.hasWarnedClosed = true;
                }
            }
        };
    })();
    ```
2.  **Audio Session Hook**: Request signed conversation URLs from `/get-signed-url` on the local App Server instead of hardcoding API keys in the client source.
3.  **UI Layout**: Include a clean Cairo font, status indicator glows (offline: red, connecting: orange, online: green), dynamic visualizers matching the microphone input levels, chat transcript containers, and text-input boxes allowing users to submit details (like their email addresses) via keyboard input.

---

## 3. Backend App Server (`server.js`)

A lightweight Node.js HTTP/Express server that serves the static frontend assets and generates secure, signed connection URLs from ElevenLabs.

### Core Server Implementation Details:
*   Listen on port `3000`.
*   Serve `index.html` on requests to `/` or `/index.html`.
*   Handle `/get-signed-url` by proxying requests to ElevenLabs API:
    *   **Method**: `GET`
    *   **Endpoint**: `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${ELEVENLABS_AGENT_ID}`
    *   **Headers**: `xi-api-key: ${ELEVENLABS_API_KEY}`
    *   **Response**: Returns the JSON payload containing the signed token back to the browser with CORS headers allowed (`Access-Control-Allow-Origin: *`).

---

## 4. Cloudflare Tunnel Manager (`cloudflared_manager.js`)

Automates spawning and maintaining a persistent `cloudflared` tunnel, bringing local endpoints online via a public `.trycloudflare.com` domain.

### Core Manager Logic:
1.  **Binary Downloader**: Checks if local `cloudflared.exe` exists in the project root. If missing, downloads it automatically from the official Cloudflare GitHub repository releases.
2.  **Child Process Spawning**:
    *   Spawns `cloudflared.exe tunnel --url http://localhost:5678` (or points to a config file defining ingress routes).
    *   Captures the child process standard output and standard error streams.
3.  **URL Extraction**: Searches the terminal stdout log in real-time using a Regular Expression:
    `/https:\/\/[a-z0-9\-]+\.trycloudflare\.com/`
    Once matched, parses the URL and prints it.
4.  **Auto-Config ElevenLabs Agent**:
    *   Once the new tunnel URL is extracted, performs a `PATCH` request to the ElevenLabs agent settings at:
        `PATCH https://api.elevenlabs.io/v1/convai/agents/${ELEVENLABS_AGENT_ID}`
    *   Updates the `save_lead_info` tool URL:
        `https://<new-tunnel-url>/webhook/leads`
    *   Creates or updates the post-call workspace webhook event using:
        `POST https://api.elevenlabs.io/v1/workspace/webhooks`
        Setting `webhook_url` to `https://<new-tunnel-url>/webhook/post-call` and associates the resulting `webhook_id` in the agent's `workspace_overrides.webhooks.post_call_webhook_id`.

---

## 5. n8n Workflow Architecture (Workflow ID: `VBjr7VIF75yUyP45`)

The automation pipeline is built in n8n and orchestrates lead saving, database lookups, and transcript formatting for dispatch.

```
       [Webhook Leads /leads] ------------> [Google Sheets: Append Row]
       
  [Webhook Post-Call /post-call] 
                 │
                 ▼
       [Google Sheets: Lookup Row]
                 │
                 ▼
     [Format WhatsApp Payload]
          /             \
         /               \
        ▼                 ▼
  [Email Exists?]  [Send WhatsApp (Twilio)] (Ignore errors)
        │
        ▼
  [Send Email (SMTP)]
```

### Node 1: ElevenLabs Webhook (leads)
*   **Path**: `leads` (HTTP Method: `POST`)
*   **Purpose**: Receives client data submitted in-conversation (Name, Phone number, Email, and Session ID).

### Node 2: Google Sheets (Append Row)
*   **Sheet Config**: Appends a new row to the tracking spreadsheet.
*   **Column Mappings**:
    *   *Timestamp*: `={{ $now }}`
    *   *Client Name*: `={{ $json.body.clientName || '' }}`
    *   *Phone Number*: `={{ $json.body.phoneNumber || '' }}`
    *   *Client Email*: Standardizes the input. Bypasses anti-phishing blocks by replacing placeholders:
        `={{ ($json.body.clientEmail || '').replace(' [at] ', '@').replace('[at]', '@') }}`
    *   *Conversation ID*: `={{ $json.body.conversationId || '' }}`
    *   *Lead Status*: `"New Lead"`

### Node 3: ElevenLabs Post-Call Webhook
*   **Path**: `post-call` (HTTP Method: `POST`)
*   **Purpose**: Fired automatically when the call session terminates.
*   **Crucial Input Checking**: Handles differences between test webhooks and real ElevenLabs events (which wrap payloads inside a `data` key).

### Node 4: Lookup Lead Email (Google Sheets)
*   **Lookup Config**: Reads from spreadsheet.
*   **Filter Condition**: Finds the row where the column `Conversation ID` matches the incoming session ID:
    `={{ $json.body.data?.conversation_id || $json.body.conversation_id || '' }}`

### Node 5: Format WhatsApp Payload (Code Node)
*   **Language**: JavaScript
*   **Purpose**: Resolves double-submission entries, filters background events, extracts clean messages, and formats numbers.
*   **Implementation Code**:
    ```javascript
    const items = $input.all();
    
    // Find the matching row that has a valid email, falling back to the last row
    let lead = items.find(item => item.json['Client Email'] && item.json['Client Email'].includes('@'))?.json;
    if (!lead && items.length > 0) {
      lead = items[items.length - 1].json;
    }
    
    const webhookBody = $('ElevenLabs Post-Call Webhook').first().json.body || {};
    const transcript = webhookBody.data?.transcript || webhookBody.transcript || [];
    
    // Filter out background tool calls/results and format conversational transcript into standard Arabic log
    const formatted = transcript
      .filter(t => t.message || t.original_message)
      .map(t => {
        const role = t.role === 'user' ? 'العميل' : 'المساعد';
        const msg = t.original_message || t.message || '';
        return `*${role}*: ${msg}`;
      }).join('\n\n');
    
    // Clean and format phone number for WhatsApp compatibility
    let phone = String(lead ? lead['Phone Number'] || "" : "");
    phone = phone.replace(/\s+/g, '').replace('+', '');
    
    if (phone.length === 8 && (phone.startsWith('3') || phone.startsWith('6') || phone.startsWith('1'))) {
      phone = '973' + phone; // Prepend Bahrain's country code
    }
    
    const whatsappNumber = phone ? `whatsapp:+${phone}` : '';
    
    return [{
      json: {
        ...(lead || {}),
        whatsappNumber,
        formattedTranscript: formatted
      }
    }];
    ```

### Node 6: Email Exists? (Filter Node)
*   **Purpose**: Validates if `Client Email` contains an `@` symbol. If empty, the email branch stops, but the WhatsApp branch continues.

### Node 7: Send Transcript Email (SMTP Node)
*   **Destination**: `={{ $json['Client Email'] }}`
*   **Subject**: `"نسخة من محادثتك مع المساعد الذكي"`
*   **Format**: HTML
*   **Template Body**:
    ```html
    <h3>مرحباً {{ $json['Client Name'] }}،</h3>
    <p>شكراً لتواصلك معنا. إليك نسخة من المحادثة التي أجريتها مع مساعدنا الذكي:</p>
    <hr/>
    <div style='background:#f3f4f6; padding:20px; border-radius:10px;'>
      {{ ($('ElevenLabs Post-Call Webhook').item.json.body.data?.transcript || $('ElevenLabs Post-Call Webhook').item.json.body.transcript || []).filter(t => t.message || t.original_message).map(t => '<b>' + (t.role === 'user' ? 'العميل' : 'المساعد') + ':</b> ' + (t.original_message || t.message || '')).join('<br/><br/>') }}
    </div>
    ```

### Node 8: Send WhatsApp Summary (Twilio HTTP Request)
*   **HTTP Method**: `POST`
*   **Endpoint**: `https://api.twilio.com/2010-04-01/Accounts/<account-sid>/Messages.json`
*   **Authentication**: Basic Auth (Account SID as username, Auth Token as password)
*   **Payload Type**: `form-urlencoded`
*   **Body Fields**:
    *   *From*: `whatsapp:+14155238886` (Twilio Sandbox sender)
    *   *To*: `={{ $json.whatsappNumber }}`
    *   *Body*:
        ```
        مرحباً {{ $json["Client Name"] }}،

        شكراً لتواصلك مع الإدارة العامة للدفاع المدني بمملكة البحرين. إليك نسخة من المحادثة التي أجريتها مع مساعدنا الذكي:

        {{ $json.formattedTranscript }}
        ```
*   **Critical Settings**:
    *   **On Error**: `"continueRegularOutput"` (Setting this ensures that sandbox warnings or incorrect client phone numbers don't crash n8n's execution logs, allowing the mail channel to operate regardless).

---

## 6. Standalone Voice AI Agent Integration

To fully isolate the architecture and replace third-party SaaS voice providers (like ElevenLabs):
1.  Follow the hardware, vLLM routing, Silero VAD parameters, Faster-Whisper endpoints, and Kokoro-82M TTS configuration detailed in the [standalone_voice_plan.md](file:///D:/geminiprojects/n8n_agy_cli/standalone_voice_agent_plan.md).
2.  Ensure that when the WebSocket session closes in your custom Python/Node gateway, the gateway queries its dialogue state database, constructs the post-call transcript array, and performs a POST request matching the nested `data.conversation_id` structure to trigger this complete replication pipeline!
