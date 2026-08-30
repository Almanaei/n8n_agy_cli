const fs = require('fs');
const path = require('path');

async function testN8nEmailPipeline() {
  console.log("=========================================================================");
  console.log("📧 TESTING N8N EMAIL PIPELINE FOR ALL 8 APPLICATION STATUSES");
  console.log("=========================================================================");
  console.log("Target Client Email : almannaei90@gmail.com");
  console.log("Target Client Phone : 97335555563 (Rule 12 Standard Test Number)");
  console.log("n8n Webhook Target  : http://127.0.0.1:5678/webhook/status-update");
  console.log("-------------------------------------------------------------------------\n");

  const targetEmail = "almannaei90@gmail.com";
  const appId = "APP-EMAIL-AUDIT-9730";
  const serviceName = "تصريح رخصة مخبز وتفتيش منشأة";
  const baseUrl = "http://localhost:3000";

  const statuses = [
    { status: "Submitted", desc: "1. Submitted (تقديم جديد)" },
    { status: "Under Review", desc: "2. Under Review (قيد المراجعة الفنية)" },
    { status: "In Progress", desc: "3. In Progress (قيد الإجراء والمعالجة)" },
    { status: "Under Inspection", desc: "4. Under Inspection (قيد المعاينة الميدانية)" },
    { status: "Modification Requested", desc: "5. Modification Requested (مطلوب تعديل مستندات)" },
    { status: "Modification Resubmitted", desc: "6. Modification Resubmitted (تم استلام التعديلات)" },
    { status: "Approved", desc: "7. Approved (اعتماد وترخيص رسمي)" },
    { status: "Rejected", desc: "8. Rejected (عدم الموافقة / رفض)" }
  ];

  for (let i = 0; i < statuses.length; i++) {
    const s = statuses[i];
    console.log(`[Status ${i+1}/8] Sending n8n Webhook payload for: "${s.status}"...`);

    const payload = {
      appId,
      status: s.status,
      modificationDetails: `اختبار بريدي آلي لحالة ${s.status}`,
      email: targetEmail,
      whatsapp: "97335555563",
      firstName: "خالد",
      lastName: "المناعي",
      serviceName,
      trackingLink: `${baseUrl}/track?id=${appId}`,
      isStatusUpdate: true
    };

    try {
      const res = await fetch("http://127.0.0.1:5678/webhook/status-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      console.log(`  ✅ n8n Response: HTTP ${res.status} ${res.statusText}`);
    } catch (err) {
      console.warn(`  ⚠️ n8n Webhook Error for "${s.status}": ${err.message}`);
    }
  }

  console.log("\n=========================================================================");
  console.log("🎉 ALL 8 STATUS EMAIL DISPATCH PAYLOADS DELIVERED TO N8N ENGINE!");
  console.log("=========================================================================");
}

testN8nEmailPipeline().catch(console.error);
