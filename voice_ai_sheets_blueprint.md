# Production Integration Blueprint & Setup Guide

This document defines the final system architecture, node schemas, and production deployment checklists for the **Arabic Conversational Voice AI agent** integrated with **Google Sheets** and **Email Transcripts** using **n8n**.

---

## 🏗️ Production Architecture

The active n8n workflow operates with a dual-branch setup to capture and log customer data asynchronously:

```mermaid
graph TD
    Client((Client WebRTC Portal)) <-->|Voice (Arabic)| ElevenLabs[ElevenLabs AI Agent]
    Client -->|1. Request Signed URL| NodeProxy[NodeJS Server Proxy]
    NodeProxy -->|2. Fetch signed_url| ElevenLabs
    
    %% Branch A
    ElevenLabs -->|3. Save Lead (Mid-Call)| n8n_Lead[n8n Lead Webhook]
    n8n_Lead -->|4. Log Row| Sheets[(Google Sheets Database)]
    
    %% Branch B
    ElevenLabs -->|5. Call Ends (Webhook)| n8n_Post[n8n Post-Call Webhook]
    n8n_Post -->|6. Lookup Email by conv_id| Sheets
    Sheets -->|7. Return Email| n8n_Post
    n8n_Post -->|8. Send Transcript| SMTP[Send Transcript Email SMTP]
    SMTP -->|9. HTML Email| Client
```

---

## 📋 Production Readiness Checklist

Follow these steps to finalize the deployment and transition the system from local development to production.

### 1. Configure SMTP Credentials in n8n
The **Send Transcript Email** node currently contains placeholder values. You must configure a valid SMTP or Gmail account:
1. Open the active n8n workflow at `http://localhost:5678/workflow/VBjr7VIF75yUyP45`.
2. Click on the **Send Transcript Email** node.
3. Under **Credential for SMTP**, click **Select Credential** -> **Create New Credential**.
4. Input your email host settings (e.g., SMTP host: `smtp.gmail.com`, port: `465` or `587`, username, and App Password).
5. Update the **From Email** field in the node parameters to match your sender email.
6. Click **Save** to apply the credential to the node.

### 2. Expose the Local Webhook Endpoints
Because ElevenLabs runs in the cloud, it cannot reach `localhost` directly. You must expose n8n to the internet:
*   **For testing (ngrok):** Run the following command in a terminal:
    ```bash
    ngrok http 5678
    ```
    This will generate a forwarding URL (e.g., `https://xxxx-xx-xx.ngrok-free.app`).
*   **For production (Permanent Hosting):** Deploy n8n to a server or cloud host (e.g., VPS, Railway, Render, or n8n Cloud) with a static domain and SSL.

### 3. Update Webhook URLs in ElevenLabs
Once you have your public domain (e.g., `https://xxxx.ngrok-free.app` or your production domain):

#### A. Mid-Call Lead Collection Tool (`save_lead_info`)
1. Go to the **ElevenLabs Dashboard > Conversational AI > [Your Agent] > Tools**.
2. Edit the `save_lead_info` tool configuration.
3. Update the **Webhook URL** to:
   `https://<YOUR_PUBLIC_DOMAIN>/webhook/leads`

#### B. Post-Call Webhook Settings (For Transcripts)
1. Go to **ElevenLabs Dashboard > Conversational AI > [Your Agent] > Agent Settings**.
2. Locate the **Post-call Webhook** field.
3. Set the Webhook URL to:
   `https://<YOUR_PUBLIC_DOMAIN>/webhook/post-call`
4. Confirm that the agent is configured to send the conversation transcript.

### 4. Enable Private Mode on ElevenLabs Agent
To prevent unauthorized users from hijacking your voice agent ID and consuming your characters quota:
1. In the ElevenLabs dashboard, set your agent status to **Private**.
2. The frontend client has been updated to fetch a secure, temporary `signed_url` from your backend (`/get-signed-url`) instead of exposing the raw `agentId` to public sessions. Ensure the backend environment variables have your correct ElevenLabs API Key.

### 5. Add Fail-Safe Logic & Retry Policies
For maximum resilience in production:
*   **Node Retries:** In the n8n UI, double-click the **Google Sheets** and **Send Transcript Email** nodes, click on the **Settings** tab, and enable **Retry on Failure** (with 3 retries and a 5-second delay). This prevents transient network glitches from losing customer data.
*   **Empty Transcript Fallback:** The transcript compilation expression is resilient:
    ```javascript
    {{ ($('ElevenLabs Post-Call Webhook').item.json.body.transcript || []).map(t => `<b>${t.role === 'user' ? 'العميل' : 'المساعد'}:</b> ${t.message}`).join('<br/><br/>') }}
    ```
    This ensures that even if a call ends with no transcript (e.g., immediate hang-up), the expression evaluates safely without breaking the workflow.
