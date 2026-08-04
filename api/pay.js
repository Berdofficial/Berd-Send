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

// Fonksyon pou detekte Operator ID rapid dapre kòd peyi a oswa nimewo a
function getOperatorIdByPhone(phone, countryCode) {
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Repiblik Dominiken (+1)
  if (countryCode === 'DO' || cleanPhone.startsWith('1809') || cleanPhone.startsWith('1829') || cleanPhone.startsWith('1849')) {
    // Ou ka chanje sa selon operatè ou vle a (Claro DO an jeneral se yon bon chwa oswa nou ka mete l dinamik)
    return 139; // Egzanp: Claro Dominican Republic (oswa Orange/Altice)
  }
  
  // Ayiti (+509) - Digicel oswa Natcom
  if (countryCode === 'HT' || cleanPhone.startsWith('509')) {
    if (cleanPhone.startsWith('5093') || cleanPhone.startsWith('5094')) {
      return 355; // Digicel Haiti (Egzanp ID)
    } else {
      return 356; // Natcom Haiti (Egzanp ID)
    }
  }

  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // --- 1. KREYE LYEN PEYMAN SQUARE ---
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

  // --- 2. WEBHOOK: Lè peman an fini sou Square (payment.updated) ---
  if (req.method === 'POST' && req.body.type === 'payment.updated') {
    try {
      const payment = req.body.data.object.payment;
      if (payment.status === 'COMPLETED') {
        const note = payment.note || '';
        
        const phoneMatch = note.match(/PHONE:([+\d]+)/);
        const amountMatch = note.match(/AMOUNT:([\d.]+)/);
        const ccMatch = note.match(/CC:([A-Z]+)/);

        if (phoneMatch && amountMatch) {
          const phone = phoneMatch[1];
          const amountUSD = parseFloat(amountMatch[1]);
          const countryCode = ccMatch ? ccMatch[1] : 'DO';

          const accessToken = await getReloadlyToken();
          
          // Jwenn operator ID a dirèkteman san rete
          const operatorId = getOperatorIdByPhone(phone, countryCode);

          if (!operatorId) {
            console.error('Echèk: Pa jwenn operatorId pou nimewo sa a.');
            return res.status(400).json({ success: false, error: 'Operator not found' });
          }

          const reloadlyRes = await fetch('https://topups.reloadly.com/topups', {
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
