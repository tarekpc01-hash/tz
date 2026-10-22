/* =====================================================================
   NILORIX — "Pay with Card / Apple Pay / Google Pay" via Transak
   URL: POST /api/card   body: { orderId }
   Transak only opens its widget from a URL made on the SERVER with your
   API secret, so this function creates that one-time URL (valid 5 minutes).

   Cloudflare Pages → Settings → Variables and Secrets:
     TRANSAK_API_KEY    = API Key from the Transak dashboard (Developers)
     TRANSAK_API_SECRET = API Secret (Secret type!)
     TRANSAK_ENV        = staging   (change to: production  after KYB is approved)
   ===================================================================== */
import "../../config.js";
import { firestore } from "./verify.js";

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

/* GET → is card payment set up? (the order page shows the button only if it is) */
export const onRequestGet = ({ env }) => json({
  enabled: !!(env.TRANSAK_API_KEY && env.TRANSAK_API_SECRET && env.FIREBASE_SA),
  test: String(env.TRANSAK_ENV || "staging").trim() !== "production",
});

export async function onRequestPost({ request, env }) {
  try {
    if (!env.TRANSAK_API_KEY || !env.TRANSAK_API_SECRET || !env.FIREBASE_SA)
      return json({ ok: false, message: "Card payments aren't set up yet." });
    const { orderId } = await request.json().catch(() => ({}));
    if (!/^[A-Za-z0-9]{10,40}$/.test(String(orderId || ""))) return json({ ok: false, message: "Bad order id." }, 400);

    const fs = await firestore(env);
    const doc = await fs.get(`orders/${orderId}`);
    if (!doc) return json({ ok: false, message: "Order not found." });
    const o = doc.data;
    if (o.status !== "awaiting_payment" || o.payMethod !== "usdt_bep20")
      return json({ ok: false, message: "This order isn't waiting for payment." });

    const prod = String(env.TRANSAK_ENV || "staging").trim() === "production";
    const token = await transakToken(env, fs, prod);
    const site = new URL(request.url);
    const widgetParams = {
      apiKey: env.TRANSAK_API_KEY,
      referrerDomain: site.hostname,
      productsAvailed: "BUY",
      cryptoCurrencyCode: "USDT",
      network: "bsc",
      walletAddress: NX_CONFIG.WALLETS.usdt_bep20,          // always OUR wallet — never from the browser
      disableWalletAddressForm: true,
      cryptoAmount: Number(o.cryptoAmount),
      fiatCurrency: "USD",
      partnerOrderId: orderId,
      partnerCustomerId: o.uid,
      email: o.buyerEmail || undefined,
      redirectURL: `${site.origin}/order.html?id=${orderId}`,
      hideMenu: true,
    };
    const r = await fetch(`https://api-gateway${prod ? "" : "-stg"}.transak.com/api/v2/auth/session`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": env.TRANSAK_API_KEY, "access-token": token,
                 "x-user-ip": request.headers.get("CF-Connecting-IP") || "" },
      body: JSON.stringify({ widgetParams }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.data || !j.data.widgetUrl) {
      console.error("transak session", r.status, JSON.stringify(j));
      if (r.status === 401) await fs.patch({ name: fs.name("private/transak") }, { token: "", exp: 0 }).catch(() => {});
      return json({ ok: false, message: "Card payment is unavailable right now — please pay with crypto or try again later.", detail: (j.error && j.error.message) || r.status });
    }
    return json({ ok: true, url: j.data.widgetUrl });
  } catch (e) {
    console.error(e && e.stack || e);
    return json({ ok: false, message: "Card payment is unavailable right now — please try again." });
  }
}

/* Transak access token lasts 7 days — keep it in Firestore (private/transak, no client access) */
async function transakToken(env, fs, prod) {
  const saved = await fs.get("private/transak").catch(() => null);
  const envName = prod ? "production" : "staging";
  if (saved && saved.data.token && saved.data.env === envName && saved.data.key === env.TRANSAK_API_KEY
      && saved.data.exp > Date.now() + 3600e3) return saved.data.token;
  const r = await fetch(`https://api${prod ? "" : "-stg"}.transak.com/partners/api/v2/refresh-token`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": env.TRANSAK_API_KEY, "api-secret": env.TRANSAK_API_SECRET },
    body: JSON.stringify({ apiKey: env.TRANSAK_API_KEY }),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.data || !j.data.accessToken) throw new Error("transak token: " + r.status + " " + JSON.stringify(j));
  const exp = j.data.expiresAt ? j.data.expiresAt * 1000 : Date.now() + 6 * 864e5;
  const rec = { token: j.data.accessToken, exp, env: envName, key: env.TRANSAK_API_KEY };
  if (saved) await fs.patch(saved, rec).catch(e => console.error(e));
  else await fs.commit([{ update: { name: fs.name("private/transak"), fields: encSimple(rec) } }]).catch(e => console.error(e));
  return j.data.accessToken;
}
function encSimple(o) {
  const f = {};
  for (const [k, v] of Object.entries(o)) f[k] = typeof v === "number" ? { integerValue: String(Math.round(v)) } : { stringValue: String(v) };
  return f;
}
