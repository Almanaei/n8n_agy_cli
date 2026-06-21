const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const agentId = "agent_1601kv6ytcwwfh1sfk46qqhrrq3j";

async function run() {
  console.log("Fetching signed URL from ElevenLabs...");
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`, {
    method: "GET",
    headers: {
      "xi-api-key": apiKey
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to get signed URL:", errorText);
    return;
  }

  const jsonResponse = await response.json();
  console.log("Response JSON:", jsonResponse);
  const url = jsonResponse.signed_url || jsonResponse.url;
  console.log("WebSocket URL acquired:", url);
  if (!url) {
    console.error("No URL found in response!");
    return;
  }
  const ws = new WebSocket(url);

  ws.onopen = () => {
    console.log("Connected to ElevenLabs WebSocket!");

    // Send initiation
    console.log("Sending conversation initiation...");
    ws.send(JSON.stringify({
      type: "conversation_initiation_client_data"
    }));

    // Wait 2 seconds and send the user message with name and phone number
    setTimeout(() => {
      console.log("Sending user message in Arabic (with Name & Phone)...");
      ws.send(JSON.stringify({
        type: "user_message",
        text: "مرحباً، اسمي سالم أحمد وهاتفي هو 0501234567. هل يمكنني التعرف على الخدمات؟"
      }));
    }, 2000);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "audio") {
        return; // Skip logging audio binary stream
      }
      if (data.type === "ping") {
        ws.send(JSON.stringify({
          type: "pong",
          event_id: data.ping_event.event_id
        }));
        return;
      }
      console.log(`[Event Received] Type: ${data.type}`);
      console.log(JSON.stringify(data, null, 2));
    } catch (e) {
      console.log("Failed to parse event:", event.data);
    }
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  ws.onclose = () => {
    console.log("WebSocket connection closed.");
  };

  // Close connection after 20 seconds to finish the test
  setTimeout(() => {
    console.log("Closing connection...");
    ws.close();
  }, 20000);
}

run();
