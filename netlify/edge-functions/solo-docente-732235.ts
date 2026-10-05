import type { Config, Context } from "@netlify/edge-functions";

// Solo docente: protege la zona docente del repositorio 732235 (guías y solucionarios) con la clave ADMIN_KEY.
// Al escribir la clave correcta se guarda una cookie HttpOnly por 180 días en ese navegador.
// Salir: /logistica/repositorio-732235/docente/salir

const COOKIE = "logilab_docente_732235";
const BASE = "/logistica/repositorio-732235/docente";

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const clave = Netlify.env.get("ADMIN_KEY");
  if (!clave) return pagina("Falta configurar la clave de docente (ADMIN_KEY) en Netlify.", 503);

  const token = await sha256("logilab-732235-docente:" + clave);

  if (url.pathname === BASE + "/salir") {
    return new Response(null, { status: 303, headers: { location: BASE + "/", "set-cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } });
  }

  if (url.pathname === BASE + "/entrar" && req.method === "POST") {
    const form = await req.formData().catch(() => null);
    const escrita = String(form?.get("clave") ?? "");
    const volver = seguro(String(form?.get("volver") ?? BASE + "/"));
    if (escrita && (await sha256("logilab-732235-docente:" + escrita)) === token) {
      return new Response(null, {
        status: 303,
        headers: { location: volver, "set-cookie": `${COOKIE}=${token}; Path=/; Max-Age=15552000; HttpOnly; Secure; SameSite=Lax` },
      });
    }
    return pagina("Clave incorrecta. Inténtalo de nuevo.", 401, volver);
  }

  if (leerCookie(req, COOKIE) === token) {
    const res = await context.next();
    const h = new Headers(res.headers);
    h.set("cache-control", "private, no-store");
    h.set("x-robots-tag", "noindex");
    return new Response(res.body, { status: res.status, headers: h });
  }

  return pagina("", 401, seguro(url.pathname + url.search));
};

function seguro(p: string) {
  return p.startsWith(BASE) && !p.startsWith("//") ? p : BASE + "/";
}

function leerCookie(req: Request, nombre: string) {
  const c = req.headers.get("cookie") ?? "";
  for (const parte of c.split(";")) {
    const [k, ...v] = parte.trim().split("=");
    if (k === nombre) return v.join("=");
  }
  return "";
}

async function sha256(t: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function pagina(error: string, status: number, volver = BASE + "/") {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Solo docente · Repositorio 732235</title>
<style>
:root{--bg:#F5F6FA;--surface:#FFFFFF;--fg:#141A2E;--muted:#5A6380;--line:#D5DAE8;--blue:#0B2545;--red:#D99A0B;--on-blue:#FFFFFF}
@media (prefers-color-scheme: dark){:root{--bg:#0E1220;--surface:#161B2E;--fg:#E6E9F4;--muted:#9AA3C2;--line:#2C3555;--blue:#F0B437;--red:#F0B437;--on-blue:#0A1220;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--fg);font:16px/1.5 "Segoe UI",system-ui,sans-serif;padding-inline:16px}
form{width:min(100%,380px);background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:22px;display:flex;flex-direction:column;gap:12px}
.stripe{height:8px;border-radius:4px;background:repeating-linear-gradient(-45deg,var(--red) 0 12px,var(--blue) 12px 24px)}
h1{margin:0;font:800 26px Georgia,serif}p{margin:0;color:var(--muted)}
input{font:inherit;font-size:16px;padding:11px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--fg)}
button{font:inherit;font-size:16px;font-weight:600;padding:11px;border-radius:8px;border:none;background:var(--blue);color:var(--on-blue);cursor:pointer}
input:focus-visible,button:focus-visible{outline:3px solid var(--red);outline-offset:2px}
.err{color:var(--red);font-weight:600}a{color:var(--blue);font-size:14px}
</style></head><body>
<form method="post" action="${BASE}/entrar">
<div class="stripe"></div>
<h1>🔒 Solo docente</h1>
<p>Guías docentes y solucionarios de Unitarización y Embalaje de la Carga. Escribe la clave de docente de LogiLab.</p>
${error ? `<p class="err" role="alert">${esc(error)}</p>` : ""}
<input type="password" name="clave" id="clave" autocomplete="current-password" placeholder="Clave de docente" aria-label="Clave de docente" required autofocus>
<input type="hidden" name="volver" value="${esc(volver)}">
<button type="submit">Entrar</button>
<a href="/logistica/repositorio-732235/">← Volver al repositorio</a>
</form></body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
}

export const config: Config = {
  path: ["/logistica/repositorio-732235/docente", "/logistica/repositorio-732235/docente/*"],
};
