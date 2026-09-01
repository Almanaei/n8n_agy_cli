require('dotenv').config();

async function testSmsUaeDirect() {
  console.log('=========================================================================');
  console.log('📱 DISPATCHING LIVE TEST SMS TO UAE NUMBER: +971506860991');
  console.log('=========================================================================');

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || 'MGe1e2e6baaf17b2bec99e959dd83ea99a';

  const smsPayload = {
    MessagingServiceSid: messagingServiceSid,
    To: '+971506860991',
    Body: 'الإدارة العامة للدفاع المدني: هذا اختبار آلي مباشر لتأكيد تفعيل استقبال الرسائل النصية القصيرة في دولة الإمارات (+971).'
  };

  try {
    const smsRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(smsPayload)
    });

    const smsData = await smsRes.json();
    console.log('HTTP Status:', smsRes.status);
    console.log('Twilio API Response:', JSON.stringify(smsData, null, 2));

    if (smsRes.ok && !smsData.error_code) {
      console.log(`\n✅ SMS QUEUED SUCCESSFULLY! SID: ${smsData.sid}, Status: ${smsData.status}`);

      // Poll status after 5 seconds to verify carrier delivery
      console.log('Waiting 5 seconds to check final carrier delivery status...');
      await new Promise(r => setTimeout(r, 5000));

      const pollRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${smsData.sid}.json`, {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
        }
      });
      const pollData = await pollRes.json();
      console.log('\n📊 CARRIER DELIVERY STATUS POLL RESULT:');
      console.log(`- Message SID  : ${pollData.sid}`);
      console.log(`- Final Status : ${pollData.status}`);
      console.log(`- Error Code   : ${pollData.error_code || 'None (Clean Delivery)'}`);
      console.log(`- Error Message: ${pollData.error_message || 'N/A'}`);
    } else {
      console.error(`\n❌ Twilio API Error (${smsData.error_code}): ${smsData.message}`);
    }
  } catch (err) {
    console.error('❌ Exception during SMS dispatch:', err.message);
  }
}

testSmsUaeDirect();
