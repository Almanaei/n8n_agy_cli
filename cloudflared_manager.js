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

const apiKey = process.env.ELEVENLABS_API_KEY || "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const agentId = process.env.ELEVENLABS_AGENT_ID || "agent_1601kv6ytcwwfh1sfk46qqhrrq3j";
const webhookId = process.env.ELEVENLABS_WEBHOOK_ID || "b78ba4ce83d64a8ca92dafb87447b48b";

const { systemPrompt } = require('./system_prompt');

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
          required: [],
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

  let activeClientToolId = null;
  const clientToolPayload = {
    tool_config: {
      type: "client",
      name: "trigger_service_application",
      description: "Call this tool to open the service application form on the user's browser screen. Use this when the user wants to apply for a service, submit an application, or when they ask to register or renew a permit/certificate.",
      api_schema: {
        type: "object",
        properties: {
          serviceName: {
            type: "string",
            description: "The name of the service they want to apply for. Must be the exact Arabic or English service name or keywords from the knowledge base files services.txt through services_7.txt."
          },
          referenceNumber: {
            type: "string",
            description: "Any reference number the user mentions, like CR number or NC number (optional)."
          }
        }
      }
    }
  };

  let toolsList = [];
  try {
    const listToolsRes = await fetch("https://api.elevenlabs.io/v1/convai/tools", {
      headers: { "xi-api-key": apiKey }
    });
    if (!listToolsRes.ok) {
      throw new Error(`Failed to list tools: ${listToolsRes.status} ${await listToolsRes.text()}`);
    }
    const { tools } = await listToolsRes.json();
    toolsList = tools || [];
    
    // 2a. Find all tools named save_lead_info
    const targetTools = toolsList.filter(t => t.tool_config?.name === "save_lead_info");
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
        await fetch(`https://api.elevenlabs.io/v1/convai/tools/${dupId}`, {
          method: "DELETE",
          headers: { "xi-api-key": apiKey }
        });
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

    // 2b. Find all tools named trigger_service_application
    const clientTools = toolsList.filter(t => t.tool_config?.name === "trigger_service_application");
    if (clientTools.length > 0) {
      activeClientToolId = clientTools[0].id;
      console.log(`[ElevenLabs] Updating existing workspace client tool ${activeClientToolId}...`);
      const updateClientRes = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${activeClientToolId}`, {
        method: "PATCH",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(clientToolPayload)
      });
      if (updateClientRes.ok) {
        console.log(`[ElevenLabs] Client tool ${activeClientToolId} successfully updated! 🎉`);
      } else {
        console.error(`[ElevenLabs] Failed to update client tool ${activeClientToolId}:`, await updateClientRes.text());
      }
      
      // Delete any duplicates
      for (let i = 1; i < clientTools.length; i++) {
        const dupId = clientTools[i].id;
        console.log(`[ElevenLabs] Deleting duplicate client tool: ${dupId}`);
        await fetch(`https://api.elevenlabs.io/v1/convai/tools/${dupId}`, {
          method: "DELETE",
          headers: { "xi-api-key": apiKey }
        });
      }
    } else {
      console.log("[ElevenLabs] Creating new workspace client tool trigger_service_application...");
      const createClientRes = await fetch("https://api.elevenlabs.io/v1/convai/tools", {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(clientToolPayload)
      });
      if (!createClientRes.ok) {
        throw new Error(`Failed to create client tool: ${createClientRes.status} ${await createClientRes.text()}`);
      }
      const createClientData = await createClientRes.json();
      activeClientToolId = createClientData.tool_id;
      console.log(`[ElevenLabs] Created client tool successfully: ${activeClientToolId}`);
    }

  } catch (err) {
    console.error("[ElevenLabs] Error managing workspace tools:", err);
    return;
  }

  // Collect all active tool IDs
  const lookupTool = toolsList.find(t => t.tool_config?.name === "lookup_application_status");
  const sendLinkTool = toolsList.find(t => t.tool_config?.name === "send_tracking_link_whatsapp");
  const toolIds = [activeToolId, activeClientToolId];
  if (lookupTool) toolIds.push(lookupTool.id);
  if (sendLinkTool) toolIds.push(sendLinkTool.id);

  // 3. Patch Agent Config (including conversation_config and platform_settings.workspace_overrides)
  const agentPayload = {
    conversation_config: {
      agent: {
        prompt: {
          prompt: systemPrompt,
          llm: process.env.LLM_MODEL || "gpt-4o-mini",
          tool_ids: toolIds,
          built_in_tools: {
            end_call: {
              name: "end_call"
            }
          }
        },
        first_message: "مرحبا بكم في مركز خدمات الدفاع المدني الذكي. يرجى تزويدي بالإسم ورقم الهاتف للبدء."
      },
      turn: {
        turn_timeout: 10,
        silence_end_call_timeout: -1,
        turn_eagerness: "patient",
        soft_timeout_config: {
          timeout_seconds: -1
        }
      },
      tts: {
        text_normalisation_type: "elevenlabs",
        optimize_streaming_latency: 4
      },
      language_presets: {
        en: {
          overrides: {
            agent: {
              language: "en",
              first_message: "Welcome to the Civil Defense services. Please provide your name and phone number to begin."
            }
          }
        }
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
    '--url', 'http://localhost:3000'
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
