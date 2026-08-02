// api/square.js
import { Client, Environment } from 'square';

const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.NODE_ENV === 'production' ? Environment.Production : Environment.Sandbox,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { phoneNumber, operatorId, amount, originCountry, destCountry } = req.body;

  try {
    const response = await squareClient.checkoutApi.createPaymentLink({
      idempotencyKey: crypto.randomUUID(),
      order: {
        locationId: process.env.SQUARE_LOCATION_ID,
        lineItems: [
          {
            name: `Rechaj Telefòn BerdSend (${phoneNumber})`,
            quantity: '1',
            basePriceMoney: {
              amount: BigInt(Math.round(amount * 100)), // Konvèti an cents
              currency: 'USD',
            },
          },
        ],
      },
      checkoutOptions: {
        redirectUrl: `${req.headers.origin || 'https://berdsend.com'}/success.html`,
      },
    });

    return res.status(200).json({ checkoutUrl: response.result.paymentLink.url });
  } catch (error) {
    console.error('Square Error:', error);
    return res.status(500).json({ error: error.message || 'Erè nan kreyasyon peyman an' });
  }
}
