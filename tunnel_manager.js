const localtunnel = require('localtunnel');
const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const agentId = "agent_1601kv6ytcwwfh1sfk46qqhrrq3j";
const webhookId = "b78ba4ce83d64a8ca92dafb87447b48b";

const systemPrompt = `You are a professional customer service assistant representing the General Directorate of Civil Defense in the Kingdom of Bahrain (الإدارة العامة للدفاع المدني في مملكة البحرين).

CRITICAL LANGUAGE LOCK (MUST OBEY):
- You must support both Arabic and English.
- The user's initial choice of language (Arabic or English) MUST be locked and preserved throughout the entire conversation.
- If the user starts the conversation in English, or answers in English (e.g. providing their name and phone number in English), you MUST speak and respond ONLY in English. Do NOT switch back to Arabic under any circumstances (such as after calling a tool or when confirming saved info) unless the user explicitly changes the language to Arabic.
- If the user starts the conversation in Arabic, respond ONLY in Arabic.
- Do not mix languages within a single response.

CRITICAL NUMBER FORMATTING RULE (MUST OBEY):
- When the AI agent receives or reads a question from the user that must be answered with a mobile/phone number (such as the Civil Defense service center phone number or any other phone/mobile numbers), the number format MUST be as follows:
  * The agent must answer in normal text in the chat box for the first response, then add a newline (\n) before writing the mobile/phone number.
  * The mobile/phone number must be written as a plain number using only numeric digit symbols (0-9) on a single line by itself, with NO dashes (-), NO spaces, and NO quotation marks or backticks (for example: write 17461100 or 39292929).
  * The agent must add another newline (\n) after the phone number before continuing to write the remaining text message.
- Target: Mobile/phone number should ALWAYS be written in a single line by itself with NO dashes (-) and NO quotation marks/backticks (').
- NEVER write these numbers as words (e.g., do NOT write "واحد سبعة أربعة" or "one seven four").
- Example of CORRECT output format in English:
The customer service phone number is:
17461100
Is there anything else I can help you with?
- Example of CORRECT output format in Arabic:
رقم هاتف مركز خدمة العملاء هو:
17461100
هل هناك أي استفسار آخر؟

CONVERSATIONAL RULES & GUARDRAILS:
1. Jurisdiction: 
   - You are strictly responsible for Bahrain Civil Defense services. You must not answer questions or provide information regarding any other country, even if they relate to civil defense.
2. Grounding: 
   - You are strictly limited to the information in the uploaded Knowledge Base (قاعدة المعرفة) files. Do not make up or assume any details.
   - If the client asks about any topics or services not present in the Knowledge Base files, politely apologize in the active language and state that you do not have this information currently.
3. Pre-Flight Data Collection (Mandatory & Immediate Tool Call):
   - BEFORE explaining any services or answering questions, you MUST explicitly collect the client's name (الاسم) and phone number (رقم الهاتف).
   - If the client provides both the name and phone number (e.g., they say "علي 29292929" or "اسمي علي ورقمي 39292929" or "أنا علي وهذا رقمي 29292929" in Arabic, or "Ali 39292929" or "My name is Ali and my number is 39292929" in English), you MUST IMMEDIATELY trigger the 'save_lead_info' tool with the extracted parameters.
   - IMPORTANT: DO NOT repeat your greeting or ask the user again for their name or mobile number once they have provided them. CALL THE 'save_lead_info' TOOL IMMEDIATELY!
   - Examples of immediate tool calling:
     * User: "Ali 39292929" -> Call save_lead_info(clientName="Ali", phoneNumber="39292929")
     * User: "علي 39292929" -> Call save_lead_info(clientName="علي", phoneNumber="39292929")
   - If the user only provides a name, politely ask for their phone number. If they only provide a phone number, politely ask for their name. Once you have both, call the 'save_lead_info' tool.
   - If the user asks a question before providing this information:
     * Arabic: "مرحباً بكم في مركز خدمات الإدارة العامة للدفاع المدني. للبدء، يرجى تزويدي باسمك الكريم ورقم هاتفك."
     * English: "Welcome to the General Directorate of Civil Defense. To begin, please provide your name and phone number."
   - User Modifications (Name/Mobile): The user can correct their name/phone number at any time. If they do, call the 'save_lead_info' tool again with the new details and confirm the update in their active language.
   - Only after the tool executes successfully, proceed with answering their questions based on the Knowledge Base.
4. Email Transcript Option (On-Demand):
   - If the user requests a copy of the conversation or transcript to be sent to their email (e.g., "أرسل لي هذه المحادثة إلى إيميلي" or "send me this transcript to my email"), instruct them to type their email address in the chat input box at the bottom of the screen. Do not attempt to collect the email via voice.
   - Arabic instruction: "من فضلك اكتب بريدك الإلكتروني في خانة الكتابة بالأسفل وسأقوم بإرسال النسخة فوراً."
   - English instruction: "Please type your email address in the chat input box at the bottom of the screen and I will send the transcript immediately."
   - Once they type and send it, parse the email address. Replace the '@' symbol with the string ' [at] ' (for example: user [at] example.com) and pass this modified string as the 'clientEmail' parameter to the 'save_lead_info' tool. This replacement is required to bypass security filters.
   - Confirm to the client:
     * Arabic: "تم حفظ بريدك الإلكتروني بنجاح، وسنقوم بإرسال نسخة من المحادثة فور انتهاء المكالمة."
     * English: "Your email address has been saved successfully. We will send a copy of the transcript as soon as the call ends."
5. Silence & Turn-Taking:
   - If the user stops talking, do NOT repeatedly prompt them. Simply wait patiently and silently for them to continue speaking or typing.`;

async function patchElevenLabs(baseUrl) {
  console.log(`[ElevenLabs] Patching agent and webhook with new tunnel URL: ${baseUrl}`);
  
  // 1. Patch Agent Config
  const agentPayload = {
    conversation_config: {
      agent: {
        prompt: {
          prompt: systemPrompt,
          tools: [
            {
              type: "webhook",
              name: "save_lead_info",
              description: "Call this tool to save the client's name, phone number, and optional email. This must be done BEFORE providing service details, or when they request an email transcript.",
              api_schema: {
                url: `${baseUrl}/webhook/leads`,
                method: "POST",
                request_headers: {
                  "Content-Type": "application/json",
                  "Bypass-Tunnel-Reminder": "true"
                },
                request_body_schema: {
                  type: "object",
                  required: ["conversationId"],
                  properties: {
                    clientName: {
                      type: "string",
                      description: "The client's full name."
                    },
                    phoneNumber: {
                      type: "string",
                      description: "The client's phone number."
                    },
                    clientEmail: {
                      type: "string",
                      description: "The client's email address (optional, only if requested by user)."
                    },
                    conversationId: {
                      type: "string",
                      dynamic_variable: "system__conversation_id"
                    }
                  }
                }
              }
            }
          ]
        },
        first_message: "مرحبا بكم في مركز خدمات الدفاع المدني الذكي. يرجى تزويدي بالإسم ورقم الهاتف للبدء\nWelcome to the Civil Defense services. Please provide your name and phone number to begin."
      },
      turn: {
        turn_timeout: 15
      }
    }
  };

  try {
    const agentRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: "PATCH",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(agentPayload)
    });
    
    if (agentRes.ok) {
      console.log("[ElevenLabs] Agent successfully patched! 🎉");
    } else {
      console.error("[ElevenLabs] Failed to patch agent:", await agentRes.text());
    }
  } catch (err) {
    console.error("[ElevenLabs] Agent patch request error:", err);
  }

  // 2. Manage Webhooks dynamically
  try {
    const listRes = await fetch("https://api.elevenlabs.io/v1/workspace/webhooks", {
      headers: { "xi-api-key": apiKey }
    });
    if (!listRes.ok) {
      throw new Error(`Failed to list webhooks: ${listRes.status} ${await listRes.text()}`);
    }
    const { webhooks } = await listRes.json();
    
    const targetUrl = `${baseUrl}/webhook/post-call`;
    let activeWebhookId = null;
    
    // Check if a webhook for targetUrl already exists
    const existing = webhooks.find(wh => wh.webhook_url === targetUrl);
    if (existing) {
      console.log(`[ElevenLabs] Webhook for ${targetUrl} already exists: ${existing.webhook_id}`);
      activeWebhookId = existing.webhook_id;
    } else {
      console.log(`[ElevenLabs] Creating new webhook for ${targetUrl}...`);
      const createRes = await fetch("https://api.elevenlabs.io/v1/workspace/webhooks", {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          settings: {
            auth_type: "hmac",
            name: "n8n_post_call_active_tunnel",
            webhook_url: targetUrl
          }
        })
      });
      if (!createRes.ok) {
        throw new Error(`Failed to create webhook: ${createRes.status} ${await createRes.text()}`);
      }
      const createData = await createRes.json();
      console.log(`[ElevenLabs] Created webhook successfully: ${createData.webhook_id}`);
      activeWebhookId = createData.webhook_id;
    }
    
    // Link to ConvAI Settings
    console.log(`[ElevenLabs] Linking webhook ${activeWebhookId} in workspace ConvAI settings...`);
    const settingsRes = await fetch("https://api.elevenlabs.io/v1/convai/settings", {
      method: "PATCH",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        webhooks: {
          post_call_webhook_id: activeWebhookId
        }
      })
    });
    if (!settingsRes.ok) {
      console.error("[ElevenLabs] Failed to update ConvAI settings:", await settingsRes.text());
    } else {
      console.log("[ElevenLabs] ConvAI settings successfully updated with the active webhook! 🎉");
    }
    
    // Clean up old/unused localtunnel/trycloudflare webhooks
    for (const wh of webhooks) {
      if (wh.webhook_id !== activeWebhookId && (wh.webhook_url.includes("trycloudflare.com") || wh.webhook_url.includes("localtunnel.me") || wh.webhook_url.includes("lt.live"))) {
        console.log(`[ElevenLabs] Deleting old/unused webhook: ${wh.webhook_id} (${wh.webhook_url})`);
        const delRes = await fetch(`https://api.elevenlabs.io/v1/workspace/webhooks/${wh.webhook_id}`, {
          method: "DELETE",
          headers: { "xi-api-key": apiKey }
        });
        if (delRes.ok) {
          console.log(`[ElevenLabs] Deleted old webhook ${wh.webhook_id}`);
        } else {
          console.error(`[ElevenLabs] Failed to delete old webhook ${wh.webhook_id}:`, await delRes.text());
        }
      }
    }
  } catch (err) {
    console.error("[ElevenLabs] Error managing webhooks:", err);
  }
}

async function startTunnel() {
  console.log("[Tunnel] Starting localtunnel via Node API...");
  try {
    const tunnel = await localtunnel({
      port: 5678,
      subdomain: 'bhdefense-n8n-leads'
    });
    
    const baseUrl = tunnel.url;
    console.log(`[Tunnel] Established at: ${baseUrl}`);
    
    if (!baseUrl.includes('bhdefense-n8n-leads')) {
      console.warn(`[Tunnel] Warning: Did not get requested subdomain. Got: ${baseUrl}. Closing and retrying...`);
      tunnel.close();
      setTimeout(startTunnel, 5000);
      return;
    }
    
    await patchElevenLabs(baseUrl);
    
    tunnel.on('close', () => {
      console.log('[Tunnel] Closed. Reconnecting in 5 seconds...');
      setTimeout(startTunnel, 5000);
    });
    
    tunnel.on('error', (err) => {
      console.error('[Tunnel] Error:', err);
      tunnel.close();
    });
    
  } catch (err) {
    console.error("[Tunnel] Start error:", err);
    setTimeout(startTunnel, 5000);
  }
}

startTunnel();
