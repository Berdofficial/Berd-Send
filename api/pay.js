import fetch from 'node-fetch';

async function getReloadlyToken() {
  const response = await fetch('https://auth.reloadly.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.RELOADLY_CLIENT_ID,
      client_secret: process.env.RELOADLY_CLIENT_SECRET,
      audience: 'https://topups.reloadly.com'
    })
  });
  const data = await response.json();
  return data.access_token;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    // --- PART 1: SQUARE PAYMENT LINK CREATION ---
    if (body && body.phone && body.totalUSD) {
      const { totalUSD, phone, countryCode, amountUSD } = body;
      const amountInCents = Math.round(parseFloat(totalUSD) * 100);
      const locationId = process.env.SQUARE_LOCATION_ID ? process.env.SQUARE_LOCATION_ID.trim() : '';

      const squareRes = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'Square-Version': '2024-01-18'
        },
        body: JSON.stringify({
          quick_pay: {
            name: `Mobile Topup (${countryCode || 'DO'}) - ${phone}`,
            price_money: {
              amount: amountInCents,
              currency: 'USD'
            },
            location_id: locationId
          },
          description: `PHONE:${phone}|AMOUNT:${amountUSD || totalUSD}|CC:${countryCode || 'DO'}`,
          redirect_url: `https://berdsend.com/success.html?phone=${phone}&amount=${amountUSD || totalUSD}&country=${countryCode || 'DO'}`
        })
      });

      const squareData = await squareRes.json();

      if (!squareRes.ok) {
        console.error('Square API Error:', squareData);
        return res.status(500).json({ 
          success: false, 
          error: squareData.errors?.[0]?.detail || 'Square connection error' 
        });
      }

      return res.status(200).json({
        success: true,
        url: squareData.payment_link.url
      });
    }

    // --- PART 2: SQUARE WEBHOOK HANDLING ---
    if (body && body.type === 'payment.updated') {
      res.status(200).json({ received: true });

      const payment = body.data?.object?.payment;
      if (payment && payment.status === 'COMPLETED') {
        const note = payment.note || '';
        
        const phoneMatch = note.match(/PHONE:([+\d]+)/);
        const amountMatch = note.match(/AMOUNT:([\d.]+)/);
        const ccMatch = note.match(/CC:([A-Z]+)/);

        if (phoneMatch && amountMatch) {
          const phone = phoneMatch[1];
          const amountUSD = parseFloat(amountMatch[1]);
          const countryCode = ccMatch ? ccMatch[1] : 'DO';

          const operatorId = countryCode === 'DO' ? 139 : 355;
          const accessToken = await getReloadlyToken();

          await fetch('https://topups.reloadly.com/topups', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/com.reloadly.topups-v1+json'
            },
            body: JSON.stringify({
              operatorId: operatorId,
              amount: amountUSD,
              useLocalAmount: false,
              recipientPhone: {
                countryCode: countryCode,
                number: phone.replace(/\D/g, '')
              },
              customIdentifier: `BERD-${Date.now()}`
            })
          });
        }
      }
      return;
    }

    return res.status(400).json({ success: false, error: 'Invalid request payload' });

  } catch (error) {
    console.error('Server Internal Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error occurred.' });
  }
}
