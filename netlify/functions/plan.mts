import type { Context, Config } from "@netlify/functions";
import { getStore, getDeployStore } from "@netlify/blobs";
import LZString from "lz-string";

// Calcula el sid (kind|dispositivo|ts) de una entrega a partir de su código LLPE,
// igual que lo hace la página del instructor, para poder honrar las eliminaciones (ev.del).
function sidOf(codigo: string): string | null {
  const m = /^LLPE\.([A-Z0-9]{1,5})\.([ZB])([0-9a-z]{6})\.(.+?)~?$/.exec(String(codigo || "").trim());
  if (!m) return null;
  const kind = m[1], fmt = m[2], body = m[4];
  let raw = "";
  try {
    if (fmt === "Z") raw = LZString.decompressFromEncodedURIComponent(body) || "";
    else raw = Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  } catch { return null; }
  let p: any;
  try { p = JSON.parse(raw); } catch { return null; }
  if (!p || typeof p !== "object") return null;
  const slug = (x: unknown) => String(x ?? "").toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
  const team = p.k || ("x-" + slug(p.q || p.e || ""));
  return kind + "|" + team + "|" + (p.ts || 0);
}

// Buzón del Taller Plan Estratégico Logístico (SENA, Gestión Logística, competencia 210101007).
// La página vive en GitHub Pages (cabarriosn-a11y.github.io/logilab-sesiones/logistica/taller-plan-estrategico/),
// por eso esta función responde con CORS a ese origen.
//
// POST /api/plan                 -> el equipo envía su código de entrega LLPE (sin clave).
//                                   body: { codigo, taller, equipo, empresa }  (content-type text/plain o json)
// GET  /api/plan                 -> (instructor) todas las entregas + evaluaciones guardadas.
// PUT  /api/plan                 -> (instructor) guarda evaluaciones: { ev: { <sid>: { j, cr, obs, at, del? } },
//                                   alias: { <equipo-dispositivo>: { to: <equipo destino> | "", at } } }
//                                   se combinan por `at` (gana la más reciente), así sirve desde varios dispositivos.
// Clave del instructor: header x-clave-instructor = ADMIN_KEY (variable de entorno de Netlify, la misma del panel docente).
//
// Cada entrega se guarda como un registro nuevo (nunca se sobrescribe); la zona instructor descarta repetidos.

const ORIGENES = ["https://cabarriosn-a11y.github.io", "https://logilab-sena.netlify.app"];
const CODE_RE = /^LLPE\.[A-Z0-9]{1,5}\.[ZB][0-9a-z]{6}\.[A-Za-z0-9+\-_$=.]+~$/;
const MAX_CODIGO = 120000;
const MAX_ENTREGAS = 4000;

function store() {
  const prod = Netlify.context?.deploy?.context === "production";
  return prod
    ? getStore({ name: "plan-estrategico", consistency: "strong" })
    : getDeployStore({ name: "plan-estrategico", consistency: "strong" });
}

const txt = (v: unknown, max = 120) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function cors(req: Request): Record<string, string> {
  const o = req.headers.get("origin") || "";
  return {
    "access-control-allow-origin": ORIGENES.includes(o) ? o : ORIGENES[0],
    "access-control-allow-methods": "GET, POST, PUT, OPTIONS",
    "access-control-allow-headers": "content-type, x-clave-instructor",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

// Se compara sin espacios ni mayúsculas: en el celular el autocorrector suele cambiarlas.
const normClave = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toLowerCase();
const esInstructor = (req: Request) => {
  const clave = Netlify.env.get("ADMIN_KEY");
  const dada = req.headers.get("x-clave-instructor") || "";
  return !!clave && !!dada && normClave(dada) === normClave(clave);
};

type Alias = { to: string; at: number };
type Ev = { j?: string; cr?: Record<string, boolean>; obs?: string; at?: number; del?: boolean };

function limpiarEv(v: any): Ev | null {
  if (!v || typeof v !== "object") return null;
  const at = Number(v.at);
  if (!Number.isFinite(at) || at <= 0) return null;
  if (v.del === true) return { del: true, at };
  const cr: Record<string, boolean> = {};
  for (const [k, x] of Object.entries(v.cr && typeof v.cr === "object" ? v.cr : {}).slice(0, 12)) cr[txt(k, 20)] = x === true;
  return { j: ["A", "D", ""].includes(v.j) ? v.j : "", cr, obs: String(v.obs ?? "").slice(0, 3000), at };
}

export default async (req: Request, _context: Context) => {
  const h = cors(req);
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...h, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });

  try {
    const s = store();

    if (req.method === "POST") {
      let b: any;
      try { b = JSON.parse(await req.text()); } catch { return json({ error: "Datos inválidos." }, 400); }
      const codigo = String(b?.codigo ?? "").trim();
      if (codigo.length > MAX_CODIGO) return json({ error: "El código es demasiado largo." }, 413);
      if (!CODE_RE.test(codigo)) return json({ error: "Código de entrega no válido." }, 400);
      const { blobs } = await s.list({ prefix: "e/" });
      if (blobs.length >= MAX_ENTREGAS) return json({ error: "El buzón está lleno. Envíe el código por WhatsApp o correo." }, 507);
      const ahora = new Date();
      const key = `e/${ahora.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
      await s.setJSON(key, {
        codigo, taller: txt(b.taller, 8), equipo: txt(b.equipo, 160), empresa: txt(b.empresa, 120), recibido: ahora.toISOString(),
      });
      return json({ ok: true, recibido: ahora.toISOString() }, 201);
    }

    if (req.method === "GET") {
      // Consulta pública de la propia nota: el equipo pide SOLO la evaluación de su(s) entrega(s)
      // por el sid exacto (kind|dispositivo|ts) que ya generó al enviar. No lista ni expone otras entregas,
      // y no requiere clave de instructor; solo devuelve juicio, criterios y observaciones de esos sid.
      const q = new URL(req.url).searchParams;
      const consulta = q.get("ev");
      const dev = q.get("dev");
      if (consulta || dev) {
        const todas = ((await s.get("evaluaciones", { type: "json" })) as Record<string, Ev> | null) || {};
        const ev: Record<string, Ev> = {};
        const limpia = (e: Ev) => ({ j: e.j || "", cr: e.cr || {}, obs: e.obs || "", at: e.at || 0 });
        if (consulta) {
          // por sid(s) exacto(s): kind|dispositivo|ts
          for (const id of consulta.split(",").map((x) => txt(x, 200)).filter(Boolean).slice(0, 20)) {
            const e = todas[id];
            if (e && !e.del) ev[id] = limpia(e);
          }
        }
        if (dev) {
          // todas las notas de UN dispositivo (el id va solo en ese aparato): sid = kind|<dev>|ts
          const tid = txt(dev, 40).replace(/\|/g, "");
          if (tid) for (const [sid, e] of Object.entries(todas)) {
            if (e && !e.del && sid.includes("|" + tid + "|")) ev[sid] = limpia(e);
          }
        }
        return json({ ev });
      }
      if (!esInstructor(req)) return json({ error: "Clave de instructor incorrecta." }, 403);
      const { blobs } = await s.list({ prefix: "e/" });
      const crudas = await Promise.all(blobs.map(async (x) => ({ key: x.key, v: (await s.get(x.key, { type: "json" })) as any })));
      const ev = ((await s.get("evaluaciones", { type: "json" })) as Record<string, Ev> | null) || {};
      const alias = ((await s.get("alias", { type: "json" })) as Record<string, Alias> | null) || {};
      // Honra las eliminaciones: una entrega marcada `del` en evaluaciones se oculta y se borra
      // su registro de forma permanente (antes `del` solo ocultaba y la entrega reaparecía en cada carga).
      const entregas: any[] = [];
      const muertas: string[] = [];
      for (const { key, v } of crudas) {
        if (!v) continue;
        const sid = v.codigo ? sidOf(v.codigo) : null;
        if (sid && ev[sid] && ev[sid].del) { muertas.push(key); continue; }
        entregas.push(v);
      }
      if (muertas.length) await Promise.all(muertas.map((k) => s.delete(k).catch(() => {})));
      return json({ entregas, ev, alias });
    }

    if (req.method === "PUT") {
      if (!esInstructor(req)) return json({ error: "Clave de instructor incorrecta." }, 403);
      let b: any;
      try { b = JSON.parse(await req.text()); } catch { return json({ error: "Datos inválidos." }, 400); }
      const nuevas = b?.ev && typeof b.ev === "object" ? b.ev : {};
      const actual = ((await s.get("evaluaciones", { type: "json" })) as Record<string, Ev> | null) || {};
      let cambios = 0;
      for (const [sid, v] of Object.entries(nuevas).slice(0, 3000)) {
        const id = txt(sid, 200);
        const e = limpiarEv(v);
        if (!id || !e) continue;
        if (!actual[id] || (actual[id].at || 0) < (e.at || 0)) { actual[id] = e; cambios++; }
      }
      if (cambios) await s.setJSON("evaluaciones", actual);
      // Uniones de equipo: entregas de un dispositivo (sin nombre) asignadas por el instructor a un equipo.
      let cambiosA = 0;
      const nuevasA = b?.alias && typeof b.alias === "object" ? b.alias : null;
      let alias = ((await s.get("alias", { type: "json" })) as Record<string, Alias> | null) || {};
      if (nuevasA) {
        for (const [k, v] of Object.entries(nuevasA).slice(0, 2000) as [string, any][]) {
          const id = txt(k, 120), at = Number(v?.at);
          if (!id || !Number.isFinite(at)) continue;
          const a: Alias = { to: txt(v?.to, 120), at };
          if (!alias[id] || (alias[id].at || 0) < at) { alias[id] = a; cambiosA++; }
        }
        if (cambiosA) await s.setJSON("alias", alias);
      }
      return json({ ok: true, cambios: cambios + cambiosA, ev: actual, alias });
    }

    return json({ error: "Método no permitido." }, 405);
  } catch (err) {
    console.error(err);
    return json({ error: "Error del servidor. Envíe el código por WhatsApp o correo." }, 500);
  }
};

export const config: Config = { path: "/api/plan" };
