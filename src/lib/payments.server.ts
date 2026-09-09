// Mobile Money payment integrations (CinetPay & FedaPay)
// Env vars (added via add_secret once user provides them):
//   CINETPAY_API_KEY
//   CINETPAY_SITE_ID
//   CINETPAY_SECRET_KEY  (for webhook HMAC verification if used)
//   FEDAPAY_SECRET_KEY
//   FEDAPAY_WEBHOOK_SECRET
//   APP_PUBLIC_URL       e.g. https://smsmobilepro.lovable.app

type Params = {
  orderId: string;
  amountFcfa: number;
  provider: "cinetpay" | "fedapay";
  description: string;
};

export async function createPaymentSession(p: Params): Promise<{
  provider: string;
  payment_url?: string;
  transaction_id?: string;
  configured: boolean;
  message?: string;
}> {
  const base = process.env.APP_PUBLIC_URL ?? "https://smsmobilepro.lovable.app";
  const returnUrl = `${base}/dashboard/orders?order=${p.orderId}`;
  const notifyUrl = `${base}/api/public/webhooks/${p.provider}`;

  if (p.provider === "cinetpay") {
    const apiKey = process.env.CINETPAY_API_KEY;
    const siteId = process.env.CINETPAY_SITE_ID;
    if (!apiKey || !siteId) {
      return { provider: "cinetpay", configured: false, message: "CinetPay non configuré (clés API manquantes)" };
    }
    const res = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: apiKey,
        site_id: siteId,
        transaction_id: p.orderId,
        amount: p.amountFcfa,
        currency: "XOF",
        description: p.description,
        return_url: returnUrl,
        notify_url: notifyUrl,
        channels: "MOBILE_MONEY",
      }),
    });
    const body = (await res.json().catch(() => ({}))) as any;
    if (body?.data?.payment_url) {
      return {
        provider: "cinetpay",
        configured: true,
        payment_url: body.data.payment_url,
        transaction_id: p.orderId,
      };
    }
    return { provider: "cinetpay", configured: true, message: body?.message ?? "CinetPay: erreur d'initialisation" };
  }

  // FedaPay
  const secret = process.env.FEDAPAY_SECRET_KEY;
  if (!secret) {
    return { provider: "fedapay", configured: false, message: "FedaPay non configuré (clés API manquantes)" };
  }
  const res = await fetch("https://api.fedapay.com/v1/transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      amount: p.amountFcfa,
      currency: { iso: "XOF" },
      description: p.description,
      callback_url: returnUrl,
      metadata: { order_id: p.orderId },
    }),
  });
  const body = (await res.json().catch(() => ({}))) as any;
  const tx = body?.["v1/transaction"] ?? body?.transaction;
  if (tx?.id) {
    // Generate the payment token / URL
    const tokenRes = await fetch(`https://api.fedapay.com/v1/transactions/${tx.id}/token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    const tokenBody = (await tokenRes.json().catch(() => ({}))) as any;
    return {
      provider: "fedapay",
      configured: true,
      payment_url: tokenBody?.url,
      transaction_id: String(tx.id),
    };
  }
  return { provider: "fedapay", configured: true, message: body?.message ?? "FedaPay: erreur d'initialisation" };
}
