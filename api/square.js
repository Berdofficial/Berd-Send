export default async function handler(req, res) {
  // Sèlman asepte POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { phoneNumber, amount } = req.body;

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;

  // Tcheke si varyab yo nan Vercel
  if (!accessToken || !locationId) {
    return res.status(500).json({ 
      error: 'SQUARE_ACCESS_TOKEN oswa SQUARE_LOCATION_ID pa konfigire sou Vercel.' 
    });
  }

  // Otomatikman detekte si se Sandbox oswa Production Token
  const isSandbox = accessToken.startsWith('EAAA') || accessToken.startsWith('sandbox-') || accessToken.includes('sandbox');
  const baseUrl = isSandbox 
    ? 'https://connect.squareupsandbox.com' 
    : 'https://connect.squareup.com';

  try {
    const squareResponse = await fetch(`${baseUrl}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        order: {
          location_id: locationId,
          line_items: [
            {
              name: `Rechaj Telefòn BerdSend (${phoneNumber || 'Rechaj'})`,
              quantity: '1',
              base_price_money: {
                amount: Math.round(Number(amount) * 100), // Convert USD to Cents
                currency: 'USD',
              },
            },
          ],
        },
      }),
    });

    const data = await squareResponse.json();

    if (!squareResponse.ok) {
      console.error('Square Error Details:', data);
      const detailMsg = data.errors?.[0]?.detail || 'Erè nan repons Square an.';
      return res.status(400).json({ error: detailMsg });
    }

    // Retounen lyen checkout Square la bay frontend lan
    return res.status(200).json({ checkoutUrl: data.payment_link.url });

  } catch (error) {
    console.error('Server Catch Error:', error);
    return res.status(500).json({ error: error.message || 'Erè nan koneksyon ak sèvè peyman an.' });
  }
}
