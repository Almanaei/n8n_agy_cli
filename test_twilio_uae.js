require('dotenv').config();

async function checkTwilioUaeStatus() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  console.log('Querying Twilio Logs for target number: +971506860991...');
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json?To=%2B971506860991&PageSize=10`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
      }
    });

    const data = await res.json();
    console.log('Twilio Response Data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error fetching Twilio logs:', err.message);
  }
}

checkTwilioUaeStatus();
