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
    const { totalUSD, phone, countryCode, amountUSD } = req.body;

    if (!phone || !totalUSD) {
      return res.status(400).json({ success: false, error: 'Done ki manke.' });
    }

    const amountInCents = Math.round(parseFloat(totalUSD) * 100);
    const locationId = process.env.SQUARE_LOCATION_ID ? process.env.SQUARE_LOCATION_ID.trim() : '';

    // Demann dirèk sou Square API pou kreye lyen an
    const squareRes = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18'
      },
      body: JSON.stringify({
        quick_pay: {
          name: `Rechaj Mobil (${countryCode || 'DO'}) - ${phone}`,
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
      console.error('Erè Square:', squareData);
      return res.status(500).json({ 
        success: false, 
        error: squareData.errors?.[0]?.detail || 'Erè nan koneksyon Square' 
      });
    }

    return res.status(200).json({
      success: true,
      url: squareData.payment_link.url
    });

  } catch (error) {
    console.error('Erè nan sèvè a:', error);
    return res.status(500).json({ success: false, error: 'Gen yon erè nan rezo a.' });
  }
}
