const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MDdhMDUyNi0yNTdmLTQ4YTAtYmNlNi0zNDYyNzYyZmY2YjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2Y0OTQ0OGMtMDM2OC00NWJlLTk0YTQtMmJlZGRhMjUwZjk1IiwiaWF0IjoxNzgxNTY1NTM0fQ.YXh7cIPD4tMzkMt-NPyoWTfbdpy2LZHycVwDSib8v4g";
const url = "http://localhost:5678/api/v1/workflows/VBjr7VIF75yUyP45";

const testWorkflow = {
  name: "ElevenLabs Lead Integration (Testable)",
  nodes: [
    {
      parameters: {
        httpMethod: "POST",
        path: "leads",
        responseMode: "lastNode",
        options: {}
      },
      type: "n8n-nodes-base.webhook",
      typeVersion: 1.1,
      position: [0, 0],
      name: "ElevenLabs Webhook"
    },
    {
      parameters: {
        jsCode: `const input = $input.first().json;
return [{
  json: {
    status: "success",
    clientName: input.body?.parameters?.clientName || "Unknown",
    phoneNumber: input.body?.parameters?.phoneNumber || "Unknown",
    timestamp: new Date().toISOString(),
    leadStatus: "New Lead (Test Mode)"
  }
}];`
      },
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [250, 0],
      name: "Mock Google Sheets Logic"
    }
  ],
  connections: {
    "ElevenLabs Webhook": {
      "main": [
        [
          {
            "node": "Mock Google Sheets Logic",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  settings: {
    executionOrder: "v1"
  }
};

async function deployTest() {
  console.log("Updating workflow VBjr7VIF75yUyP45 to Test Mode...");
  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "X-N8N-API-KEY": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(testWorkflow)
    });

    const result = await response.json();
    if (response.ok) {
      console.log("Workflow successfully updated to Test Mode!");
      
      // Now activate the workflow
      console.log("Activating workflow...");
      const activateResponse = await fetch(url + "/activate", {
        method: "POST",
        headers: {
          "X-N8N-API-KEY": apiKey
        }
      });
      
      if (activateResponse.ok) {
        console.log("Workflow successfully activated! ✅");
        console.log("Test URL: http://localhost:5678/webhook/leads");
      } else {
        const activateResult = await activateResponse.json();
        console.error("Failed to activate workflow:", activateResult);
      }
    } else {
      console.error("Failed to update workflow:", result);
    }
  } catch (error) {
    console.error("Request error:", error);
  }
}

deployTest();
