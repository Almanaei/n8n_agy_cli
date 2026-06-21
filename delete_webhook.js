const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const webhookId = "b78ba4ce83d64a8ca92dafb87447b48b";

async function run() {
  const url = `https://api.elevenlabs.io/v1/workspace/webhooks/${webhookId}`;
  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        "xi-api-key": apiKey
      }
    });
    if (!res.ok) {
      console.error("Failed to delete webhook:", res.status, await res.text());
      return;
    }
    console.log(`Successfully deleted webhook ${webhookId}!`);
  } catch (err) {
    console.error(err);
  }
}
run();
