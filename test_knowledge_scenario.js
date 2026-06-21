const WebSocket = require('ws');

const wsUrl = "ws://localhost:3000/stream";
console.log(`[Simulator] Starting knowledge base integration simulation...`);

const ws = new WebSocket(wsUrl);
let step = 0;

ws.on('open', () => {
  console.log("[Simulator] Connected! Waiting for greeting...\n");
});

ws.on('message', (data) => {
  const payload = JSON.parse(data.toString());
  if (payload.text) {
    console.log(`\x1b[36m[Agent Speech]\x1b[0m: ${payload.text}`);
    console.log("--------------------------------------------------");
  }

  if (payload.is_final_segment) {
    setTimeout(() => {
      switch (step) {
      case 0:
        // Turn 1: Enter pre-flight data to trigger mock or LLM state
        console.log("\n\x1b[32m[User Speech]\x1b[0m: اسمي خالد، ورقمي هو 9733444555.");
        ws.send(JSON.stringify({
          event: "user_message",
          text: "اسمي خالد، ورقمي هو 9733444555."
        }));
        step++;
        break;

      case 1:
        // Turn 2: Query personal.txt (who created the system?)
        console.log("\n\x1b[32m[User Speech]\x1b[0m: من الذي أنشأ وصمم هذا النظام؟");
        ws.send(JSON.stringify({
          event: "user_message",
          text: "من الذي أنشأ وصمم هذا النظام؟"
        }));
        step++;
        break;

      case 2:
        // Turn 3: Query personal.txt (who is the Director General?)
        console.log("\n\x1b[32m[User Speech]\x1b[0m: من هو مدير الإدارة العامة للدفاع المدني؟");
        ws.send(JSON.stringify({
          event: "user_message",
          text: "من هو مدير الإدارة العامة للدفاع المدني؟"
        }));
        step++;
        break;

      case 3:
        // Turn 4: Query services.txt (fees for gold shops)
        console.log("\n\x1b[32m[User Speech]\x1b[0m: كم رسوم ترخيص محلات الذهب؟");
        ws.send(JSON.stringify({
          event: "user_message",
          text: "كم رسوم ترخيص محلات الذهب؟"
        }));
        step++;
        break;

      case 4:
        // Turn 5: Query services.txt (documents for training centres)
        console.log("\n\x1b[32m[User Speech]\x1b[0m: ما هي المستندات المطلوبة لمعاهد التدريب؟");
        ws.send(JSON.stringify({
          event: "user_message",
          text: "ما هي المستندات المطلوبة لمعاهد التدريب؟"
        }));
        step++;
        break;

      case 5:
        // Turn 6: Hang up
        console.log("\n[Simulator] Hanging up call...");
        ws.close();
        break;
    }
  }, 2500);
  }
});

ws.on('close', () => {
  console.log("\n[Simulator] Connection closed. Knowledge base scenario complete.");
});

ws.on('error', (err) => {
  console.error("[Simulator] Error:", err);
});
