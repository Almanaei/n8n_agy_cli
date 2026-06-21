const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const url = "https://api.elevenlabs.io/v1/convai/agents/create";

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
   - Once they type and send it, parse the email address and trigger the 'save_lead_info' tool, passing the 'clientEmail' parameter.
   - Confirm to the client: "تم حفظ بريدك الإلكتروني بنجاح، وسنقوم بإرسال نسخة من المحادثة فور انتهاء المكالمة."
5. Silence & Turn-Taking:
   - If the user stops talking, do NOT repeatedly prompt them, ask if they are still there, or say anything like "هل أنت معي؟" or "هل أنت هنا؟". Simply wait patiently and silently for them to continue speaking or typing.`;

const agentConfig = {
  name: "Lead Collection Agent (Arabic)",
  conversation_config: {
    agent: {
      prompt: {
        prompt: systemPrompt,
        tools: [
          {
            type: "webhook",
            name: "save_lead_info",
            description: "Call this tool to save the client's name and phone number once they are provided. This must be done BEFORE providing any service details.",
            api_schema: {
              url: "http://localhost:5678/webhook/leads",
              method: "POST",
              request_headers: {
                "Content-Type": "application/json"
              },
              request_body_schema: {
                type: "object",
                properties: {
                  clientName: {
                    type: "string",
                    description: "The client's full name."
                  },
                  phoneNumber: {
                    type: "string",
                    description: "The client's phone number."
                  }
                },
                required: ["clientName", "phoneNumber"]
              }
            }
          }
        ]
      },
      first_message: "مرحبا بك في مركز خدمات الإدارة العامة للدفاع المدني .. يرجى تزويدي بالإسم ورقم الهاتف",
      language: "ar"
    },
    turn: {
      turn_timeout: 15
    },
    tts: {
      model_id: "eleven_flash_v2_5",
      voice_id: "ecHLtp9QBEUwFiyTlzUb"
    }
  }
};

async function createAgent() {
  console.log("Creating ElevenLabs Conversational Voice Agent...");
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(agentConfig)
    });

    const result = await response.json();
    if (response.ok) {
      console.log("Agent successfully created! 🎉");
      console.log("Agent ID:", result.agent_id);
      console.log("You can view and manage it in your ElevenLabs dashboard.");
    } else {
      console.error("Failed to create agent:", result);
    }
  } catch (error) {
    console.error("Request error:", error);
  }
}

createAgent();
