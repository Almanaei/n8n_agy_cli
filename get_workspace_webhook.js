const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const webhookId = "dfc6564248344f9fb3920afb5a05037c";

async function run() {
  const url = `https://api.elevenlabs.io/v1/workspace/webhooks/${webhookId}`;
  try {
    const response = await fetch(url, {
      headers: {
        "xi-api-key": apiKey
      }
    });
    if (!response.ok) {
      console.error("Failed to fetch webhook info:", response.status, await response.text());
      return;
    }
    const data = await response.json();
    console.log("Workspace Webhook Info:");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Request failed:", error);
  }
}

run();
