const fs = require('fs');
const path = require('path');

const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MDdhMDUyNi0yNTdmLTQ4YTAtYmNlNi0zNDYyNzYyZmY2YjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2Y0OTQ0OGMtMDM2OC00NWJlLTk0YTQtMmJlZGRhMjUwZjk1IiwiaWF0IjoxNzgxNTY1NTM0fQ.YXh7cIPD4tMzkMt-NPyoWTfbdpy2LZHycVwDSib8v4g";
const workflowId = "VBjr7VIF75yUyP45";
const apiUrl = `http://localhost:5678/api/v1/workflows/${workflowId}`;
const jsonFilePath = path.join(__dirname, `workflow_${workflowId}.json`);

const newNodes = [
  {
    "parameters": {
      "httpMethod": "POST",
      "path": "feedback",
      "options": {},
      "responseMode": "responseNode"
    },
    "type": "n8n-nodes-base.webhook",
    "typeVersion": 1.1,
    "position": [
      0,
      600
    ],
    "name": "Feedback Webhook",
    "id": "feedback-webhook-id",
    "webhookId": "feedback-webhook-generated-id"
  },
  {
    "parameters": {
      "authentication": "serviceAccount",
      "operation": "appendOrUpdate",
      "documentId": {
        "__rl": true,
        "value": "https://docs.google.com/spreadsheets/d/1cfJ9RqDUI6ZImycA2IyUXsuMKyhVxTQ8Ky0OuWbyNI8/edit?gid=0#gid=0",
        "mode": "url"
      },
      "sheetName": {
        "__rl": true,
        "value": "Sheet1",
        "mode": "name"
      },
      "columns": {
        "mappingMode": "defineBelow",
        "matchingColumns": [
          "Conversation ID"
        ],
        "value": {
          "Conversation ID": "={{ $json.body.conversationId }}",
          "KPI": "={{ $json.body.kpi }}"
        },
        "schema": [
          {
            "id": "Timestamp",
            "displayName": "Timestamp",
            "type": "string"
          },
          {
            "id": "Client Name",
            "displayName": "Client Name",
            "type": "string"
          },
          {
            "id": "Phone Number",
            "displayName": "Phone Number",
            "type": "string"
          },
          {
            "id": "Client Email",
            "displayName": "Client Email",
            "type": "string"
          },
          {
            "id": "Conversation ID",
            "displayName": "Conversation ID",
            "type": "string"
          },
          {
            "id": "Lead Status",
            "displayName": "Lead Status",
            "type": "string"
          },
          {
            "id": "KPI",
            "displayName": "KPI",
            "type": "string"
          }
        ]
      },
      "options": {}
    },
    "type": "n8n-nodes-base.googleSheets",
    "typeVersion": 4.7,
    "position": [
      256,
      600
    ],
    "id": "update-sheet-kpi-id",
    "name": "Update Sheet KPI",
    "credentials": {
      "googleApi": {
        "id": "fXHzExTwkxRRpEVc",
        "name": "Google Sheets account 2"
      }
    }
  },
  {
    "parameters": {
      "respondWith": "json",
      "responseBody": "{\n  \"status\": \"success\",\n  \"message\": \"Feedback saved.\"\n}",
      "options": {}
    },
    "type": "n8n-nodes-base.respondToWebhook",
    "typeVersion": 1,
    "position": [
      512,
      600
    ],
    "id": "respond-to-feedback-id",
    "name": "Respond to Feedback Webhook"
  }
];

function updateWorkflowStructure(workflow) {
  // Update Google Sheets Append Node schema in nodes list
  const updateNodes = (nodesList) => {
    // 1. Update Append Row node to use appendOrUpdate instead of append, and autoMapInputData
    const appendNode = nodesList.find(n => n.id === "3393c1fa-09e4-48f1-9e3b-41574df6897e");
    if (appendNode) {
      appendNode.parameters = appendNode.parameters || {};
      
      // Change operation to appendOrUpdate
      appendNode.parameters.operation = "appendOrUpdate";
      
      appendNode.parameters.columns = appendNode.parameters.columns || {};
      
      // Change mappingMode to autoMapInputData
      appendNode.parameters.columns.mappingMode = "autoMapInputData";
      
      // Add matching columns for upsert matching
      appendNode.parameters.columns.matchingColumns = ["Conversation ID"];
      
      // Remove value map as it's not needed for autoMapInputData
      delete appendNode.parameters.columns.value;
      
      // Update Schema list
      appendNode.parameters.columns.schema = appendNode.parameters.columns.schema || [];
      const hasKpi = appendNode.parameters.columns.schema.some(s => s.id === "KPI");
      if (!hasKpi) {
        appendNode.parameters.columns.schema.push({
          "id": "KPI",
          "displayName": "KPI",
          "type": "string"
        });
      }
      console.log("- Google Sheets lead node converted to appendOrUpdate with autoMapInputData.");
    }

    // 2. Add or update the "Lookup Existing Lead Info" node
    const lookupExistingNode = {
      "parameters": {
        "authentication": "serviceAccount",
        "operation": "read",
        "documentId": {
          "__rl": true,
          "value": "https://docs.google.com/spreadsheets/d/1cfJ9RqDUI6ZImycA2IyUXsuMKyhVxTQ8Ky0OuWbyNI8/edit?gid=0#gid=0",
          "mode": "url"
        },
        "sheetName": {
          "__rl": true,
          "value": "Sheet1",
          "mode": "name"
        },
        "filtersUI": {
          "values": [
            {
              "lookupColumn": "Conversation ID",
              "lookupValue": "={{ $json.body.conversationId || '' }}"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 4.7,
      "position": [
        380,
        -100
      ],
      "id": "lookup-existing-lead-info-id",
      "name": "Lookup Existing Lead Info",
      "credentials": {
        "googleApi": {
          "id": "fXHzExTwkxRRpEVc",
          "name": "Google Sheets account 2"
        }
      },
      "alwaysOutputData": true
    };

    const lookupIndex = nodesList.findIndex(n => n.id === lookupExistingNode.id);
    if (lookupIndex !== -1) {
      nodesList[lookupIndex] = lookupExistingNode;
    } else {
      nodesList.push(lookupExistingNode);
    }
    console.log("- Added/updated Lookup Existing Lead Info node.");

    // 3. Add or update the "Prepare Sheets Payload" node
    const preparePayloadNode = {
      "parameters": {
        "jsCode": "const body = $('ElevenLabs Webhook').first().json.body || {};\nconst existing = $input.item.json || {};\nconst payload = {};\n\npayload[\"Conversation ID\"] = body.conversationId;\n\n// Generate Bahrain timestamp\nconst pad = (num) => String(num).padStart(2, '0');\nconst now = new Date();\nconst utc = now.getTime() + (now.getTimezoneOffset() * 60000);\nconst bahrain = new Date(utc + (3600000 * 3));\nconst ms = String(bahrain.getMilliseconds()).padStart(3, '0');\npayload[\"Timestamp\"] = existing.Timestamp || `${bahrain.getFullYear()}-${pad(bahrain.getMonth() + 1)}-${pad(bahrain.getDate())}T${pad(bahrain.getHours())}:${pad(bahrain.getMinutes())}:${pad(bahrain.getSeconds())}.${ms}+03:00`;\n\nif (body.clientName !== undefined && body.clientName !== null && body.clientName !== '') {\n  payload[\"Client Name\"] = body.clientName;\n} else if (existing[\"Client Name\"]) {\n  payload[\"Client Name\"] = existing[\"Client Name\"];\n}\n\nif (body.phoneNumber !== undefined && body.phoneNumber !== null && body.phoneNumber !== '') {\n  payload[\"Phone Number\"] = body.phoneNumber;\n} else if (existing[\"Phone Number\"]) {\n  payload[\"Phone Number\"] = existing[\"Phone Number\"];\n}\n\nif (body.clientEmail !== undefined && body.clientEmail !== null && body.clientEmail !== '') {\n  let email = body.clientEmail;\n  email = email.replace(/\\s*\\[at\\]\\s*/gi, '@').replace(/\\[at\\]/gi, '@');\n  email = email.replace(/\\s*\\[dot\\]\\s*/gi, '.').replace(/\\[dot\\]/gi, '.');\n  email = email.replace(/\\s+/g, '');\n  payload[\"Client Email\"] = email;\n} else if (existing[\"Client Email\"]) {\n  payload[\"Client Email\"] = existing[\"Client Email\"];\n}\n\npayload[\"Lead Status\"] = existing[\"Lead Status\"] || \"New Lead\";\nif (existing[\"KPI\"]) {\n  payload[\"KPI\"] = existing[\"KPI\"];\n}\n\nreturn { json: payload };"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        540,
        -100
      ],
      "id": "prepare-sheets-payload-id",
      "name": "Prepare Sheets Payload"
    };

    const prepIndex = nodesList.findIndex(n => n.id === preparePayloadNode.id);
    if (prepIndex !== -1) {
      nodesList[prepIndex] = preparePayloadNode;
    } else {
      nodesList.push(preparePayloadNode);
    }
    console.log("- Added/updated Prepare Sheets Payload node.");

    // 4. Add or update the three new feedback nodes
    newNodes.forEach(newNode => {
      const index = nodesList.findIndex(n => n.id === newNode.id);
      if (index !== -1) {
        nodesList[index] = newNode;
        console.log(`- Updated node: ${newNode.name}`);
      } else {
        nodesList.push(newNode);
        console.log(`- Added node: ${newNode.name}`);
      }
    });

    // Remove Format Sheet KPI Cell node if it exists
    const formatNodeIndex = nodesList.findIndex(n => n.id === "format-sheet-kpi-id");
    if (formatNodeIndex !== -1) {
      nodesList.splice(formatNodeIndex, 1);
      console.log("- Removed Format Sheet KPI Cell node from workflow nodes.");
    }
  };

  updateNodes(workflow.nodes);
  if (workflow.activeVersion && workflow.activeVersion.nodes) {
    updateNodes(workflow.activeVersion.nodes);
  }

  // Update connections
  const updateConnections = (connections) => {
    // Reroute Respond to Webhook -> Lookup Existing Lead Info -> Prepare Sheets Payload -> Google Sheets
    if (connections["Respond to Webhook"]) {
      connections["Respond to Webhook"] = {
        "main": [
          [
            {
              "node": "Lookup Existing Lead Info",
              "type": "main",
              "index": 0
            }
          ]
        ]
      };
      console.log("- Updated Respond to Webhook connection to route to Lookup Existing Lead Info.");
    }
    if (!connections["Lookup Existing Lead Info"]) {
      connections["Lookup Existing Lead Info"] = {
        "main": [
          [
            {
              "node": "Prepare Sheets Payload",
              "type": "main",
              "index": 0
            }
          ]
        ]
      };
      console.log("- Added Lookup Existing Lead Info connection to Prepare Sheets Payload.");
    }
    if (connections["Prepare Sheets Payload"]) {
      connections["Prepare Sheets Payload"] = {
        "main": [
          [
            {
              "node": "Google Sheets",
              "type": "main",
              "index": 0
            }
          ]
        ]
      };
      console.log("- Updated Prepare Sheets Payload connection to Google Sheets.");
    }

    if (!connections["Feedback Webhook"]) {
      connections["Feedback Webhook"] = {
        "main": [
          [
            {
              "node": "Update Sheet KPI",
              "type": "main",
              "index": 0
            }
          ]
        ]
      };
      console.log("- Added Feedback Webhook connection.");
    }
    connections["Update Sheet KPI"] = {
      "main": [
        [
          {
            "node": "Respond to Feedback Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    };
    console.log("- Reverted Update Sheet KPI connection to route to Respond to Feedback Webhook.");

    if (connections["Format Sheet KPI Cell"]) {
      delete connections["Format Sheet KPI Cell"];
      console.log("- Removed Format Sheet KPI Cell connection.");
    }
  };

  updateConnections(workflow.connections);
  if (workflow.activeVersion && workflow.activeVersion.connections) {
    updateConnections(workflow.activeVersion.connections);
  }
}

async function run() {
  console.log("Loading workflow JSON file...");
  if (!fs.existsSync(jsonFilePath)) {
    console.error(`Workflow file not found at ${jsonFilePath}`);
    return;
  }
  
  const content = fs.readFileSync(jsonFilePath, 'utf8');
  const workflow = JSON.parse(content);
  
  console.log("Modifying workflow structure...");
  updateWorkflowStructure(workflow);
  
  // Save changes back to disk
  fs.writeFileSync(jsonFilePath, JSON.stringify(workflow, null, 2), 'utf8');
  console.log(`Saved updated workflow to ${jsonFilePath}`);
  
  // Construct clean payload for n8n API (excluding read-only metadata fields to avoid errors)
  const payload = {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: {
      executionOrder: workflow.settings?.executionOrder || "v1"
    }
  };
  
  console.log("Deactivating workflow first...");
  try {
    await fetch(`${apiUrl}/deactivate`, {
      method: "POST",
      headers: { "X-N8N-API-KEY": apiKey }
    });
  } catch (e) {}

  console.log("Uploading updated workflow to local n8n instance...");
  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      "X-N8N-API-KEY": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    console.error(`Failed to update workflow: ${response.status} - ${await response.text()}`);
    return;
  }
  
  console.log("Workflow successfully uploaded!");
  
  console.log("Activating workflow...");
  const activateResponse = await fetch(`${apiUrl}/activate`, {
    method: "POST",
    headers: {
      "X-N8N-API-KEY": apiKey
    }
  });
  
  if (activateResponse.ok) {
    console.log("Workflow successfully activated! ✅");
  } else {
    console.error(`Failed to activate workflow: ${activateResponse.status} - ${await activateResponse.text()}`);
  }
}

run().catch(err => console.error(err));
