const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const newUrl = "https://butterfly-expense-unsubscribe-birth.trycloudflare.com/webhook/post-call";

async function createWebhook() {
  const url = "https://api.elevenlabs.io/v1/workspace/webhooks";
  console.log("Creating new workspace webhook pointing to:", newUrl);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        settings: {
          auth_type: "hmac",
          name: "n8n_post_call_active_tunnel",
          webhook_url: newUrl
        }
      })
    });
    
    const text = await res.text();
    console.log("Response Status:", res.status);
    console.log("Response Body:", text);
  } catch (err) {
    console.error("Create failed:", err);
  }
}

createWebhook();
