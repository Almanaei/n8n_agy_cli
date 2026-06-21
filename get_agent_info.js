const apiKey = "896c43093392d23879dc8d578e7840b4a0b27af2ecf38803e985386b494c427c";
const agentId = "agent_1601kv6ytcwwfh1sfk46qqhrrq3j";
const fs = require('fs');

async function getAgentInfo() {
  const url = `https://api.elevenlabs.io/v1/convai/agents/${agentId}`;
  try {
    const response = await fetch(url, {
      headers: {
        "xi-api-key": apiKey
      }
    });
    if (!response.ok) {
      console.error("Failed to fetch agent info:", response.status, await response.text());
      return;
    }
    const data = await response.json();
    fs.writeFileSync('D:/geminiprojects/n8n_agy_cli/agent_info.json', JSON.stringify(data, null, 2));
    console.log("Saved agent info to agent_info.json");
    
    // Print summary of tools
    const tools = data.conversation_config?.agent?.prompt?.tools || [];
    console.log("Configured Tools:");
    for (const tool of tools) {
      console.log(`- Name: ${tool.name}, Type: ${tool.type}`);
      if (tool.api_schema) {
        console.log(`  URL: ${tool.api_schema.url}`);
        console.log(`  Method: ${tool.api_schema.method}`);
        console.log(`  Schema properties:`, Object.keys(tool.api_schema.request_body_schema?.properties || {}));
      }
    }
  } catch (error) {
    console.error("Request failed:", error);
  }
}

getAgentInfo();
