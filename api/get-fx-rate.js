// api/get-fx-rate.js

export default async function handler(req, res) {
  // Pèmèt sèlman metòd POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metòd sa a pa otorize' });
  }

  const { phone, countryCode, amountUSD } = req.body;

  if (!phone || !countryCode || !amountUSD) {
    return res.status(400).json({ error: 'Manke enfòmasyon (phone, countryCode, amountUSD)' });
  }

  try {
    // 1. Jwenn Access Token nan men Reloadly
    const tokenResponse = await fetch("https://auth.reloadly.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.RELOADLY_CLIENT_ID,
        client_secret: process.env.RELOADLY_CLIENT_SECRET,
        grant_type: "client_credentials",
        audience: "https://topups.reloadly.com"
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error("Echèk pou jwenn Access Token nan Reloadly");
    }

    const accessToken = tokenData.access_token;

    // 2. Detekte operatè a ak tò dechanj la selon nimewo telefòn lan
    // N ap itilize sèvis Auto-Detect Operatè Reloadly an:
    const operatorResponse = await fetch(
      `https://topups.reloadly.com/operators/auto-detect/phone/${phone}/countries/${countryCode}?suggestedAmountsMap=true`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/com.reloadly.topups-v1+json"
        }
      }
    );

    const operatorData = await operatorResponse.json();

    if (!operatorResponse.ok || !operatorData.id) {
      return res.status(400).json({ 
        error: "Pa ka jwenn operatè pou nimewo sa a. Tanpri tcheke nimewo a ankò." 
      });
    }

    // 3. Extrait tò dechanj la (fxRate) ak monnen lokal la
    const fxRate = operatorData.fx.rate; // Tò dechanj an tan reyèl
    const recipientCurrency = operatorData.destinationCurrencyCode; // egz: HTG, DOP, JMD
    const localAmount = parseFloat(amountUSD) * fxRate;

    return res.status(200).json({
      success: true,
      operatorName: operatorData.name,
      fxRate: fxRate,
      recipientCurrency: recipientCurrency,
      recipientReceives: localAmount.toFixed(2)
    });

  } catch (err) {
    console.error("Erè Reloadly API:", err);
    return res.status(500).json({ error: "Erè nan sèvè an pandan n ap kontakte Reloadly." });
  }
}
