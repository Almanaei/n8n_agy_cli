const fs = require('fs');
const path = require('path');

const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MDdhMDUyNi0yNTdmLTQ4YTAtYmNlNi0zNDYyNzYyZmY2YjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2Y0OTQ0OGMtMDM2OC00NWJlLTk0YTQtMmJlZGRhMjUwZjk1IiwiaWF0IjoxNzgxNTY1NTM0fQ.YXh7cIPD4tMzkMt-NPyoWTfbdpy2LZHycVwDSib8v4g";
const n8nBaseUrl = "http://localhost:5678/api/v1/workflows";

async function run() {
  try {
    const workflowPath = path.join(__dirname, 'workflow_service_applications.json');
    if (!fs.existsSync(workflowPath)) {
      console.error("Workflow file not found:", workflowPath);
      return;
    }
    const newWorkflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    delete newWorkflowData.active; // Remove active since it is read-only in API

    console.log("Checking if workflow already exists in n8n...");
    const listRes = await fetch(n8nBaseUrl, {
      headers: { "X-N8N-API-KEY": apiKey }
    });
    if (!listRes.ok) {
      throw new Error(`Failed to list workflows: ${listRes.status} ${await listRes.text()}`);
    }
    const listData = await listRes.json();
    const existing = listData.data.find(w => w.name === "Service Application Automation");

    let workflowId = null;
    if (existing) {
      workflowId = existing.id;
      console.log(`Workflow already exists with ID: ${workflowId}. Updating...`);
      const updateUrl = `${n8nBaseUrl}/${workflowId}`;
      const updateRes = await fetch(updateUrl, {
        method: "PUT",
        headers: {
          "X-N8N-API-KEY": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newWorkflowData)
      });
      if (!updateRes.ok) {
        throw new Error(`Failed to update workflow: ${updateRes.status} ${await updateRes.text()}`);
      }
      console.log("Workflow successfully updated!");
    } else {
      console.log("Creating new workflow...");
      const createRes = await fetch(n8nBaseUrl, {
        method: "POST",
        headers: {
          "X-N8N-API-KEY": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newWorkflowData)
      });
      if (!createRes.ok) {
        throw new Error(`Failed to create workflow: ${createRes.status} ${await createRes.text()}`);
      }
      const createData = await createRes.json();
      workflowId = createData.id;
      console.log(`Workflow created successfully with ID: ${workflowId}!`);
    }

    // Activate the workflow
    console.log(`Activating workflow ${workflowId}...`);
    const activateUrl = `${n8nBaseUrl}/${workflowId}/activate`;
    const activateRes = await fetch(activateUrl, {
      method: "POST",
      headers: { "X-N8N-API-KEY": apiKey }
    });
    if (activateRes.ok) {
      console.log("Workflow successfully activated! ✅");
    } else {
      console.error("Failed to activate workflow:", await activateRes.text());
    }

  } catch (err) {
    console.error("Error during deployment:", err);
  }
}

run();
