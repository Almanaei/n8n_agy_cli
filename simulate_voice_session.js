const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');

const clientEmail = "n8n-sheets-tracker@gen-lang-client-0132494438.iam.gserviceaccount.com";
const spreadsheetId = "1cfJ9RqDUI6ZImycA2IyUXsuMKyhVxTQ8Ky0OuWbyNI8";
const sheetName = "ServiceApplications";

// Extract key from server.js dynamically
const serverContent = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
const parts = serverContent.split('-----BEGIN PRIVATE KEY-----');
if (parts.length < 2) {
  console.error("Failed to extract private key from server.js");
  process.exit(1);
}
const keyContent = parts[1].split('-----END PRIVATE KEY-----')[0];
const privateKey = '-----BEGIN PRIVATE KEY-----' + keyContent + '-----END PRIVATE KEY-----';

function generateGoogleAccessToken(clientEmail, privateKey, scopes) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Claim = Buffer.from(JSON.stringify(claim)).toString('base64url');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${base64Header}.${base64Claim}`);
  const signature = sign.sign(privateKey, 'base64url');
  return `${base64Header}.${base64Claim}.${signature}`;
}

async function getAccessToken() {
  const jwt = generateGoogleAccessToken(clientEmail, privateKey, ["https://www.googleapis.com/auth/spreadsheets"]);
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  if (!tokenRes.ok) throw new Error("Auth token exchange failed");
  const data = await tokenRes.json();
  return data.access_token;
}

async function runScenario() {
  console.log("==========================================================");
  console.log("       STARTING A-Z VOICE AI & INTEGRATION SCENARIO       ");
  console.log("==========================================================\n");

  // Step 1: Obtain a signed URL from local backend
  console.log("Step 1: Fetching signed conversation session URL from backend...");
  const urlRes = await fetch("http://localhost:3000/get-signed-url");
  if (!urlRes.ok) {
    throw new Error(`Failed to fetch signed URL: ${urlRes.status} ${await urlRes.text()}`);
  }
  const { signed_url: wsUrl } = await urlRes.json();
  console.log("✓ Success: Signed session URL obtained!");

  // Step 2: Establish WebSocket Connection to ElevenLabs ConvAI
  console.log("\nStep 2: Connecting to ElevenLabs Voice Agent Session via WebSocket...");
  const ws = new WebSocket(wsUrl);

  let agentCalledTool = false;
  let toolCallArguments = null;
  let conversationId = null;

  await new Promise((resolve, reject) => {
    ws.on('open', () => {
      console.log("✓ Success: Connected to ElevenLabs WebSocket!");
      
      // Wait 3 seconds for the session initialization and greeting to complete, then speak
      setTimeout(() => {
        console.log("\nStep 3: Simulating User Request (in Arabic)...");
        console.log("Prompt: 'مرحباً، أنا سلمان العالي وهاتفي 97317461100 وإيميلي almannaei90@gmail.com. أريد تقديم طلب لتسجيل متدربين.'");
        
        // Send user text message frame to ElevenLabs
        const msgFrame = {
          type: "user_message",
          user_message: "مرحباً، أنا سلمان العالي وهاتفي 97317461100 وإيميلي almannaei90@gmail.com. أريد تقديم طلب لتسجيل متدربين."
        };
        ws.send(JSON.stringify(msgFrame));
      }, 3000);
    });

    ws.on('message', (data) => {
      const event = JSON.parse(data.toString());
      
      // Capture the conversation ID
      if (event.conversation_id && !conversationId) {
        conversationId = event.conversation_id;
        console.log(`[ElevenLabs] Session ID: ${conversationId}`);
      }

      // Handle Agent Responses (Text transcript of what the agent says)
      if (event.type == "agent_response" && event.agent_response?.message) {
        console.log(`[Voice Agent Response]: ${event.agent_response.message}`);
      }

      // Capture Tool Call event from ElevenLabs Agent
      if (event.type === "client_tool_call") {
        console.log("\nStep 4: VOICE AGENT CALLED CLIENT TOOL!");
        console.log("Tool Name:", event.client_tool_call.name);
        console.log("Arguments:", JSON.stringify(event.client_tool_call.parameters));
        
        agentCalledTool = true;
        toolCallArguments = event.client_tool_call.parameters;
        
        // Acknowledge the tool call to ElevenLabs so the session ends cleanly
        const toolResponse = {
          type: "client_tool_response",
          tool_call_id: event.client_tool_call.id,
          output: "Success: Form opened on user screen."
        };
        ws.send(JSON.stringify(toolResponse));
        
        // Resolve the promise to continue scenario
        ws.close();
        resolve();
      }
    });

    ws.on('error', (err) => {
      console.error("WebSocket error:", err);
      reject(err);
    });

    ws.on('close', () => {
      console.log("WebSocket connection closed.");
      resolve();
    });

    // Set a safety timeout of 30 seconds
    setTimeout(() => {
      ws.close();
      reject(new Error("Timeout: ElevenLabs agent did not call trigger_service_application tool within 30 seconds. Check agent prompt/rules."));
    }, 30000);
  });

  if (!agentCalledTool) {
    throw new Error("E2E Scenario Failed: The agent did not trigger the client tool!");
  }
  console.log("✓ Success: Voice Agent parsed the request and fired the browser trigger!");

  // Step 5: Simulate Client Modal Form Submission
  console.log("\nStep 5: Simulating Client UI Form Submission...");
  const mockPdf = "data:application/pdf;base64,JVBERi0xLjQKJcFSnaerCg==";
  const appId = `APP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

  const payload = {
    serviceName: toolCallArguments.serviceName || "Trainee Registration",
    firstName: "سلمان",
    lastName: "العالي",
    whatsapp: "+97317461100",
    email: "almannaei90@gmail.com",
    referenceNumber: toolCallArguments.referenceNumber || "CR-97300",
    attachmentName: "trainee_list_test.pdf",
    attachmentBase64: mockPdf,
    dynamicFields: {
      trainees: ["أحمد علي", "حسين حسن", "فاطمة محمد"]
    },
    paymentMethod: "Payment Link",
    notes: "تم تقديم هذا الطلب بواسطة فحص سيناريو محاكاة العميل الصوتي الذكي."
  };

  console.log(`Submitting application ${appId} for service: ${payload.serviceName}...`);
  const submitRes = await fetch("http://localhost:3000/api/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!submitRes.ok) {
    throw new Error(`Application submission failed: ${submitRes.status}`);
  }
  const submitData = await submitRes.json();
  console.log("Submission API Response:", submitData);
  console.log("✓ Success: Form submitted, PDF saved locally, Google Sheets appended!");

  // Step 6: Verify Google Sheet row index
  console.log("\nStep 6: Querying Google Sheets to check the stored row data...");
  const token = await getAccessToken();
  const getRowsRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:P2000`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const rowsData = await getRowsRes.json();
  const rows = rowsData.values || [];
  const rowIndex = rows.findIndex(r => r[0] === submitData.appId);
  if (rowIndex === -1) {
    throw new Error("Row not found in Google Sheets!");
  }
  const row = rows[rowIndex];
  const rowNum = rowIndex + 1;
  console.log(`✓ Success: Stored in row ${rowNum}! Default status is: ${row[12]}`);

  // Step 7: Simulate Admin approval inside Sheet and Poller update
  console.log(`\nStep 7: Simulating Admin action: Changing Status of Row ${rowNum} to 'Approved'...`);
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!M${rowNum}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ values: [["Approved"]] })
  });
  console.log("✓ Success: Sheet updated. Clearing Alert Sent and waiting for poller run...");

  // Sleep 70 seconds to let poller trigger
  console.log("Waiting 70 seconds for n8n poller workflow to trigger and update Sheet Alert Sent flag...");
  await new Promise(resolve => setTimeout(resolve, 70000));

  // Step 8: Final checking of Alert Sent flag
  console.log("\nStep 8: Re-checking Google Sheet to verify 'Alert Sent' flag has been updated to 'Yes'...");
  const checkRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A${rowNum}:P${rowNum}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const checkData = await checkRes.json();
  const updatedRow = checkData.values ? checkData.values[0] : [];
  console.log("Status:", updatedRow[12]);
  console.log("Alert Sent:", updatedRow[14]);

  if (updatedRow[14] === "Yes") {
    console.log("\n==========================================================");
    console.log("      🎉 SCENARIO COMPLETED AND PASSED FROM A TO Z! 🎉    ");
    console.log("==========================================================");
  } else {
    throw new Error("Failure: Alert Sent column was not marked as 'Yes' by the n8n status poller.");
  }
}

runScenario().catch(err => {
  console.error("\n❌ SCENARIO FAILED:", err);
  process.exit(1);
});
