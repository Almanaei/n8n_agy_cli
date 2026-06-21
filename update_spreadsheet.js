const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MDdhMDUyNi0yNTdmLTQ4YTAtYmNlNi0zNDYyNzYyZmY2YjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2Y0OTQ0OGMtMDM2OC00NWJlLTk0YTQtMmJlZGRhMjUwZjk1IiwiaWF0IjoxNzgxNTY1NTM0fQ.YXh7cIPD4tMzkMt-NPyoWTfbdpy2LZHycVwDSib8v4g";
const url = "http://localhost:5678/api/v1/workflows/VBjr7VIF75yUyP45";
const spreadsheetId = "1cfJ9RqDUI6ZImycA2IyUXsuMKyhVxTQ8Ky0OuWbyNI8";

async function run() {
  console.log("Fetching current workflow...");
  const response = await fetch(url, {
    headers: {
      "X-N8N-API-KEY": apiKey
    }
  });
  
  if (!response.ok) {
    console.error("Failed to fetch workflow:", await response.text());
    return;
  }
  
  const workflow = await response.json();
  console.log("Modifying spreadsheet settings...");
  
  const sheetsNode = workflow.nodes.find(n => n.type === "n8n-nodes-base.googleSheets" || n.name === "Append row in sheet");
  if (!sheetsNode) {
    console.error("Google Sheets node not found!");
    return;
  }
  
  // Update documentId and sheetName
  sheetsNode.parameters.documentId = {
    "__rl": true,
    "value": spreadsheetId,
    "mode": "id"
  };
  sheetsNode.parameters.sheetName = {
    "__rl": true,
    "value": "Sheet1",
    "mode": "name"
  };
  
  const payload = {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: {
      executionOrder: workflow.settings?.executionOrder || "v1"
    }
  };
  
  console.log("Updating workflow...");
  const updateResponse = await fetch(url, {
    method: "PUT",
    headers: {
      "X-N8N-API-KEY": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  
  if (!updateResponse.ok) {
    console.error("Failed to update workflow:", await updateResponse.text());
    return;
  }
  
  console.log("Workflow successfully updated with Spreadsheet URL!");
  
  // Activate the workflow
  console.log("Activating workflow...");
  const activateResponse = await fetch(url + "/activate", {
    method: "POST",
    headers: {
      "X-N8N-API-KEY": apiKey
    }
  });
  
  if (activateResponse.ok) {
    console.log("Workflow successfully activated! ✅");
  } else {
    console.error("Failed to activate workflow:", await activateResponse.text());
  }
}

run();
