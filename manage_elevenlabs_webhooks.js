const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const baseUrl = "https://harbour-vat-suitable-fotos.trycloudflare.com";

async function createWebhook() {
  const url = "https://api.elevenlabs.io/v1/workspace/webhooks";
  console.log("Creating new workspace webhook...");
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
          name: "n8n_post_call_inspected",
          webhook_url: `${baseUrl}/webhook/post-call`
        }
      })
    });
    
    const text = await res.text();
    console.log("Create Response Status:", res.status);
    console.log("Create Response Body:", text);
  } catch (err) {
    console.error("Create failed:", err);
  }
}

async function listWebhooks() {
  const url = "https://api.elevenlabs.io/v1/workspace/webhooks";
  try {
    const res = await fetch(url, {
      headers: { "xi-api-key": apiKey }
    });
    const data = await res.json();
    console.log("Current Webhooks:");
    data.webhooks.forEach(wh => {
      console.log(`- Name: ${wh.name} | ID: ${wh.webhook_id} | URL: ${wh.webhook_url} | Disabled: ${wh.is_disabled}`);
    });
  } catch (err) {
    console.error("List failed:", err);
  }
}

async function run() {
  await createWebhook();
  await listWebhooks();
}

run();
