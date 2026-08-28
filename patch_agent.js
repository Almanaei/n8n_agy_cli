const fs = require('fs');
const path = require('path');

// Load environment variables from .env
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(__dirname, '.env') });
} catch (e) {
  console.error("Error loading .env file:", e);
}

const apiKey = process.env.ELEVENLABS_API_KEY || "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const agentId = process.env.ELEVENLABS_AGENT_ID || "agent_1601kv6ytcwwfh1sfk46qqhrrq3j";
const url = `https://api.elevenlabs.io/v1/convai/agents/${agentId}`;

const { systemPrompt } = require('./system_prompt');

async function patchAgent() {
  console.log("Fetching active workspace tools from ElevenLabs...");
  try {
    const listToolsRes = await fetch("https://api.elevenlabs.io/v1/convai/tools", {
      headers: { "xi-api-key": apiKey }
    });
    if (!listToolsRes.ok) {
      throw new Error(`Failed to list tools: ${listToolsRes.status}`);
    }
    const { tools } = await listToolsRes.json();
    
    const saveLeadTool = tools.find(t => t.tool_config?.name === "save_lead_info");
    const triggerAppTool = tools.find(t => t.tool_config?.name === "trigger_service_application");
    let lookupAppTool = tools.find(t => t.tool_config?.name === "lookup_application_status");
    if (!lookupAppTool) {
      console.log("Creating missing client tool lookup_application_status on ElevenLabs...");
      const createLookupToolRes = await fetch("https://api.elevenlabs.io/v1/convai/tools", {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tool_config: {
            type: "client",
            name: "lookup_application_status",
            description: "Call this tool when a user or caller asks for their application status, tracking status, or provides their phone number or application ID to check their active request.",
            expects_response: true,
            parameters: {
              type: "object",
              properties: {
                phone: {
                  type: "string",
                  description: "The caller's phone number or mobile number."
                },
                appId: {
                  type: "string",
                  description: "The application reference ID if provided by the caller (optional)."
                }
              }
            }
          }
        })
      });
      if (createLookupToolRes.ok) {
        const lookupToolData = await createLookupToolRes.json();
        const createdId = lookupToolData.id || lookupToolData.tool_id;
        console.log(`Created lookup_application_status successfully: ${createdId}`);
        lookupAppTool = { id: createdId };
      } else {
        console.error("Failed to create lookup_application_status tool:", await createLookupToolRes.text());
      }
    }
    
    let sendLinkTool = tools.find(t => t.tool_config?.name === "send_tracking_link_whatsapp");
    if (!sendLinkTool) {
      console.log("Creating missing client tool send_tracking_link_whatsapp on ElevenLabs...");
      const createSendToolRes = await fetch("https://api.elevenlabs.io/v1/convai/tools", {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tool_config: {
            type: "client",
            name: "send_tracking_link_whatsapp",
            description: "Call this tool to send a WhatsApp text message containing the direct tracking link to the caller's phone when requested or agreed during the voice call.",
            expects_response: true,
            parameters: {
              type: "object",
              properties: {
                phone: {
                  type: "string",
                  description: "The caller's phone number or mobile number."
                },
                appId: {
                  type: "string",
                  description: "The application ID (e.g. APP-20260823-3C19)."
                }
              }
            }
          }
        })
      });
      if (createSendToolRes.ok) {
        const toolData = await createSendToolRes.json();
        const createdId = toolData.id || toolData.tool_id;
        console.log(`Created send_tracking_link_whatsapp successfully: ${createdId}`);
        sendLinkTool = { id: createdId };
      } else {
        console.error("Failed to create send_tracking_link_whatsapp tool:", await createSendToolRes.text());
      }
    }
    
    const toolIds = [];
    if (saveLeadTool) {
      toolIds.push(saveLeadTool.id);
      console.log(`Found save_lead_info ID: ${saveLeadTool.id}`);
    }
    if (triggerAppTool) {
      toolIds.push(triggerAppTool.id);
      console.log(`Found trigger_service_application ID: ${triggerAppTool.id}`);
    }
    if (lookupAppTool) {
      toolIds.push(lookupAppTool.id);
      console.log(`Found lookup_application_status ID: ${lookupAppTool.id}`);
    }
    if (sendLinkTool) {
      toolIds.push(sendLinkTool.id);
      console.log(`Found send_tracking_link_whatsapp ID: ${sendLinkTool.id}`);
    }

    const patchConfig = {
      conversation_config: {
        agent: {
          prompt: {
            prompt: systemPrompt,
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
          turn_timeout: 2,
          silence_end_call_timeout: 30,
          turn_eagerness: "eager"
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
      }
    };

    console.log("Updating agent with prompt and workspace tool associations...");
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(patchConfig)
    });

    const result = await response.json();
    if (response.ok) {
      console.log("Agent successfully updated! 🎉");
    } else {
      console.error("Failed to update agent:", result);
    }
  } catch (error) {
    console.error("Request error:", error);
  }
}

patchAgent();
