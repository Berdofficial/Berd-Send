import { Client, Environment } from 'square';
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

  // --- 1. KREYE LYEN PEYMAN SQUARE (Sa a dwe retounen url la rapid pou front-end la) ---
  if (req.method === 'POST' && req.body.phone && req.body.totalUSD) {
    try {
      const { totalUSD, phone, countryCode, amountUSD } = req.body;
      
      const client = new Client({
        accessToken: process.env.SQUARE_ACCESS_TOKEN,
        environment: Environment.Production,
      });

      const amountInCents = Math.round(parseFloat(totalUSD) * 100);
      const locationId = process.env.SQUARE_LOCATION_ID ? process.env.SQUARE_LOCATION_ID.trim() : '';

      const response = await client.checkoutApi.createPaymentLink({
        quickPay: {
          name: `Rechaj Mobil (${countryCode}) - ${phone}`,
          priceMoney: {
            amount: BigInt(amountInCents),
            currency: 'USD',
          },
          locationId: locationId,
        },
        description: `PHONE:${phone}|AMOUNT:${amountUSD}|CC:${countryCode}`,
        redirectUrl: `https://berdsend.com/success.html?phone=${phone}&amount=${amountUSD}&country=${countryCode}`
      });

      return res.status(200).json({
        success: true,
        url: response.result.paymentLink.url
      });

    } catch (error) {
      console.error('Erè Square API:', error);
      const errorMsg = error.errors ? error.errors.map(e => e.detail).join(', ') : error.message;
      return res.status(500).json({ success: false, error: errorMsg || 'Gen yon erè nan sèvè a.' });
    }
  }

  // --- 2. WEBHOOK: Lè Square voye siyal peman an fini ---
  if (req.method === 'POST') {
    try {
      // Reponn Square imedyatman pou l pa bloke
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
