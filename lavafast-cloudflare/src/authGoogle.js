// Validacao de ID tokens Google em Cloudflare Workers, sem pacotes NPM.
// Origem das chaves fixada (nao controlavel por cabecalhos JWT).
// Google OIDC: https://developers.google.com/identity/openid-connect/openid-connect
const GOOGLE_JWKS = "https://www.googleapis.com/oauth2/v3/certs";
let cache = { keys: null, ate: 0 };

function base64UrlBytes(input) {
  if (!/^[a-zA-Z0-9_-]+$/.test(input) || input.length > 12000) {
    throw new Error("JWT malformado");
  }
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/")
    .padEnd(Math.ceil(input.length / 4) * 4, "=");
  const raw = atob(base64);
  return Uint8Array.from(raw, x => x.charCodeAt(0));
}

function jwtJson(input) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(base64UrlBytes(input));
  return JSON.parse(text);
}

async function buscarChaves(fetcher = fetch) {
  if (fetcher === fetch && cache.keys && cache.ate > Date.now()) return cache.keys;
  const response = await fetcher(GOOGLE_JWKS, {
    method: "GET",
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) throw new Error("Chaves Google indisponiveis");
  const jwks = await response.json();
  if (!Array.isArray(jwks.keys) || jwks.keys.length > 30) {
    throw new Error("JWKS Google invalido");
  }
  if (fetcher === fetch) {
    let ttl = Number(response.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1] ?? 300);
    if (!Number.isFinite(ttl)) ttl = 300;
    cache = { keys: jwks.keys, ate: Date.now() + Math.min(Math.max(ttl, 60), 3600) * 1000 };
  }
  return jwks.keys;
}

export async function verificarTokenGoogle(token, clientId, fetcher = fetch) {
  if (typeof token !== "string" || token.length > 12000 || token.length < 100 ||
      typeof clientId !== "string" || !clientId.endsWith(".apps.googleusercontent.com")) {
    throw new Error("Token Google nao configurado");
  }
  const partes = token.split(".");
  if (partes.length !== 3) throw new Error("JWT malformado");
  const [cabecalho, corpo, assinatura] = partes;
  const head = jwtJson(cabecalho);
  if (!head || head.alg !== "RS256" || typeof head.kid !== "string" ||
      head.kid.length > 250 || !/^[\w.-]+$/.test(head.kid) ||
      (head.typ && head.typ !== "JWT")) {
    throw new Error("Algoritmo ou cabecalho JWT invalido");
  }

  const chaves = await buscarChaves(fetcher);
  const jwk = chaves.find(key => key.kid === head.kid && key.kty === "RSA" &&
    (!key.alg || key.alg === "RS256") && (!key.use || key.use === "sig"));
  if (!jwk) throw new Error("Chave Google nao encontrada");
  const publicKey = await crypto.subtle.importKey("jwk", jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const assinou = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5", publicKey, base64UrlBytes(assinatura),
    new TextEncoder().encode(cabecalho + "." + corpo)
  );
  if (!assinou) throw new Error("Assinatura JWT invalida");

  const claims = jwtJson(corpo);
  const agora = Math.floor(Date.now() / 1000);
  const exp = Number(claims.exp), iat = Number(claims.iat);
  if (!["https://accounts.google.com","accounts.google.com"].includes(claims.iss) ||
      claims.aud !== clientId || (claims.azp && claims.azp !== clientId) ||
      !Number.isInteger(exp) || !Number.isInteger(iat) ||
      exp <= agora || exp > agora + 7200 || iat > agora + 60 ||
      iat < agora - 7200 || exp <= iat ||
      claims.email_verified !== true ||
      typeof claims.sub !== "string" || !/^[a-zA-Z0-9_-]{3,256}$/.test(claims.sub) ||
      typeof claims.email !== "string" || claims.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email)) {
    throw new Error("Claims de identidade invalidas");
  }
  const email = claims.email.trim().toLowerCase();
  // Para pre-autorizacao por email, Google e autoritativo em Gmail e
  // Workspace (hd igual ao dominio do email); o ID sub permanece a chave
  // imutavel apos o primeiro login.
  const domain = email.slice(email.lastIndexOf("@") + 1);
  const confiavel = domain === "gmail.com" || domain === "googlemail.com" ||
    (typeof claims.hd === "string" && claims.hd.toLowerCase() === domain);
  return {
    google_sub: claims.sub,
    email,
    nome: typeof claims.name === "string" ? claims.name.slice(0, 120) : "",
    email_autoritativo: confiavel
  };
}
