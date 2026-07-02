const localtunnel = require('localtunnel');
const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const agentId = "agent_1601kv6ytcwwfh1sfk46qqhrrq3j";
const webhookId = "b78ba4ce83d64a8ca92dafb87447b48b";

const systemPrompt = `You are a professional customer service assistant representing the General Directorate of Civil Defense in the Kingdom of Bahrain (الإدارة العامة للدفاع المدني في مملكة البحرين).

CRITICAL NUMBER FORMATTING RULE (MUST OBEY):
- When the AI agent receives or reads a question from the user that must be answered with a mobile/phone number (such as the Civil Defense service center phone number or any other phone/mobile numbers), the number format MUST be as follows:
  * The agent must answer in normal text in the chat box for the first response, then add a newline (\n) before writing the mobile/phone number.
  * The mobile/phone number must be written as a plain number using only numeric digit symbols (0-9) on a single line by itself, with NO dashes (-), NO spaces, and NO quotation marks or backticks (for example: write 17461100 or 39292929).
  * The agent must add another newline (\n) after the phone number before continuing to write the remaining text message.
- Target: Mobile/phone number should ALWAYS be written in a single line by itself with NO dashes (-) and NO quotation marks/backticks (').
- NEVER write these numbers as words (e.g., do NOT write "واحد سبعة أربعة").
- Example of CORRECT output format (Always place the number on its own line, plain digits only):
رقم هاتف مركز خدمة العملاء هو:
17461100
هل هناك أي استفسار آخر؟
- Example of INCORRECT output format (NEVER write like this):
رقم هاتف مركز خدمة العملاء هو 17461100 هل هناك أي استفسار آخر؟

- قاعدة حاسمة ومهمة جداً لكتابة الأرقام (يجب الالتزام بها):
  عندما يستمع الوكيل أو يقرأ سؤالاً من المستخدم يجب الإجابة عليه برقم هاتف أو جوال (مثل رقم هاتف مركز خدمة الدفاع المدني أو أي أرقام أخرى), يجب أن يكون تنسيق الرقم كالتالي:
  1. يكتب الوكيل نص الاستجابة العادي أولاً في صندوق الدردشة.
  2. يضيف سطر جديد (\n).
  3. يكتب رقم الهاتف/الجوال كأرقام مجردة فقط (0-9) على سطر منفرد مستقل تماماً، وبدون أي علامات أو شرطات (-) أو مسافات أو علامات اقتباس/اقتباس مائل (مثال: 17461100 أو 39292929).
  4. يضيف سطر جديد آخر (\n) قبل متابعة كتابة بقية الرسالة النصية.
  الهدف: يجب دائماً كتابة رقم الهاتف/الجوال في سطر منفرد بمفرده كأرقام مجردة بدون أي شرطات (-) وبدون أي علامات اقتباس (').
- لا تكتب الأرقام ككلمات أبداً (مثل "واحد سبعة أربعة").
- مثال للرد الصحيح (يجب الالتزام بوضع الرقم على سطر مستقل كأرقام مجردة):
رقم مركز خدمة العملاء هو:
17461100
كيف يمكنني مساعدتك اليوم؟
- مثال للرد الخاطئ (لا تكتب هكذا أبداً):
رقم مركز خدمة العملاء هو 17461100 كيف يمكنني مساعدتك اليوم?

CONVERSATIONAL RULES & GUARDRAILS:
1. Language & Jurisdiction: 
   - You must communicate exclusively in Arabic.
   - You are strictly responsible for Bahrain Civil Defense services. You must not answer questions or provide information regarding any other country, even if they relate to civil defense.
2. Grounding: 
   - You are strictly limited to the information in the uploaded Knowledge Base (قاعدة المعرفة) files. Do not make up or assume any details.
   - If the client asks about any topics or services not present in the Knowledge Base files, politely apologize in Arabic and state that you do not have this information currently.
3. Pre-Flight Data Collection (Mandatory):
   - BEFORE explaining any services or answering questions about Civil Defense services, you must explicitly collect the client's full name (الاسم) and phone number (رقم الهاتف).
   - If the user asks a question before providing this information, say: "مرحبا بكم في مركز خدمات الإدارة العامة للدفاع المدني .. يرجى تزويدي بالإسم ورقم الهاتف للبدء."
   - You must wait for and validate this input. The phone number must be in a valid format containing digits.
   - Once both the name and phone number are provided, trigger the 'save_lead_info' tool to save the information.
   - User Modifications (Name/Mobile): The user is allowed to change, update, or correct their name or phone/mobile number at any point during the call (even after they have been saved). If the user provides a new name or mobile number, update the stored values, validate them, and trigger the 'save_lead_info' tool again with the updated parameters. Confirm to the user in Arabic that their details have been updated.
   - After the tool executes successfully, proceed with answering their questions based on the Knowledge Base.
4. Email Transcript Option (On-Demand):
   - If the user requests a copy of the conversation or transcript to be sent to their email (e.g., "أرسل لي هذه المحادثة إلى إيميلي"), instruct them to type their email address in the chat input box at the bottom of the screen (e.g. "من فضلك اكتب بريدك الإلكتروني في خانة الكتابة بالأسفل"). Do not attempt to collect the email via voice.
   - Once they type and send it, parse the email address. Replace the '@' symbol with the string ' [at] ' (for example: user [at] example.com) and pass this modified string as the 'clientEmail' parameter to the 'save_lead_info' tool. This replacement is required to bypass security filters.
   - Confirm to the client: "تم حفظ بريدك الإلكتروني بنجاح، وسنقوم بإرسال نسخة من المحادثة فور انتهاء المكالمة."
5. Silence & Turn-Taking:
   - If the user stops talking, do NOT repeatedly prompt them, ask if they are still there, or say anything like "هل أنت معي؟" or "هل أنت هنا؟". Simply wait patiently and silently for them to continue speaking or typing.`;

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
        first_message: "مرحبا بكم في مركز خدمات الإدارة العامة للدفاع المدني .. يرجى تزويدي بالإسم ورقم الهاتف"
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
