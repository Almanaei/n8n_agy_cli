const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const conversationId = "conv_4301kvsq3xnyfg09ynyfwc5pwyrv";
const url = `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`;

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
    console.log("Conversation status:", data.status);
    
    const turns = data.transcript || [];
    console.log(`Transcript turns count: ${turns.length}`);
    
    turns.forEach((turn, idx) => {
      console.log(`\nTurn ${idx} [${turn.role.toUpperCase()}]: ${turn.message || turn.original_message || ''}`);
      if (turn.tool_calls && turn.tool_calls.length > 0) {
        console.log("  Tool Calls:");
        turn.tool_calls.forEach(tc => {
          console.log(`    - Name: ${tc.name} | Request:`, JSON.stringify(tc.request || tc.arguments || tc.call || tc));
        });
      }
      if (turn.tool_results && turn.tool_results.length > 0) {
        console.log("  Tool Results:");
        turn.tool_results.forEach(tr => {
          console.log(`    - Result:`, JSON.stringify(tr.result || tr.response || tr));
        });
      }
    });
  } catch (err) {
    console.error(err);
  }
}
run();
