const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const webhookId = "dfc6564248344f9fb3920afb5a05037c";
const newUrl = "https://butterfly-expense-unsubscribe-birth.trycloudflare.com/webhook/post-call";

async function patchWebhook() {
  const url = `https://api.elevenlabs.io/v1/workspace/webhooks/${webhookId}`;
  
  // Try direct payload first
  console.log("Method 1: Direct payload");
  const payload1 = {
    webhook_url: newUrl,
    name: "n8n_post_call_new2",
    is_disabled: false
  };
  
  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload1)
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
  } catch (err) {
    console.error(err);
  }

  // Try nested settings with outer name payload
  console.log("\nMethod 3: Outer name + nested settings payload");
  const payload3 = {
    name: "n8n_post_call_new2",
    settings: {
      auth_type: "hmac",
      webhook_url: newUrl
    },
    is_disabled: false
  };
  
  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload3)
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
  } catch (err) {
    console.error(err);
  }
}

patchWebhook();
