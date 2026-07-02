const WebSocket = require('ws');

async function run() {
  console.log("[Simulator] Fetching signed URL from Express server...");
  let signedUrl;
  try {
    const res = await fetch("http://localhost:3000/get-signed-url");
    if (!res.ok) {
      throw new Error(`Failed to fetch signed URL: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    signedUrl = data.signed_url || data.url;
  } catch (err) {
    console.error("[Simulator] Error getting signed URL:", err);
    return;
  }

  console.log("[Simulator] Connected to ElevenLabs WebSocket at URL:", signedUrl);
  const ws = new WebSocket(signedUrl);

  let conversationId = null;

  ws.on('open', () => {
    console.log("[Simulator] Connected successfully! Sending initiation...");
    ws.send(JSON.stringify({
      type: "conversation_initiation_client_data"
    }));

    // Start conversational timeline
    runConversationalTimeline(ws);
  });

  ws.on('message', (eventData) => {
    try {
      const data = JSON.parse(eventData.toString());
      if (data.type === "audio") return;
      if (data.type === "ping") {
        ws.send(JSON.stringify({
          type: "pong",
          event_id: data.ping_event.event_id
        }));
        return;
      }

      console.log(`\n\x1b[35m[ElevenLabs Event]\x1b[0m Type: ${data.type}`);
      if (data.type === "conversation_initiation_metadata") {
        conversationId = data.conversation_initiation_metadata_event.conversation_id;
        console.log(`\x1b[32m[Captured Conversation ID]\x1b[0m: ${conversationId}`);
      }

      if (data.type === "agent_response") {
        console.log(`\x1b[36m[Agent Response Segment]\x1b[0m: ${data.agent_response_event.agent_response}`);
      }
    } catch (e) {
      console.log("Failed to parse event:", eventData.toString());
    }
  });

  ws.on('close', async () => {
    console.log("\n[Simulator] WebSocket connection closed.");
    if (conversationId) {
      console.log(`[Simulator] Waiting 8 seconds for evaluation to compile...`);
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      const feedbackPayload = {
        conversationId: conversationId,
        kpi: "100%",
        comment: "المساعد كان مذهلاً، فهم اللهجة البحرينية والبيانات الناقصة بذكاء!"
      };
      
      console.log(`[Simulator] Submitting feedback for ${conversationId}...`);
      try {
        const response = await fetch("http://localhost:3000/submit-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(feedbackPayload)
        });
        if (response.ok) {
          console.log(`[Simulator] Successfully submitted feedback! Response:`, await response.json());
        } else {
          console.error(`[Simulator] Failed to submit feedback: ${response.status}`, await response.text());
        }
      } catch (err) {
        console.error(`[Simulator] Error submitting feedback:`, err);
      }
    }
  });

  ws.on('error', (err) => {
    console.error("[Simulator] WebSocket error:", err);
  });
}

function runConversationalTimeline(ws) {
  // Step 1: User introduces name only ( هلا، اسمي محمد علي )
  setTimeout(() => {
    console.log("\n\x1b[32m[User Speech]\x1b[0m: هلا، اسمي محمد علي.");
    ws.send(JSON.stringify({
      type: "user_message",
      text: "هلا، اسمي محمد علي."
    }));
  }, 4000);

  // Step 2: User provides mobile number ( رقمي هو 39485760 )
  setTimeout(() => {
    console.log("\n\x1b[32m[User Speech]\x1b[0m: رقمي هو 39485760.");
    ws.send(JSON.stringify({
      type: "user_message",
      text: "رقمي هو 39485760."
    }));
  }, 10000);

  // Step 3: User asks about license fees in Bahraini dialect with missing keywords ( أبي أعرف رخصة الغاز جم رسومها؟ )
  setTimeout(() => {
    console.log("\n\x1b[32m[User Speech]\x1b[0m: أبي أعرف رخصة الغاز جم رسومها؟");
    ws.send(JSON.stringify({
      type: "user_message",
      text: "أبي أعرف رخصة الغاز جم رسومها؟"
    }));
  }, 18000);

  // Step 4: User asks for transcript email ( طرش لي المحادثة على الإيميل )
  setTimeout(() => {
    console.log("\n\x1b[32m[User Speech]\x1b[0m: طرش لي المحادثة على الإيميل.");
    ws.send(JSON.stringify({
      type: "user_message",
      text: "طرش لي المحادثة على الإيميل."
    }));
  }, 26000);

  // Step 5: User types email ( almannaei90 [at] gmail.com )
  setTimeout(() => {
    console.log("\n\x1b[32m[User Speech]\x1b[0m: almannaei90 [at] gmail.com");
    ws.send(JSON.stringify({
      type: "user_message",
      text: "almannaei90 [at] gmail.com"
    }));
  }, 33000);

  // Step 6: Hang up call
  setTimeout(() => {
    console.log("\n[Simulator] Client hanging up call...");
    ws.close();
  }, 39000);
}

run();
