import { Client, Environment } from 'square';

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
    
    if (!totalUSD || !phone) {
      return res.status(400).json({ success: false, error: 'Done ki manke.' });
    }

    const client = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: Environment.Production,
    });

    const amountInCents = Math.round(parseFloat(totalUSD) * 100);

    // Nou itilize estrikti ofisyèl Square Checkout API a
    const response = await client.checkoutApi.createPaymentLink({
      order: {
        locationId: process.env.SQUARE_LOCATION_ID,
        lineItems: [
          {
            name: `Rechaj Mobil (${countryCode}) - ${phone}`,
            quantity: '1',
            basePriceMoney: {
              amount: BigInt(amountInCents),
              currency: 'USD',
            },
          },
        ],
      },
      checkoutOptions: {
        redirectUrl: 'https://berdsend.vercel.app/success.html',
      },
    });

    return res.status(200).json({
      success: true,
      url: response.result.paymentLink.url
    });

  } catch (error) {
    console.error('Erè Square API:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.errors ? error.errors[0].detail : error.message 
    });
  }
}
