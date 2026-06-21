const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const agentId = "agent_1601kv6ytcwwfh1sfk46qqhrrq3j";
const newWebhookId = "b78ba4ce83d64a8ca92dafb87447b48b";

async function run() {
  const url = `https://api.elevenlabs.io/v1/convai/agents/${agentId}`;
  
  const payload = {
    platform_settings: {
      workspace_overrides: {
        webhooks: {
          post_call_webhook_id: newWebhookId,
          events: ["transcript"],
          transcript_format: "json",
          send_audio: false
        }
      }
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
      console.error("Patch agent failed:", res.status, await res.text());
      return;
    }
    console.log("Successfully patched agent workspace_overrides! 🎉");
  } catch (err) {
    console.error("Error patching agent:", err);
  }
}

run();
