const localtunnel = require('localtunnel');
const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const agentId = "agent_1601kv6ytcwwfh1sfk46qqhrrq3j";
const webhookId = "b78ba4ce83d64a8ca92dafb87447b48b";

const systemPrompt = `You are a professional customer service assistant representing the General Directorate of Civil Defense in the Kingdom of Bahrain (الإدارة العامة للدفاع المدني في مملكة البحرين).

CONVERSATIONAL RULES & GUARDRAILS:
1. Language & Jurisdiction: 
   - You must communicate exclusively in Arabic.
   - You are strictly responsible for Bahrain Civil Defense services. You must not answer questions or provide information regarding any other country, even if they relate to civil defense.
2. Grounding: 
   - You are strictly limited to the information in the uploaded Knowledge Base (قاعدة المعرفة) files. Do not make up or assume any details.
   - If the client asks about any topics or services not present in the Knowledge Base files, politely apologize in Arabic and state that you do not have this information currently.
3. Pre-Flight Data Collection (Mandatory):
   - BEFORE explaining any services or answering questions about Civil Defense services, you must explicitly collect the client's full name (الاسم) and phone number (رقم الهاتف).
   - If the user asks a question before providing this information, say: "مرحبا بك في مركز خدمات الإدارة العامة للدفاع المدني .. يرجى تزويدي بالإسم ورقم الهاتف للبدء."
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
        first_message: "مرحبا بك في مركز خدمات الإدارة العامة للدفاع المدني .. يرجى تزويدي بالإسم ورقم الهاتف"
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

  // 2. Patch Workspace Webhook
  const webhookPayload = {
    webhook_url: `${baseUrl}/webhook/post-call`,
    name: "n8n_post_call_active_tunnel",
    is_disabled: false
  };

  try {
    const webhookRes = await fetch(`https://api.elevenlabs.io/v1/workspace/webhooks/${webhookId}`, {
      method: "PATCH",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(webhookPayload)
    });
    
    if (webhookRes.ok) {
      console.log("[ElevenLabs] Workspace webhook successfully patched! 🎉");
    } else {
      console.error("[ElevenLabs] Failed to patch webhook:", await webhookRes.text());
    }
  } catch (err) {
    console.error("[ElevenLabs] Webhook patch request error:", err);
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
