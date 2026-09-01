require('dotenv').config();

async function testDirectFromNumber() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  console.log('Sending direct SMS with From: +14155238886 (without MessagingServiceSid)...');
  const smsPayload = {
    From: '+14155238886',
    To: '+971506860991',
    Body: 'اختبار آلي مباشر من دفاع مدني البحرين (+971)'
  };

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(smsPayload)
    });

    const data = await res.json();
    console.log('Direct From Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testDirectFromNumber();
