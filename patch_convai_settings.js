const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";

async function run() {
  const url = "https://api.elevenlabs.io/v1/convai/settings";
  const payload = {
    webhooks: {
      post_call_webhook_id: "b78ba4ce83d64a8ca92dafb87447b48b"
    }
  };
  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      console.error("Failed to patch settings:", res.status, await res.text());
      return;
    }
    const data = await res.json();
    console.log("Successfully patched ConvAI Settings! New settings:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
