require('dotenv').config();
const apiKey = process.env.ELEVENLABS_API_KEY;
const agentId = "agent_1601kv6ytcwwfh1sfk46qqhrrq3j";

async function listRecentConvs() {
  const url = `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${agentId}&page_size=5`;
  const res = await fetch(url, { headers: { "xi-api-key": apiKey } });
  if (!res.ok) {
    console.error("Error fetching conversations:", res.status, await res.text());
    return;
  }
  const data = await res.json();
  console.log("Found conversations:", data.conversations?.length);
  (data.conversations || []).forEach((c, idx) => {
    console.log(`[${idx + 1}] ID: ${c.conversation_id} | Status: ${c.status} | Duration: ${c.call_duration_secs}s | Turns: ${c.message_count} | Rating: ${c.call_successful} | Date: ${c.start_time_unix_timestamp ? new Date(c.start_time_unix_timestamp * 1000).toISOString() : 'N/A'}`);
  });
}

listRecentConvs();
