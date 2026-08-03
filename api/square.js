export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { phoneNumber, amount } = req.body;

  // Rele non varyab yo egzakteman konsa:
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;

  if (!accessToken || !locationId) {
    return res.status(500).json({ 
      error: 'Varyab SQUARE_ACCESS_TOKEN oswa SQUARE_LOCATION_ID manke sou Vercel.' 
    });
  }

  // Si se yon token production (ki kòmanse ak EAAA...), nou voye sou URL Production
  const baseUrl = 'https://connect.squareup.com';

  try {
    const squareResponse = await fetch(`${baseUrl}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${accessToken.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        order: {
          location_id: locationId.trim(),
          line_items: [
            {
              name: `Rechaj Telefòn BerdSend (${phoneNumber || 'Rechaj'})`,
              quantity: '1',
              base_price_money: {
                amount: Math.round(Number(amount) * 100),
                currency: 'USD',
              },
            },
          ],
        },
      }),
    });

    const data = await squareResponse.json();

    if (!squareResponse.ok) {
      console.error('Square Error:', data);
      const detailMsg = data.errors?.[0]?.detail || 'Erè nan repons Square an.';
      return res.status(400).json({ error: detailMsg });
    }

    return res.status(200).json({ checkoutUrl: data.payment_link.url });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: error.message || 'Erè nan koneksyon ak sèvè peyman an.' });
  }
}
