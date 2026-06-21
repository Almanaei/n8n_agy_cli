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
  let timer = null;

  function nextTurn(delay) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      switch (step) {
        case 0:
          console.log("\n\x1b[32m[User Speech]\x1b[0m: اسمي سالم أحمد ورقم هاتفي هو 39485760.");
          ws.send(JSON.stringify({
            type: "user_message",
            text: "اسمي سالم أحمد ورقم هاتفي هو 39485760."
          }));
          step++;
          break;

        case 1:
          console.log("\n\x1b[32m[User Speech]\x1b[0m: كم رسوم ترخيص محلات الذهب؟");
          ws.send(JSON.stringify({
            type: "user_message",
            text: "كم رسوم ترخيص محلات الذهب؟"
          }));
          step++;
          break;

        case 2:
          console.log("\n\x1b[32m[User Speech]\x1b[0m: أريد نسخة من المحادثة على إيميلي.");
          ws.send(JSON.stringify({
            type: "user_message",
            text: "أريد نسخة من المحادثة على إيميلي."
          }));
          step++;
          break;

        case 3:
          console.log("\n\x1b[32m[User Speech]\x1b[0m: almannaei90 [at] gmail.com");
          ws.send(JSON.stringify({
            type: "user_message",
            text: "almannaei90 [at] gmail.com"
          }));
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
    }, delay);
  }

  ws.on('open', () => {
    console.log("[Test] Connected to ElevenLabs WebSocket!");
    
    console.log("[Test] Sending conversation initiation...");
    ws.send(JSON.stringify({
      type: "conversation_initiation_client_data"
    }));

    // Wait 3 seconds to let agent greet, then start turns
    nextTurn(4000);
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
          // Proceed to next turn after agent finishes speaking
          nextTurn(3000);
        }
      } else if (data.type === "user_transcript") {
        console.log(`[User Transcript]: ${data.user_transcription_details?.transcription}`);
      } else if (data.type === "client_tool_call") {
        console.log(`[Client Tool Call]:`, JSON.stringify(data.client_tool_call, null, 2));
      } else {
        // Log other interesting event details (like tool calls/results)
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
