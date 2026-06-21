const WebSocket = require('ws');

const wsUrl = "ws://localhost:8000/stream";
console.log(`Connecting to standalone voice agent at ${wsUrl}...`);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log("Connected successfully to WebSocket!");
});

ws.on('message', (data) => {
  const payload = JSON.parse(data.toString());
  console.log("\n--- Received Event ---");
  console.log("Event:", payload.event);
  console.log("Text:", payload.text);
  if (payload.conversation_id) {
    console.log("Conversation ID:", payload.conversation_id);
  }
  if (payload.audio) {
    console.log(`Audio size: ${Math.round(payload.audio.length / 2)} bytes (MP3 Hex)`);
  }
  
  // Script flow logic
  if (payload.text.includes("مرحبا بك")) {
    // Stage 1: Send client name and phone number
    setTimeout(() => {
      console.log("\nSending User Message: 'اسمي سالم، رقمي 35555563.'");
      ws.send(JSON.stringify({
        event: "user_message",
        text: "اسمي سالم، رقمي 35555563."
      }));
    }, 2000);
  } else if (payload.text.includes("تسجيل بياناتك") || payload.text.includes("كيف يمكنني مساعدتك")) {
    // Stage 2: Send email address
    setTimeout(() => {
      console.log("\nSending User Message: 'almannaei90 [at] gmail.com'");
      ws.send(JSON.stringify({
        event: "user_message",
        text: "almannaei90 [at] gmail.com"
      }));
    }, 2000);
  } else if (payload.text.includes("حفظ بريدك")) {
    // Stage 3: Hang up call (WebSocket close)
    setTimeout(() => {
      console.log("\nClosing connection to simulate hangup...");
      ws.close();
    }, 2000);
  }
});

ws.on('close', () => {
  console.log("\nWebSocket connection closed.");
});

ws.on('error', (err) => {
  console.error("WebSocket Error:", err);
});
