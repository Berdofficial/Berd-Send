import { Client, Environment } from 'square';
import crypto from 'crypto';

const squareClient = new Client({
    accessToken: process.env.SQUARE_ACCESS_TOKEN, // N ap mete kle sa a sou Vercel pou sekirite
    environment: Environment.Production,
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405.json({ success: false, error: 'Method Not Allowed' }));
    }

    try {
        const { sourceId, amount, currency, phone } = req.body;

        const response = await squareClient.paymentsApi.createPayment({
            sourceId: sourceId,
            idempotencyKey: crypto.randomUUID(),
            amountMoney: {
                amount: BigInt(Math.round(amount * 100)),
                currency: currency || 'USD',
            },
            note: `BerdSend Mobile Top-up / Transfer pou nimewo: ${phone}`
        });

        return res.status(200).json({
            success: true,
            paymentId: response.result.payment.id,
            status: response.result.payment.status
        });

    } catch (error) {
        console.error('Erè nan peman Square:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Gen yon erè ki fèt pandan tranzaksyon an.'
        });
    }
}