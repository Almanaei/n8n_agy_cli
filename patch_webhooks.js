const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const baseUrl = "https://butterfly-expense-unsubscribe-birth.trycloudflare.com";

const webhooks = [
  { id: "1ffbe2c9aca04de79b2d82bfa17744ad", name: "n8n_post_call_new3" },
  { id: "4ed5c5a6643b4758b3ff1a564f489d02", name: "n8n_post_call_cloudflare" },
  { id: "ce4f6521b787492396fd5090b7aaf8f9", name: "n8n_post_call_inspected" },
  { id: "dfc6564248344f9fb3920afb5a05037c", name: "n8n_post_call_new2" }
];

async function run() {
  for (const wh of webhooks) {
    console.log(`Patching webhook ${wh.name} (${wh.id})...`);
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/workspace/webhooks/${wh.id}`, {
        method: "PATCH",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          webhook_url: `${baseUrl}/webhook/post-call`,
          name: wh.name,
          is_disabled: false
        })
      });
      
      const text = await res.text();
      console.log(`Response status: ${res.status}`);
      console.log(`Response body: ${text}`);
    } catch (err) {
      console.error(`Error patching ${wh.name}:`, err);
    }
  }
}
run();
