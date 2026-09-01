require('dotenv').config();

async function testGccSmsMatrix() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || 'MGe1e2e6baaf17b2bec99e959dd83ea99a';

  const testNumbers = [
    { country: 'Bahrain', code: '+973', number: '+97335555563' },
    { country: 'UAE', code: '+971', number: '+971506860991' },
    { country: 'Saudi Arabia', code: '+966', number: '+966500000000' },
    { country: 'Kuwait', code: '+965', number: '+96550000000' },
    { country: 'Oman', code: '+968', number: '+96890000000' },
    { country: 'Qatar', code: '+974', number: '+97450000000' }
  ];

  console.log('=========================================================================');
  console.log('🌍 GCC SMS MATRIX TEST FOR SENDER: CivilDef');
  console.log('=========================================================================\n');

  for (const item of testNumbers) {
    console.log(`[Test] Sending to ${item.country} (${item.number})...`);
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          MessagingServiceSid: messagingServiceSid,
          To: item.number,
          Body: `الدفاع المدني - اختبار إرسال الرسائل النصية (${item.country})`
        })
      });

      const data = await res.json();
      if (res.ok && !data.error_code) {
        console.log(`  ✅ QUEUED: SID ${data.sid} | Status: ${data.status}`);
      } else {
        console.log(`  ⚠️ TWILIO ERROR ${data.error_code || res.status}: ${data.message || 'Error'}`);
      }
    } catch (err) {
      console.log(`  ❌ EXCEPTION: ${err.message}`);
    }
  }
}

testGccSmsMatrix();
