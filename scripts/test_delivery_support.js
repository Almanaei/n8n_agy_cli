const { 
  sendAdminApplicationNotification, 
  sendUserApplicationStatusEmail, 
  sendUserTranscriptEmail 
} = require("./admin_email_notifier");

const TARGET = "support@bhcdai.com";

async function runComprehensiveTests() {
  console.log("=================================================================");
  console.log("🚀 COMPREHENSIVE EMAIL DELIVERY AUDIT TO: " + TARGET);
  console.log("=================================================================\n");

  const results = [];

  // 1. Transcript Export Email
  console.log("1️⃣ Testing AI Voice/Text Chat Transcript Export...");
  const tHtml = `<div style=\"font-family: Cairo, sans-serif; background: #0b1329; border: 1px solid #38bdf8; border-radius: 8px; padding: 16px; color: #f8fafc;\">`
    + `<p><strong style=\"color: #38bdf8;\">🤖 المساعد الذكي:</strong> مرحباً بك في بوابة الدفاع المدني الذكية لمملكة البحرين.</p>`
    + `<p><strong style=\"color: #f59e0b;\">👤 المتعامل:</strong> أرغب في التحقق من وصول المستندات الخاصة برخصة المخبز الآلي.</p>`
    + `<p><strong style=\"color: #38bdf8;\">🤖 المساعد الذكي:</strong> تم توثيق المعاملة بنجاح، رقم طلبك هو CD-2026-9081.</p>`
    + `</div>`;
  const res1 = await sendUserTranscriptEmail({
    email: TARGET,
    clientName: "سعادة المهندس أحمد المناعي",
    phoneNumber: "+973 39999999",
    transcriptHtml: tHtml,
    transcriptText: "توثيق محادثة استفسار رخصة الدفاع المدني",
    timestamp: new Date().toLocaleString("ar-BH", { timeZone: "Asia/Bahrain" })
  });
  results.push({ test: "Chat Transcript Email", ...res1 });

  // 2. Admin Alert Email (Sent to support@bhcdai.com as admin destination)
  console.log("\n2️⃣ Testing Admin Submission Alert (Destination: support@bhcdai.com)...");
  const res2 = await sendAdminApplicationNotification({
    appId: "CD-AUDIT-2026-ADM",
    adminEmail: TARGET,
    serviceName: "ترخيص استيفاء اشتراطات الوقاية والسلامة للمنشآت التجارية والصناعية",
    clientName: "شركة البحرين للتقنية المتقدمة",
    firstName: "عبدالله",
    lastName: "المناعي",
    phone: "+973 38888888",
    email: "client@example.com",
    isNewApplication: true,
    status: "Submitted",
    attachmentLink: "https://bhcdai.com/uploads/sample-plans.pdf"
  });
  results.push({ test: "Admin Alert - New Application", ...res2 });

  // 3-9: All 7 Client Application Status Updates
  const statuses = [
    { status: "Submitted", note: "Initial Submission Confirmation" },
    { status: "Under Review", note: "Application is currently under technical review" },
    { status: "In Progress", note: "Engineering plans processing in progress" },
    { status: "Under Inspection", note: "Field site inspection scheduled" },
    { status: "Modification Requested", note: "Missing emergency exit plans" },
    { status: "Approved", note: "Final Approval & Official Certificate Issued" },
    { status: "Rejected", note: "Non-compliance with safety codes" }
  ];

  for (let i = 0; i < statuses.length; i++) {
    const item = statuses[i];
    console.log(`\n${i + 3}️⃣ Testing Client Status Email: [${item.status}]...`);
    const res = await sendUserApplicationStatusEmail({
      appId: `CD-AUDIT-2026-00${i + 1}`,
      serviceName: "شهادة استيفاء اشتراطات السلامة والوقاية من الحريق وتجديدها",
      clientName: "مؤسسة الابتكار البحرينية",
      phone: "+973 33333333",
      email: TARGET,
      status: item.status,
      reason: item.status === "Modification Requested" 
        ? "يرجى إعادة رفع مخطط مخارج الطوارئ ومسارات الهروب مع توضيح مواقع كواشف الدخان ومضخات الحريق المعتمدة." 
        : (item.status === "Rejected" ? "عدم مطابقة عرض الممرات ومخارج الطوارئ للكود البحريني للسلامة." : ""),
      addressOrCR: "سجل تجاري: 987654-01 (مجمع 328 - المحرق)",
      category: "التراخيص والاعتماد"
    });
    results.push({ test: `Client Status: ${item.status}`, ...res });
  }

  console.log("\n=================================================================");
  console.log("📊 COMPLETE 9-POINT DELIVERY AUDIT SUMMARY:");
  console.table(results.map(r => ({
    Test: r.test,
    Recipient: r.recipient,
    Status: r.status,
    MessageId: r.messageId
  })));
  console.log("=================================================================");

  const allSent = results.every(r => r.status === "sent" && r.messageId);
  if (allSent) {
    console.log(`
🎉 SUCCESS: All ${results.length} email types delivered directly to ${TARGET} via Brevo API with valid Message-IDs!`);
  } else {
    console.log(`
⚠️ Some emails failed to send.`);
  }
}

runComprehensiveTests().catch(console.error);
