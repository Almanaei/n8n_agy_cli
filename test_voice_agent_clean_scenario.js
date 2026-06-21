const WebSocket = require('ws');

const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const agentId = "agent_1601kv6ytcwwfh1sfk46qqhrrq3j";

async function run() {
  console.log("[Test] Fetching signed URL from ElevenLabs...");
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`, {
    method: "GET",
    headers: {
      "xi-api-key": apiKey
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Test] Failed to get signed URL:", errorText);
    return;
  }

  const jsonResponse = await response.json();
  const url = jsonResponse.signed_url || jsonResponse.url;
  console.log("[Test] WebSocket URL acquired:", url);
  
  const ws = new WebSocket(url);
  let step = 0;
  let responseTimeout = null;

  function sendUserMessage(text) {
    console.log(`\n\x1b[32m[User Speech]\x1b[0m: ${text}`);
    ws.send(JSON.stringify({
      type: "user_message",
      text: text
    }));
  }

  function handleAgentSpeechFinished() {
    // Agent finished current response turn. Send the next step.
    console.log(`[Turn Control] Agent finished speaking. Scheduling next turn in 3 seconds...`);
    setTimeout(() => {
      switch (step) {
        case 0:
          sendUserMessage("اسمي سالم أحمد ورقم هاتفي هو 39485760.");
          step++;
          break;
        case 1:
          sendUserMessage("كم رسوم ترخيص محلات الذهب؟");
          step++;
          break;
        case 2:
          sendUserMessage("أريد نسخة من المحادثة على إيميلي.");
          step++;
          break;
        case 3:
          sendUserMessage("almannaei90 [at] outlook.com");
          step++;
          break;
        case 4:
          console.log("\n[Test] Hanging up call in 5 seconds...");
          setTimeout(() => {
            console.log("[Test] Closing WebSocket connection...");
            ws.close();
          }, 5000);
          break;
      }
    }, 3000);
  }

  ws.on('open', () => {
    console.log("[Test] Connected to ElevenLabs WebSocket!");
    console.log("[Test] Sending conversation initiation...");
    ws.send(JSON.stringify({
      type: "conversation_initiation_client_data"
    }));
  });

  ws.on('message', (rawData) => {
    try {
      const data = JSON.parse(rawData.toString());
      if (data.type === "audio") {
        return; // Skip audio stream
      }
      if (data.type === "ping") {
        ws.send(JSON.stringify({
          type: "pong",
          event_id: data.ping_event.event_id
        }));
        return;
      }
      
      console.log(`\n\x1b[34m[Event Received]\x1b[0m: ${data.type}`);
      
      if (data.type === "agent_response") {
        const text = data.agent_response_event?.agent_response;
        if (text) {
          console.log(`\x1b[36m[Agent Speech]\x1b[0m: ${text}`);
          
          // Debounce the finish trigger: wait for 3.5 seconds of silence from agent response events
          if (responseTimeout) clearTimeout(responseTimeout);
          responseTimeout = setTimeout(() => {
            handleAgentSpeechFinished();
          }, 3500);
        }
      } else if (data.type === "user_transcript") {
        console.log(`[User Transcript]: ${data.user_transcription_details?.transcription}`);
      } else if (data.type === "agent_tool_response") {
        console.log(`[Agent Tool Response]:`, JSON.stringify(data.agent_tool_response, null, 2));
      } else if (data.type === "interruption") {
        console.log(`\x1b[31m[Interruption Event]\x1b[0m: Agent was interrupted!`);
      } else {
        console.log(JSON.stringify(data, null, 2));
      }
    } catch (e) {
      console.log("Failed to parse event:", rawData.toString());
    }
  });

  ws.on('error', (error) => {
    console.error("WebSocket error:", error);
  });

  ws.on('close', () => {
    console.log("WebSocket connection closed.");
  });
}

run();
