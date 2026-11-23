// AIson Morning Brief — unsubscribe + Resend webhook worker (Route B).
//
// The subscriber list of record lives in Beehiiv. This worker keeps it
// that way when mail is sent through Resend:
//   GET  /u?e=<email>&t=<hmac>   -> confirmation page (mail scanners
//                                   prefetch GET, so GET never unsubscribes)
//   POST /u (form e,t)           -> unsubscribe in Beehiiv
//   POST /u (List-Unsubscribe=One-Click body, e,t in query) -> same
//   POST /webhook/resend         -> email.bounced / email.complained also
//                                   unsubscribe in Beehiiv (Svix signature
//                                   verified when RESEND_WEBHOOK_SECRET set)
//
// Beehiiv call: PUT /v2/publications/{pub}/subscriptions/by_email/{email}
// with {"unsubscribe": true}; a 404 counts as success (already gone).
//
// Env: BEEHIIV_API_KEY, BEEHIIV_PUBLICATION_ID, UNSUB_SECRET,
//      RESEND_WEBHOOK_SECRET (optional)

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function tokenOk(env, email, token) {
  if (!email || !token) return false;
  const expected = await hmacHex(env.UNSUB_SECRET, email.toLowerCase());
  return timingSafeEqual(expected, token.toLowerCase());
}

async function beehiivUnsubscribe(env, email) {
  const url =
    "https://api.beehiiv.com/v2/publications/" +
    encodeURIComponent(env.BEEHIIV_PUBLICATION_ID) +
    "/subscriptions/by_email/" +
    encodeURIComponent(email);
  const resp = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${env.BEEHIIV_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ unsubscribe: true }),
  });
  return resp.status === 404 || resp.ok;
}

function page(title, body) {
  return new Response(
    `<!DOCTYPE html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}｜AIson</title><body style="margin:0;background:#f4f1ea;font-family:-apple-system,'PingFang HK','Microsoft JhengHei',sans-serif;display:grid;place-items:center;min-height:100vh"><main style="background:#fff;border:1px solid #e3e8ef;border-radius:18px;padding:34px;max-width:420px;margin:16px;text-align:center"><div style="color:#c1912a;font-size:12px;font-weight:900;letter-spacing:.14em">AISON MORNING BRIEF</div>${body}</main></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

async function handleUnsubscribe(request, env) {
  const url = new URL(request.url);
  let email = url.searchParams.get("e") || "";
  let token = url.searchParams.get("t") || "";
  if (request.method === "POST") {
    const form = await request.formData().catch(() => null);
    if (form) {
      email = form.get("e") || email;
      token = form.get("t") || token;
    }
  }
  if (!(await tokenOk(env, email, token))) {
    return page("連結無效", `<h1 style="color:#0b2345;font-size:21px">連結無效或已過期</h1><p style="color:#42506a;line-height:1.7">請用最新一封 Morning Brief 入面嘅退訂連結，或者去 <a href="https://aison.hk">aison.hk</a> 聯絡我哋。</p>`);
  }
  if (request.method === "GET") {
    return page(
      "確認退訂",
      `<h1 style="color:#0b2345;font-size:21px">退訂 Morning Brief？</h1><p style="color:#42506a;line-height:1.7">${email} 將唔會再收到每日電郵。</p><form method="POST" action="/u"><input type="hidden" name="e" value="${email}"><input type="hidden" name="t" value="${token}"><button type="submit" style="background:#f2a900;color:#081426;font-weight:900;border:0;padding:12px 26px;border-radius:999px;font-size:15px;cursor:pointer">確認退訂</button></form>`
    );
  }
  const ok = await beehiivUnsubscribe(env, email);
  return ok
    ? page("已退訂", `<h1 style="color:#0b2345;font-size:21px">已退訂 ✓</h1><p style="color:#42506a;line-height:1.7">${email} 已由 Morning Brief 名單移除。隨時可以喺 <a href="https://aison.hk">aison.hk</a> 重新訂閱。</p>`)
    : page("出咗問題", `<h1 style="color:#0b2345;font-size:21px">暫時處理唔到</h1><p style="color:#42506a;line-height:1.7">請遲啲再試，或者直接回覆任何一封 Morning Brief 話我哋知。</p>`);
}

async function verifySvix(request, secret, bodyText) {
  const id = request.headers.get("svix-id");
  const ts = request.headers.get("svix-timestamp");
  const sigHeader = request.headers.get("svix-signature");
  if (!id || !ts || !sigHeader) return false;
  const secretBytes = Uint8Array.from(atob(secret.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${bodyText}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(signed)));
  return sigHeader.split(" ").some((part) => part.startsWith("v1,") && timingSafeEqual(part.slice(3), expected));
}

async function handleResendWebhook(request, env) {
  const bodyText = await request.text();
  if (env.RESEND_WEBHOOK_SECRET) {
    if (!(await verifySvix(request, env.RESEND_WEBHOOK_SECRET, bodyText))) {
      return new Response("bad signature", { status: 401 });
    }
  }
  let event;
  try {
    event = JSON.parse(bodyText);
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const type = event?.type || "";
  const to = event?.data?.to;
  const email = Array.isArray(to) ? to[0] : to;
  if ((type === "email.bounced" || type === "email.complained") && email) {
    await beehiivUnsubscribe(env, email);
  }
  return new Response("ok");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/u") return handleUnsubscribe(request, env);
    if (url.pathname === "/webhook/resend" && request.method === "POST") return handleResendWebhook(request, env);
    return new Response("AIson unsubscribe service", { status: 200 });
  },
};
