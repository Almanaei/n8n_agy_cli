// Built-in fetch used

async function runSmsDeliveryTest() {
  console.log('=========================================================================');
  console.log('📱 TESTING SMS DELIVERY UPON NEW APPLICATION CREATION');
  console.log('=========================================================================');
  console.log('Target Phone Number : 97335555563 (Rule 12 Standard Dedicated Test Number)');
  console.log('Target Email        : almannaei90@gmail.com');
  console.log('-------------------------------------------------------------------------\n');

  const payload = {
    firstName: "خالد",
    lastName: "المناعي",
    email: "almannaei90@gmail.com",
    whatsapp: "97335555563",
    serviceName: "تصريح رخصة مخبز",
    paymentMethod: "BenefitPay",
    referenceNumber: "CR-973-88210",
    notes: "اختبار إرسال رسالة نصية قصيرة SMS عند تقديم طلب جديد"
  };

  try {
    console.log('[Step 1] Submitting new application to http://localhost:3000/api/applications...');
    const res = await fetch('http://localhost:3000/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log(`[Step 1 Result] HTTP Status: ${res.status}`);
    console.log('Response Payload:', JSON.stringify(data, null, 2));

    if (res.status === 200 && data.appId) {
      console.log('\n=========================================================================');
      console.log('📊 TEST RESULT SUMMARY');
      console.log('=========================================================================');
      console.log(`✅ Application ID   : ${data.appId}`);
      console.log(`✅ Initial Status  : ${data.status || 'Submitted'}`);
      console.log(`📱 SMS Sent Target  : +97335555563`);
      console.log(`📱 SMS Delivery SID : ${data.notification?.sms?.sid || data.smsSid || 'N/A'}`);
      console.log(`📱 SMS Success State: ${data.notification?.sms?.success ? 'SUCCESS (Delivered)' : 'Failed/Pending'}`);
      console.log('=========================================================================\n');
    } else {
      console.error('❌ Application creation failed:', data);
    }
  } catch (err) {
    console.error('❌ Error executing SMS delivery test:', err.message);
  }
}

runSmsDeliveryTest();
