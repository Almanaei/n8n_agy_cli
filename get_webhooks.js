const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const url = "https://api.elevenlabs.io/v1/workspace/webhooks";

async function run() {
  try {
    const res = await fetch(url, {
      headers: { "xi-api-key": apiKey }
    });
    if (!res.ok) {
      console.error("Failed to fetch:", res.status, await res.text());
      return;
    }
    const data = await res.json();
    console.log("Webhooks found:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
