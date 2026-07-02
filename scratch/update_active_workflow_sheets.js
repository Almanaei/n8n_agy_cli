const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MDdhMDUyNi0yNTdmLTQ4YTAtYmNlNi0zNDYyNzYyZmY2YjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2Y0OTQ0OGMtMDM2OC00NWJlLTk0YTQtMmJlZGRhMjUwZjk1IiwiaWF0IjoxNzgxNTY1NTM0fQ.YXh7cIPD4tMzkMt-NPyoWTfbdpy2LZHycVwDSib8v4g";
const workflowId = "mwNnYOQ8OB6jMF9C";
const url = `http://localhost:5678/api/v1/workflows/${workflowId}`;
const targetSpreadsheetId = "1cfJ9RqDUI6ZImycA2IyUXsuMKyhVxTQ8Ky0OuWbyNI8";

async function run() {
  try {
    console.log("Fetching active workflow n8n-standalone-v2...");
    const response = await fetch(url, {
      headers: { "X-N8N-API-KEY": apiKey }
    });
    
    if (!response.ok) {
      console.error("Failed to fetch workflow:", await response.text());
      return;
    }
    
    const workflow = await response.json();
    console.log("Fetched successfully. Modifying Google Sheets nodes...");

    // Helper to update sheets nodes in a given nodes array
    function updateSheetsNodes(nodesList) {
      if (!nodesList) return;
      nodesList.forEach(node => {
        if (node.type === "n8n-nodes-base.googleSheets") {
          console.log(`Updating node: ${node.name} (${node.id})`);
          node.parameters.documentId = {
            "__rl": true,
            "value": targetSpreadsheetId,
            "mode": "id"
          };
          // Also set sheetName to "Sheet1"
          node.parameters.sheetName = {
            "__rl": true,
            "value": "Sheet1",
            "mode": "name"
          };
        }
      });
    }

    updateSheetsNodes(workflow.nodes);

    const payload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: {
        executionOrder: workflow.settings?.executionOrder || "v1"
      }
    };

    console.log("Updating workflow via PUT...");
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
    
    console.log("Workflow successfully updated with new Google Sheets ID! 🎉");
    
    // Deactivate first to apply changes cleanly
    console.log("Deactivating workflow...");
    await fetch(`${url}/deactivate`, {
      method: "POST",
      headers: { "X-N8N-API-KEY": apiKey }
    });

    // Activate the workflow
    console.log("Activating workflow...");
    const activateResponse = await fetch(`${url}/activate`, {
      method: "POST",
      headers: { "X-N8N-API-KEY": apiKey }
    });
    
    if (activateResponse.ok) {
      console.log("Workflow successfully activated and running! ✅");
    } else {
      console.error("Failed to activate workflow:", await activateResponse.text());
    }
  } catch (err) {
    console.error("Error updating workflow:", err);
  }
}

run();
