export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Rekipere Access Token nan men Reloadly otomatikman
    const tokenResponse = await fetch("https://auth.reloadly.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.RELOADLY_CLIENT_ID,
        client_secret: process.env.RELOADLY_CLIENT_SECRET,
        grant_type: "client_credentials",
        audience: "https://topups-sandbox.reloadly.com"
      })
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      return res.status(400).json({ error: "Echèk nan otantifikasyon ak Reloadly" });
    }

    // 2. Fè demann rechaj la (Topup)
    const { amount, operatorId, recipientPhone } = req.body;
    
    const topupResponse = await fetch("https://topups-sandbox.reloadly.com/topups", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
        "Accept": "application/com.reloadly.topups-v1+json"
      },
      body: JSON.stringify({
        amount: amount,
        operatorId: operatorId,
        recipientPhone: {
          countryCode: "HT",
          number: recipientPhone
        }
      })
    });

    const result = await topupResponse.json();
    return res.status(200).json(result);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}