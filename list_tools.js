const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";

async function run() {
  const url = "https://api.elevenlabs.io/v1/convai/tools";
  try {
    const res = await fetch(url, {
      headers: { "xi-api-key": apiKey }
    });
    if (!res.ok) {
      console.error("Failed to fetch tools:", res.status, await res.text());
      return;
    }
    const data = await res.json();
    console.log("Workspace Tools:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
