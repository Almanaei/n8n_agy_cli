async function testSubmitFeedback() {
  const payload = {
    conversationId: "conv_test_mock_50",
    kpi: "50%",
    comment: "الخدمة كانت مقبولة ولكن أرجو تحسين سرعة الاستجابة"
  };

  console.log("Sending test feedback payload to local Express server...");
  try {
    const res = await fetch("http://localhost:3000/submit-feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log("Successfully hit the endpoint! Response:", await res.json());
    } else {
      console.error(`Failed to submit feedback: ${res.status}`, await res.text());
    }
  } catch (err) {
    console.error("Error submitting feedback:", err);
  }
}

testSubmitFeedback();
