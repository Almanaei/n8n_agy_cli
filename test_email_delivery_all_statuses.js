const fs = require('fs');
const path = require('path');

// Load environment variables
const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[match[1]] = val;
  }
});

const { sendUserApplicationStatusEmail } = require('./scripts/admin_email_notifier');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runEmailDeliveryTests() {
  console.log("=========================================================================");
  console.log("📧 STARTING LIVE EMAIL DELIVERY AUDIT FOR ALL APPLICATION STATUSES");
  console.log("=========================================================================");
  console.log("Target Client Email : almannaei90@gmail.com");
  console.log("Target Client Phone : 97335555563 (Rule 12 Standard Test Number)");
  console.log("-------------------------------------------------------------------------\n");

  const targetEmail = "almannaei90@gmail.com";
  const appId = "APP-EMAIL-AUDIT-9730";
  const serviceName = "تصريح رخصة مخبز وتفتيش منشأة";
  const baseUrl = process.env.PUBLIC_URL || "http://localhost:3000";

  const statusesToTest = [
    {
      status: "Submitted",
      label: "1. Submission Confirmation (طلب جديد)",
      reason: ""
    },
    {
      status: "Under Review",
      label: "2. Under Review (قيد المراجعة والتدقيق الفني)",
      reason: "تم تحويل الطلب إلى قسم الهندسة الوقائية لمراجعة المخططات."
    },
    {
      status: "In Progress",
      label: "3. In Progress (قيد المعالجة والإجراء)",
      reason: "جاري دراسة استيفاء متطلبات الإنذار المبكر."
    },
    {
      status: "Under Inspection",
      label: "4. Under Inspection (قيد المعاينة الميدانية)",
      reason: "تم جدولة موعد المعاينة الميدانية للموقع يوم الثلاثاء القادم."
    },
    {
      status: "Modification Requested",
      label: "5. Modification Requested (مطلوب تعديل مستندات)",
      reason: "يرجى إعادة رفع السجل التجاري المحدث وشهادة السلامة المعتمدة."
    },
    {
      status: "Modification Resubmitted",
      label: "6. Modification Resubmitted (تم استلام التعديلات)",
      reason: "تم استلام المرفقات المعدلة وجاري إعادتها للتدقيق."
    },
    {
      status: "Approved",
      label: "7. Approved (اعتماد الطلب وترخيص الخدمة)",
      reason: "تمت الموافقة الرسمية وإصدار ترخيص الدفاع المدني المعتمد."
    },
    {
      status: "Rejected",
      label: "8. Rejected (عدم الموافقة / رفض الطلب)",
      reason: "تعذر القبول لعدم مطابقة الموقع لاشتراطات مسافات الأمان من حريق."
    }
  ];

  const results = [];

  for (let i = 0; i < statusesToTest.length; i++) {
    const item = statusesToTest[i];
    console.log(`[Test ${i+1}/${statusesToTest.length}] Dispatching Email for Status: "${item.status}"...`);
    
    try {
      const res = await sendUserApplicationStatusEmail({
        appId,
        status: item.status,
        serviceName,
        firstName: "خالد",
        lastName: "المناعي",
        email: targetEmail,
        whatsapp: "97335555563",
        reason: item.reason,
        modificationDetails: item.reason,
        trackingLink: `${baseUrl}/track?id=${appId}`,
        certificateLink: `${baseUrl}/receipt?id=${appId}`
      });

      console.log(`  ✅ SUCCESS: HTTP ${res.status} | Message ID: ${res.messageId || 'sent'}`);
      results.push({ status: item.status, success: true, messageId: res.messageId });
    } catch (err) {
      console.error(`  ❌ FAILED for status "${item.status}": ${err.message}`);
      results.push({ status: item.status, success: false, error: err.message });
    }

    // Brief delay between email sends
    await sleep(1500);
  }

  console.log("\n=========================================================================");
  console.log("📊 EMAIL DELIVERY TEST SUMMARY");
  console.log("=========================================================================");
  results.forEach((r, idx) => {
    const icon = r.success ? "✅" : "❌";
    console.log(`${icon} [Status ${idx+1}]: ${r.status.padEnd(25)} -> ${r.success ? 'DELIVERED TO almannaei90@gmail.com' : 'FAILED: ' + r.error}`);
  });
  console.log("=========================================================================");
}

runEmailDeliveryTests().catch(console.error);
