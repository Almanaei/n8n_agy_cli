const fs = require('fs');

async function run() {
  const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
  const conversationId = "conv_6301kvmpaagffs5se53vm0sfdzrv";
  const url = `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`;

  try {
    const res = await fetch(url, {
      headers: { "xi-api-key": apiKey }
    });
    if (!res.ok) {
      console.error("Failed to fetch:", res.status, await res.text());
      return;
    }
    const data = await res.json();
    fs.writeFileSync('raw_transcript.json', JSON.stringify(data.transcript, null, 2));
    console.log("Saved raw transcript to raw_transcript.json");
  } catch (err) {
    console.error(err);
  }
}
run();
