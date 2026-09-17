require('dotenv').config();
const apiKey = process.env.ELEVENLABS_API_KEY;
const conversationId = process.argv[2] || "conv_0201m22v1m4qfyz8xjxd5py5b9b1";

async function inspectConversation() {
  const url = `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`;
  const res = await fetch(url, { headers: { "xi-api-key": apiKey } });
  if (!res.ok) {
    console.error("Failed to fetch conversation:", res.status, await res.text());
    return;
  }
  const data = await res.json();
  console.log(`\n======================================================`);
  console.log(`CONVERSATION AUDIT: ${conversationId}`);
  console.log(`Status: ${data.status} | Call Duration: ${data.metadata?.call_duration_secs || 'N/A'}s | Termination: ${data.metadata?.termination_reason || 'N/A'}`);
  console.log(`======================================================\n`);

  const transcript = data.transcript || [];
  console.log(`Total Transcript Turns: ${transcript.length}`);
  transcript.forEach((t, idx) => {
    const roleTag = t.role === 'agent' ? '[AI AGENT]' : (t.role === 'user' ? '[USER]' : `[${t.role.toUpperCase()}]`);
    console.log(`\nTurn ${idx + 1} ${roleTag} (${t.time_in_call_secs || 0}s):`);
    console.log(`  Message: ${t.message}`);
    
    if (t.tool_calls && t.tool_calls.length > 0) {
      console.log(`  🔧 Tool Invocations (${t.tool_calls.length}):`);
      t.tool_calls.forEach(tc => {
        console.log(`     -> Tool Name: ${tc.tool_name || tc.name}`);
        console.log(`        Params: ${JSON.stringify(tc.params_as_json || tc.params || tc.request || {})}`);
      });
    }

    if (t.tool_results && t.tool_results.length > 0) {
      console.log(`  📊 Tool Results (${t.tool_results.length}):`);
      t.tool_results.forEach(tr => {
        console.log(`     -> Result: ${JSON.stringify(tr.result || tr.response || tr)}`);
      });
    }
  });

  if (data.analysis) {
    console.log(`\n--- Analysis Summary ---`);
    console.log(`Call Successful: ${data.analysis.call_successful}`);
    console.log(`Evaluation Criteria:`, JSON.stringify(data.analysis.evaluation_criteria_results || {}, null, 2));
    console.log(`Data Collected:`, JSON.stringify(data.analysis.data_collection_results || {}, null, 2));
    console.log(`Transcript Summary:`, data.analysis.transcript_summary);
  }
}

inspectConversation();
