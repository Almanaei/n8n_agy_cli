const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MDdhMDUyNi0yNTdmLTQ4YTAtYmNlNi0zNDYyNzYyZmY2YjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2Y0OTQ0OGMtMDM2OC00NWJlLTk0YTQtMmJlZGRhMjUwZjk1IiwiaWF0IjoxNzgxNTY1NTM0fQ.YXh7cIPD4tMzkMt-NPyoWTfbdpy2LZHycVwDSib8v4g";
const url = "http://localhost:5678/api/v1/workflows";

const workflow = {
  name: "ElevenLabs Lead Integration",
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
        operation: "appendRow",
        spreadsheetId: "YOUR_SPREADSHEET_ID_HERE",
        sheetName: "Sheet1",
        columns: {
          mappingMode: "defineBelow",
          value: {
            "Timestamp": "={{ $now }}",
            "Client Name": "={{ $json.body.parameters.clientName }}",
            "Phone Number": "={{ $json.body.parameters.phoneNumber }}",
            "Lead Status": "New Lead"
          }
        },
        options: {}
      },
      type: "n8n-nodes-base.googleSheets",
      typeVersion: 4,
      position: [250, 0],
      name: "Google Sheets Append"
    }
  ],
  connections: {
    "ElevenLabs Webhook": {
      "main": [
        [
          {
            "node": "Google Sheets Append",
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

async function deploy() {
  console.log("Deploying workflow to local n8n...");
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-N8N-API-KEY": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(workflow)
    });

    const result = await response.json();
    if (response.ok) {
      console.log("Workflow successfully deployed!");
      console.log("Workflow ID:", result.id);
      console.log("You can view it at: http://localhost:5678/workflow/" + result.id);
    } else {
      console.error("Failed to deploy workflow:", result);
    }
  } catch (error) {
    console.error("Request error:", error);
  }
}

deploy();
