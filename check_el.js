const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const agentId = "agent_1601kv6ytcwwfh1sfk46qqhrrq3j";

async function checkWebhooks() {
  const url = "https://api.elevenlabs.io/v1/workspace/webhooks";
  try {
    const res = await fetch(url, {
      headers: { "xi-api-key": apiKey }
    });
    if (!res.ok) {
      console.error("Failed to list webhooks:", res.status, await res.text());
      return;
    }
    const data = await res.json();
    console.log("=== ElevenLabs Webhooks ===");
    data.webhooks.forEach(wh => {
      console.log(`- Name: ${wh.name}\n  ID: ${wh.webhook_id}\n  URL: ${wh.webhook_url}\n  Disabled: ${wh.is_disabled}`);
    });
  } catch (err) {
    console.error("Webhooks fetch failed:", err);
  }
}

async function checkAgent() {
  const url = `https://api.elevenlabs.io/v1/convai/agents/${agentId}`;
  try {
    const res = await fetch(url, {
      headers: { "xi-api-key": apiKey }
    });
    if (!res.ok) {
      console.error("Failed to get agent:", res.status, await res.text());
      return;
    }
    const data = await res.json();
    console.log("\n=== ElevenLabs Agent Tools ===");
    const tools = data.conversation_config?.agent?.prompt?.tools || [];
    console.log(JSON.stringify(tools, null, 2));
  } catch (err) {
    console.error("Agent fetch failed:", err);
  }
}

async function run() {
  await checkWebhooks();
  await checkAgent();
}
run();
