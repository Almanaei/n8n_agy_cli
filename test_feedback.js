const webhookUrl = "http://localhost:5678/webhook/feedback";

async function sendFeedback(conversationId, kpiValue) {
  const payload = {
    conversationId: conversationId,
    kpi: kpiValue
  };

  console.log(`Sending feedback for ${conversationId} with KPI ${kpiValue}...`);
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log(`Successfully sent feedback! Response:`, await res.json());
    } else {
      console.error(`Failed to send feedback: ${res.status}`, await res.text());
    }
  } catch (err) {
    console.error(`Error sending feedback:`, err);
  }
}

async function run() {
  // Test case 1: Set conversation to 100%
  await sendFeedback("conv_4301kvsq3xnyfg09ynyfwc5pwyrv", "100%");

  // Delay to allow spreadsheet update
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Test case 2: Set conversation to 0%
  await sendFeedback("conv_4001kvspz2fpeg9rsa2cvezm6674", "0%");
}

run();
