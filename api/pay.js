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

  // --- 1. KREYE LYEN PEYMAN SQUARE (Itilize Fetch dirèk pou pa gen erè rezo) ---
  if (req.method === 'POST' && req.body.phone && req.body.totalUSD) {
    try {
      const { totalUSD, phone, countryCode, amountUSD } = req.body;
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
            name: `Rechaj Mobil (${countryCode}) - ${phone}`,
            price_money: {
              amount: amountInCents,
              currency: 'USD'
            },
            location_id: locationId
          },
          description: `PHONE:${phone}|AMOUNT:${amountUSD}|CC:${countryCode}`,
          redirect_url: `https://berdsend.com/success.html?phone=${phone}&amount=${amountUSD}&country=${countryCode}`
        })
      });

      const squareData = await squareRes.json();

      if (!squareRes.ok) {
        console.error('Erè Square API:', squareData);
        return res.status(500).json({ success: false, error: squareData.errors?.[0]?.detail || 'Erè nan koneksyon Square' });
      }

      return res.status(200).json({
        success: true,
        url: squareData.payment_link.url
      });

    } catch (error) {
      console.error('Erè rezo API:', error);
      return res.status(500).json({ success: false, error: 'Gen yon erè nan rezo a.' });
    }
  }

  // --- 2. WEBHOOK: Lè peman an fini sou Square ---
  if (req.method === 'POST') {
    try {
      res.status(200).json({ received: true });

      const event = req.body;
      if (event && event.type === 'payment.updated') {
        const payment = event.data?.object?.payment;
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
      }
      return;
    } catch (err) {
      console.error("Erè nan Webhook la:", err);
      return;
    }
  }

  return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
