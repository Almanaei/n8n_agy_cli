const WebSocket = require('ws');

const wsUrl = "ws://localhost:3000/stream";
console.log(`[Simulator] Starting real client simulation scenario...`);
console.log(`[Simulator] Connecting to standalone voice agent at ${wsUrl}...`);

const ws = new WebSocket(wsUrl);

let step = 0;
let conversationId = null;

ws.on('open', () => {
  console.log("[Simulator] Connected successfully! Waiting for agent greeting...\n");
});

ws.on('message', (data) => {
  const payload = JSON.parse(data.toString());
  
  if (payload.conversation_id) {
    conversationId = payload.conversation_id;
    console.log(`[Simulator] Captured conversation ID: ${conversationId}`);
  }

  if (payload.text) {
    console.log(`\x1b[36m[Agent Speech]\x1b[0m: ${payload.text}`);
    if (payload.audio) {
      console.log(`  (Audio: ${Math.round(payload.audio.length / 2)} bytes MP3)`);
    }
    console.log("--------------------------------------------------");
  }

  if (payload.is_final_segment) {
    // Multi-step conversation scenario matching client behavior
    setTimeout(() => {
      switch (step) {
      case 0:
        // Turn 1: User introduces name and phone number
        console.log("\n\x1b[32m[User Speech]\x1b[0m: اسمي محمد علي، ورقمي هو 39485760.");
        ws.send(JSON.stringify({
          event: "user_message",
          text: "اسمي محمد علي، ورقمي هو 39485760."
        }));
        step++;
        break;

      case 1:
        // Turn 2: User asks about gas shop license fees
        console.log("\n\x1b[32m[User Speech]\x1b[0m: أريد معرفة رسوم ترخيص محلات بيع الغاز.");
        ws.send(JSON.stringify({
          event: "user_message",
          text: "أريد معرفة رسوم ترخيص محلات بيع الغاز."
        }));
        step++;
        break;

      case 2:
        // Turn 3: User requests transcript to their email
        console.log("\n\x1b[32m[User Speech]\x1b[0m: شكراً لك. يرجى إرسال نسخة من الحوار إلى بريدي almannaei90 [at] gmail.com");
        ws.send(JSON.stringify({
          event: "user_message",
          text: "شكراً لك. يرجى إرسال نسخة من الحوار إلى بريدي almannaei90 [at] gmail.com"
        }));
        step++;
        break;

      case 3:
        // Turn 4: Simulating user hanging up the call after confirmation
        console.log("\n[Simulator] Client hanging up call...");
        ws.close();
        break;
    }
  }, 2500); // 2.5 seconds pause between turns to mimic natural interaction
  }
});

ws.on('close', async () => {
  console.log("\n[Simulator] Connection closed. Scenario complete.");
  if (conversationId) {
    console.log(`[Simulator] Waiting 4 seconds for n8n to complete lead registration before submitting feedback...`);
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    const feedbackPayload = {
      conversationId: conversationId,
      kpi: "100%",
      comment: "المساعد ممتاز جداً وسريع في الرد، شكراً لكم!"
    };
    
    console.log(`[Simulator] Submitting feedback and comment for ${conversationId}...`);
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
  } else {
    console.warn("[Simulator] No conversation ID captured, skipping feedback submission.");
  }
});

ws.on('error', (err) => {
  console.error("[Simulator] Error:", err);
});
