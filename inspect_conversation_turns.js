const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const conversationId = "conv_3301kvy4hsttermr8h3hnsk25cvy";
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
    console.log("Top-level keys:", Object.keys(data));
    
    // Find turns list or similar
    const listKey = data.turns ? "turns" : (data.transcript ? "transcript" : null);
    const turns = listKey ? data[listKey] : null;
    
    if (turns) {
      console.log(`Using key '${listKey}', length: ${turns.length}`);
      turns.forEach((turn, idx) => {
        console.log(`\nTurn ${idx} [${turn.role}]: ${turn.message || turn.original_message || '(No message)'}`);
        if (turn.tool_calls && turn.tool_calls.length > 0) {
          console.log("  Tool Calls:");
          turn.tool_calls.forEach(tc => {
            console.log(`    - ID: ${tc.id} | Name: ${tc.name} | Request:`, JSON.stringify(tc.request || tc.arguments || tc.call || tc));
          });
        }
        if (turn.tool_results && turn.tool_results.length > 0) {
          console.log("  Tool Results:");
          turn.tool_results.forEach(tr => {
            console.log(`    - ID: ${tr.id} | Result:`, JSON.stringify(tr.result || tr.response || tr));
          });
        }
      });
    } else {
      console.log("No turns list found. Keys are:", Object.keys(data));
      for (const k of Object.keys(data)) {
        if (Array.isArray(data[k])) {
          console.log(`Array field: ${k}, length: ${data[k].length}`);
          if (data[k].length > 0) {
            console.log(`First item keys of ${k}:`, Object.keys(data[k][0]));
          }
        }
      }
    }
  } catch (err) {
    console.error(err);
  }
}
run();
