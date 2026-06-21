const url = "http://localhost:5678/webhook/leads";

const payload = {
  tool_call_id: "call_test123",
  tool_name: "save_lead_info",
  parameters: {
    clientName: "Salem Ahmed",
    phoneNumber: "+971501234567"
  },
  conversation_id: "conv_test456"
};

async function test() {
  console.log("Triggering Webhook at http://localhost:5678/webhook/leads ...");
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log("Response status:", response.status);
    console.log("Response body:", result);
  } catch (error) {
    console.error("Test request failed:", error);
  }
}

test();
