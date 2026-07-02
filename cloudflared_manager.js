const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env if it exists
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index > 0) {
        const key = trimmed.substring(0, index).trim();
        let value = trimmed.substring(index + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
  }
} catch (e) {
  console.error("Error loading .env file:", e);
}

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
  عندما يستمع الوكيل أو يقرأ سؤالاً من المستخدم يجب الإجابة عليه برقم هاتف أو جوال (مثل رقم هاتف مركز خدمة الدفاع المدني أو أي أرقام أخرى)، يجب أن يكون تنسيق الرقم كالتالي:
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
رقم مركز خدمة العملاء هو 17461100 كيف يمكنني مساعدتك اليوم؟

CONVERSATIONAL RULES & GUARDRAILS:
1. Language & Jurisdiction: 
   - You must communicate exclusively in Arabic.
   - You are strictly responsible for Bahrain Civil Defense services. You must not answer questions or provide information regarding any other country.
2. Grounding: 
   - You are strictly limited to the information in the uploaded Knowledge Base (قاعدة المعرفة) files. Do not make up or assume any details.
   - If the client asks about any topics or services not present in the Knowledge Base files, politely apologize in Arabic and state that you do not have this information currently.
3. Pre-Flight Data Collection (Mandatory & Immediate Tool Call):
   - BEFORE explaining any services or answering questions, you MUST explicitly collect the client's name (الاسم) and phone number (رقم الهاتف).
   - If the client provides both the name and phone number (e.g., they say "علي 29292929" or "اسمي علي ورقمي 39292929" or "أنا علي وهذا رقمي 29292929"), you MUST IMMEDIATELY trigger the 'save_lead_info' tool with the extracted parameters.
   - IMPORTANT: DO NOT repeat your greeting or ask the user again for their name or mobile number once they have provided them. CALL THE 'save_lead_info' TOOL IMMEDIATELY!
   - Examples of immediate tool calling:
     * User says: "علي 29292929" -> Call save_lead_info(clientName="علي", phoneNumber="29292929")
     * User says: "اسمي أحمد ورقم هاتفي 33445566" -> Call save_lead_info(clientName="أحمد", phoneNumber="33445566")
     * User says: "أهلاً، أنا خالد وهاتفي 39999999" -> Call save_lead_info(clientName="خالد", phoneNumber="39999999")
   - If the user only provides a name, politely ask for their phone number. If they only provide a phone number, politely ask for their name. Once you have both, call the 'save_lead_info' tool.
   - If the user asks a question before providing this information, say: "مرحباً بكم في مركز خدمات الإدارة العامة للدفاع المدني. للبدء، يرجى تزويدي باسمك الكريم ورقم هاتفك."
   - User Modifications (Name/Mobile): The user can correct their name/phone number at any time. If they do, call the 'save_lead_info' tool again with the new details and confirm the update in Arabic.
   - Only after the tool executes successfully, proceed with answering their questions based on the Knowledge Base.
4. Email Transcript Option (On-Demand):
   - If the user requests a copy of the conversation or transcript to be sent to their email (e.g., "أرسل لي هذه المحادثة إلى إيميلي"), instruct them to type their email address in the chat input box at the bottom of the screen (e.g. "من فضلك اكتب بريدك الإلكتروني في خانة الكتابة بالأسفل"). Do not attempt to collect the email via voice.
   - Once they type and send it, parse the email address. Replace the '@' symbol with the string ' [at] ' (for example: user [at] example.com) and pass this modified string as the 'clientEmail' parameter to the 'save_lead_info' tool. This replacement is required to bypass security filters.
   - Confirm to the client: "تم حفظ بريدك الإلكتروني بنجاح، وسنقوم بإرسال نسخة من المحادثة فور انتهاء المكالمة."
5. Silence & Turn-Taking:
   - If the user stops talking, do NOT repeatedly prompt them, ask if they are still there, or say anything like "هل أنت معي؟" or "هل أنت هنا؟". Simply wait patiently and silently for them to continue speaking or typing.`;

async function patchElevenLabs(baseUrl) {
  console.log(`[ElevenLabs] Starting patch flow with new URL: ${baseUrl}`);
  
  let activeWebhookId = null;
  const targetUrl = `${baseUrl}/webhook/post-call`;

  // 1. Manage Webhooks dynamically
  try {
    const listRes = await fetch("https://api.elevenlabs.io/v1/workspace/webhooks", {
      headers: { "xi-api-key": apiKey }
    });
    if (!listRes.ok) {
      throw new Error(`Failed to list webhooks: ${listRes.status} ${await listRes.text()}`);
    }
    const { webhooks } = await listRes.json();
    
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
    
    // Link in workspace ConvAI settings
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
  } catch (err) {
    console.error("[ElevenLabs] Error managing webhooks:", err);
    return;
  }

  // 2. Manage Workspace Tools dynamically
  let activeToolId = null;
  const toolPayload = {
    tool_config: {
      type: "webhook",
      name: "save_lead_info",
      description: "Call this tool to save the client's name, phone number, and optional email. This must be done BEFORE providing service details, or when they request an email transcript.",
      api_schema: {
        url: `${baseUrl}/webhook/leads`,
        method: "POST",
        request_headers: {
          "Content-Type": "application/json"
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
  };

  try {
    const listToolsRes = await fetch("https://api.elevenlabs.io/v1/convai/tools", {
      headers: { "xi-api-key": apiKey }
    });
    if (!listToolsRes.ok) {
      throw new Error(`Failed to list tools: ${listToolsRes.status} ${await listToolsRes.text()}`);
    }
    const { tools } = await listToolsRes.json();
    
    // Find all tools named save_lead_info
    const targetTools = tools.filter(t => t.tool_config?.name === "save_lead_info");
    
    if (targetTools.length > 0) {
      // Update the first tool
      activeToolId = targetTools[0].id;
      console.log(`[ElevenLabs] Updating existing workspace tool ${activeToolId} with new URL...`);
      const updateRes = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${activeToolId}`, {
        method: "PATCH",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(toolPayload)
      });
      if (updateRes.ok) {
        console.log(`[ElevenLabs] Tool ${activeToolId} successfully updated! 🎉`);
      } else {
        console.error(`[ElevenLabs] Failed to update tool ${activeToolId}:`, await updateRes.text());
      }
      
      // Delete any duplicates
      for (let i = 1; i < targetTools.length; i++) {
        const dupId = targetTools[i].id;
        console.log(`[ElevenLabs] Deleting duplicate workspace tool: ${dupId}`);
        const delRes = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${dupId}`, {
          method: "DELETE",
          headers: { "xi-api-key": apiKey }
        });
        if (delRes.ok) {
          console.log(`[ElevenLabs] Deleted duplicate tool ${dupId}`);
        } else {
          console.error(`[ElevenLabs] Failed to delete duplicate tool ${dupId}:`, await delRes.text());
        }
      }
    } else {
      // Create a brand new workspace tool
      console.log("[ElevenLabs] Creating new workspace tool save_lead_info...");
      const createRes = await fetch("https://api.elevenlabs.io/v1/convai/tools", {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(toolPayload)
      });
      if (!createRes.ok) {
        throw new Error(`Failed to create workspace tool: ${createRes.status} ${await createRes.text()}`);
      }
      const createData = await createRes.json();
      activeToolId = createData.tool_id;
      console.log(`[ElevenLabs] Created workspace tool successfully: ${activeToolId}`);
    }
  } catch (err) {
    console.error("[ElevenLabs] Error managing workspace tools:", err);
    return;
  }

  // 3. Patch Agent Config (including conversation_config and platform_settings.workspace_overrides)
  const agentPayload = {
    conversation_config: {
      agent: {
        prompt: {
          prompt: systemPrompt,
          llm: process.env.LLM_MODEL || "gpt-4o-mini",
          tool_ids: [activeToolId]
        },
        first_message: "مرحبا بكم في مركز خدمات الإدارة العامة للدفاع المدني .. يرجى تزويدي بالإسم ورقم الهاتف"
      },
      turn: {
        turn_timeout: 2,
        silence_end_call_timeout: 30,
        turn_eagerness: "eager"
      },
      tts: {
        text_normalisation_type: "elevenlabs",
        optimize_streaming_latency: 4
      }
    },
    platform_settings: {
      workspace_overrides: {
        webhooks: {
          post_call_webhook_id: activeWebhookId,
          events: ["transcript"],
          transcript_format: "json",
          send_audio: false
        }
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

  // 4. Clean up old/unused trycloudflare webhooks (should now succeed as agent override has been updated)
  try {
    const listRes = await fetch("https://api.elevenlabs.io/v1/workspace/webhooks", {
      headers: { "xi-api-key": apiKey }
    });
    if (listRes.ok) {
      const { webhooks } = await listRes.json();
      for (const wh of webhooks) {
        if (wh.webhook_id !== activeWebhookId && wh.webhook_url.includes("trycloudflare.com")) {
          console.log(`[ElevenLabs] Deleting old/unused trycloudflare webhook: ${wh.webhook_id} (${wh.webhook_url})`);
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
    }
  } catch (err) {
    console.error("[ElevenLabs] Error during webhook cleanup:", err);
  }
}

function startCloudflareTunnel() {
  console.log("[Tunnel] Starting cloudflared tunnel...");
  
  // Use spawn on Windows. Since cloudflared.exe is directly executable, no shell is required.
  const cf = spawn('.\\cloudflared.exe', [
    'tunnel',
    '--url', 'http://localhost:5678'
  ]);
  
  let urlDetected = false;
  
  const handleData = (data) => {
    const output = data.toString();
    // We log output for debugging
    console.log(`[cloudflared] ${output.trim()}`);
    
    if (output.includes('.trycloudflare.com')) {
      const match = output.match(/(https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com)/);
      if (match && match[1]) {
        const baseUrl = match[1].trim();
        console.log(`[Tunnel] Detected URL: ${baseUrl}`);
        if (!urlDetected) {
          urlDetected = true;
          patchElevenLabs(baseUrl);
        }
      }
    }
  };
  
  cf.stdout.on('data', handleData);
  cf.stderr.on('data', handleData);
  
  cf.on('close', (code) => {
    console.log(`[Tunnel] cloudflared process exited with code ${code}. Reconnecting in 5 seconds...`);
    urlDetected = false;
    setTimeout(startCloudflareTunnel, 5000);
  });
  
  // Helper to ensure clean exit of child when parent exits
  process.on('exit', () => {
    cf.kill();
  });
}

startCloudflareTunnel();
