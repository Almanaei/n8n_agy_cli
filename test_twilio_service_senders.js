require('dotenv').config();

async function checkServiceSenders() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || 'MGe1e2e6baaf17b2bec99e959dd83ea99a';

  console.log(`Querying Senders for Messaging Service: ${serviceSid}...`);
  try {
    const res = await fetch(`https://messaging.twilio.com/v1/Services/${serviceSid}/PhoneNumbers`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
      }
    });
    const data = await res.json();
    console.log('Phone Numbers in Service:', JSON.stringify(data, null, 2));

    const alphaRes = await fetch(`https://messaging.twilio.com/v1/Services/${serviceSid}/AlphaSenders`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
      }
    });
    const alphaData = await alphaRes.json();
    console.log('Alpha Senders in Service:', JSON.stringify(alphaData, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkServiceSenders();
