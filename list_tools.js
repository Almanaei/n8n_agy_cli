require('dotenv').config();
const apiKey = process.env.ELEVENLABS_API_KEY;

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
