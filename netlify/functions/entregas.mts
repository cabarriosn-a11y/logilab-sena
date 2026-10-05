import type { Context, Config } from "@netlify/functions";
import { getStore, getDeployStore } from "@netlify/blobs";

// Entregables de sesión — Unitarización y Embalaje de la Carga (Uniguajira 732235, Corte 2).
// Actividades (las que terminan en -TICKET son individuales; las demás, por equipo):
//   S0-RUTA   La ruta del pallet (por equipo)      clave: S0-RUTA/<grupo>-e<equipo>
//   S0-TICKET Autodiagnóstico + ticket (individual) clave: S0-TICKET/<grupo>-<codigo>
//   S0-E0     Ficha técnica del producto (equipo)   clave: S0-E0/<grupo>-e<equipo>
//   S2-LAB    Laboratorio de manutención (equipo)   clave: S2-LAB/<grupo>-e<equipo>
//   S2-TICKET Ticket de salida del laboratorio      clave: S2-TICKET/<grupo>-<codigo>
// Un reenvío reemplaza el anterior (se conserva el contador de envíos).
// POST   /api/entregas                 -> guarda una entrega
// GET    /api/entregas[?act=S0-RUTA | ?sesion=S0] -> lista (header x-clave-instructor = ADMIN_KEY)
// PATCH  /api/entregas?key=...         -> califica (docente): { criterios, nota, comentario } o { borrar: true }
// DELETE /api/entregas?key=...         -> elimina (docente)
// Si el estudiante reenvía después de calificado, la nota se conserva y queda marcada para revisar (reenvio: true).

const ACTIVIDADES = ["S0-RUTA", "S0-TICKET", "S0-E0", "S2-LAB", "S2-TICKET"];
const individual = (act: string) => act.endsWith("-TICKET");
const GRUPOS = ["A1", "B1"];
const MAX_EQUIPO = 7;

type Entrega = {
  key: string; act: string; grupo: string; equipo: number; nombre: string; codigo: string;
  producto: string; integrantes: string[]; datos: Record<string, unknown>;
  creado: string; actualizado: string; envios: number;
  calificacion?: Calificacion;
};
type Calificacion = { criterios: Record<string, number>; nota: number; comentario: string; fecha: string; reenvio: boolean };
const KEY_RE = /^S\d{1,2}-[A-Z0-9]{2,8}\/(A1|B1)-[0-9A-Za-z-]+$/;
const keyValida = (k: string) => KEY_RE.test(k) && ACTIVIDADES.includes(k.split("/")[0]);
const nota05 = (v: unknown) => { const n = Math.round(Number(v) * 10) / 10; return Number.isFinite(n) && n >= 0 && n <= 5 ? n : null; };

function store() {
  const prod = Netlify.context?.deploy?.context === "production";
  return prod
    ? getStore({ name: "unitarizacion-entregas", consistency: "strong" })
    : getDeployStore({ name: "unitarizacion-entregas", consistency: "strong" });
}

const txt = (v: unknown, max = 120) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

const esInstructor = (req: Request) => {
  const clave = Netlify.env.get("ADMIN_KEY");
  return !!clave && req.headers.get("x-clave-instructor") === clave;
};

// Limpia los datos libres: solo texto, números o listas cortas de texto; tamaño acotado.
function limpiar(v: unknown, prof = 0): unknown {
  if (prof > 3) return null;
  if (typeof v === "string") return v.replace(/\r/g, "").trim().slice(0, 1500);
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.slice(0, 20).map((x) => limpiar(x, prof + 1));
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v).slice(0, 40)) o[txt(k, 40)] = limpiar(x, prof + 1);
    return o;
  }
  return null;
}

export default async (req: Request, _context: Context) => {
  try {
    const s = store();

    if (req.method === "POST") {
      let b: any;
      try { b = await req.json(); } catch { return json({ error: "Datos inválidos." }, 400); }
      const act = txt(b.act, 12).toUpperCase();
      const grupo = txt(b.grupo, 4).toUpperCase();
      const equipo = Math.trunc(Number(b.equipo));
      const nombre = txt(b.nombre, 80);
      const codigo = txt(b.codigo, 20).replace(/[^0-9A-Za-z-]/g, "");
      if (!ACTIVIDADES.includes(act)) return json({ error: "Actividad no válida." }, 400);
      if (!GRUPOS.includes(grupo)) return json({ error: "Selecciona el grupo: A1 o B1." }, 400);
      if (!(equipo >= 1 && equipo <= MAX_EQUIPO)) return json({ error: `El número de equipo debe estar entre 1 y ${MAX_EQUIPO}.` }, 400);
      if (!nombre) return json({ error: "Escribe tu nombre completo." }, 400);
      if (individual(act) && codigo.length < 4) return json({ error: "Escribe tu código estudiantil." }, 400);

      const datos = limpiar(b.datos) as Record<string, unknown>;
      if (!datos || typeof datos !== "object" || Array.isArray(datos)) return json({ error: "Faltan las respuestas." }, 400);
      if (JSON.stringify(datos).length > 40000) return json({ error: "La entrega es demasiado larga." }, 413);

      const key = individual(act) ? `${act}/${grupo}-${codigo}` : `${act}/${grupo}-e${equipo}`;
      const previa = (await s.get(key, { type: "json" })) as Entrega | null;
      const ahora = new Date().toISOString();
      const e: Entrega = {
        key, act, grupo, equipo, nombre, codigo,
        producto: txt(b.producto, 80),
        integrantes: (Array.isArray(b.integrantes) ? b.integrantes : []).map((x: unknown) => txt(x, 80)).filter(Boolean).slice(0, 10),
        datos,
        creado: previa?.creado || ahora, actualizado: ahora, envios: (previa?.envios || 0) + 1,
      };
      if (previa?.calificacion) e.calificacion = { ...previa.calificacion, reenvio: true };
      await s.setJSON(key, e);
      return json({ ok: true, key, envios: e.envios, actualizado: ahora, reemplazo: !!previa }, previa ? 200 : 201);
    }

    if (req.method === "GET") {
      if (!esInstructor(req)) return json({ error: "Clave de docente incorrecta." }, 403);
      const q = new URL(req.url).searchParams;
      const act = txt(q.get("act"), 12).toUpperCase();
      const sesion = txt(q.get("sesion"), 4).toUpperCase();
      const prefix = ACTIVIDADES.includes(act) ? `${act}/` : /^S\d{1,2}$/.test(sesion) ? `${sesion}-` : undefined;
      const { blobs } = await s.list(prefix ? { prefix } : undefined);
      const items = (await Promise.all(blobs.map((x) => s.get(x.key, { type: "json" })))).filter(Boolean) as Entrega[];
      items.sort((a, b) => a.act.localeCompare(b.act) || a.grupo.localeCompare(b.grupo) || a.equipo - b.equipo || a.nombre.localeCompare(b.nombre));
      return json({ entregas: items });
    }

    if (req.method === "PATCH") {
      if (!esInstructor(req)) return json({ error: "Clave de docente incorrecta." }, 403);
      const key = new URL(req.url).searchParams.get("key") || "";
      if (!keyValida(key)) return json({ error: "Registro no válido." }, 400);
      let b: any;
      try { b = await req.json(); } catch { return json({ error: "Datos inválidos." }, 400); }
      const actual = (await s.get(key, { type: "json" })) as Entrega | null;
      if (!actual) return json({ error: "La entrega ya no existe." }, 404);
      if (b.borrar) { delete actual.calificacion; await s.setJSON(key, actual); return json({ ok: true, entrega: actual }); }
      const nota = nota05(b.nota);
      if (nota === null) return json({ error: "La nota debe estar entre 0,0 y 5,0." }, 400);
      const criterios: Record<string, number> = {};
      for (const [k, v] of Object.entries(b.criterios && typeof b.criterios === "object" ? b.criterios : {}).slice(0, 10)) {
        const n = nota05(v); if (n !== null) criterios[txt(k, 60)] = n;
      }
      actual.calificacion = { criterios, nota, comentario: String(b.comentario ?? "").trim().slice(0, 1500), fecha: new Date().toISOString(), reenvio: false };
      await s.setJSON(key, actual);
      return json({ ok: true, entrega: actual });
    }

    if (req.method === "DELETE") {
      if (!esInstructor(req)) return json({ error: "Clave de docente incorrecta." }, 403);
      const key = new URL(req.url).searchParams.get("key") || "";
      if (!keyValida(key)) return json({ error: "Registro no válido." }, 400);
      await s.delete(key);
      return json({ ok: true });
    }

    return json({ error: "Método no permitido." }, 405);
  } catch (err) {
    console.error(err);
    return json({ error: "Error del servidor. Usa los botones de respaldo (WhatsApp, correo o archivo)." }, 500);
  }
};

export const config: Config = { path: "/api/entregas" };
