import { Client, Environment } from 'square';
import fetch from 'node-fetch';

// Fonksyon pou jwenn yon Token otantifikasyon nan men Reloadly
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

  // --- 1. SI SE DEMANN POU KREYE PEYMAN (Soti nan Frontend la) ---
  if (req.method === 'POST' && req.body.phone && req.body.totalUSD) {
    try {
      const { totalUSD, phone, countryCode, amountUSD } = req.body;
      
      const client = new Client({
        accessToken: process.env.SQUARE_ACCESS_TOKEN,
        environment: Environment.Production,
      });

      const amountInCents = Math.round(parseFloat(totalUSD) * 100);
      const locationId = process.env.SQUARE_LOCATION_ID ? process.env.SQUARE_LOCATION_ID.trim() : '';

      // Nou mete metadata nan lyen an pou n ka kenbe nimewo a ak montan an lè peman an ap retounen
      const response = await client.checkoutApi.createPaymentLink({
        quickPay: {
          name: `Rechaj Mobil (${countryCode}) - ${phone}`,
          priceMoney: {
            amount: BigInt(amountInCents),
            currency: 'USD',
          },
          locationId: locationId,
        },
        description: `BerdSend Top-up pou nimewo ${phone} ($${amountUSD} USD + Frè)`,
        redirectUrl: `${process.env.FRONTEND_URL}/success.html?phone=${phone}&amount=${amountUSD}&country=${countryCode}`
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

  // --- 2. WEBHOOK: Lè Square voye konfimasyon peman an fèt (Payment Succeeded) ---
  if (req.method === 'POST' && req.body.type === 'payment.updated') {
    try {
      const payment = req.body.data.object.payment;
      if (payment.status === 'COMPLETED') {
        const note = payment.note || '';
        // Eseye jwenn nimewo ak montan ki te mete nan deskripsyon an
        const phoneMatch = note.match(/nimewo\s+([+\d]+)/);
        const amountMatch = note.match(/\$([\d.]+)\s+USD/);

        if (phoneMatch && amountMatch) {
          const phone = phoneMatch[1];
          const amountUSD = parseFloat(amountMatch[1]);

          // Pran Token Reloadly a
          const accessToken = await getReloadlyToken();

          // Voye demann lan sou Reloadly Airtime API
          const reloadlyRes = await fetch('https://topups.reloadly.com/topups', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/com.reloadly.topups-v1+json'
            },
            body: JSON.stringify({
              operatorId: 0, // Ou ka jwenn operatorId otomatikman selon nimewo a anvan, oswa mete l isit la
              amount: amountUSD,
              useLocalAmount: false,
              recipientPhone: {
                countryCode: phone.startsWith('+') ? phone.substring(1, 3) : 'DO', // Ajiste selon peyi w la
                number: phone.replace(/\D/g, '')
              },
              customIdentifier: `BERD-${Date.now()}`
            })
          });

          const reloadlyData = await reloadlyRes.json();
          console.log("Repons Reloadly Airtime:", reloadlyData);
        }
      }
      return res.status(200).json({ received: true });
    } catch (err) {
      console.error("Erè nan Webhook la:", err);
      return res.status(500).json({ success: false });
    }
  }

  return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
