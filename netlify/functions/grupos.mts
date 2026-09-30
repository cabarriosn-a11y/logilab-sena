import type { Context, Config } from "@netlify/functions";
import { getStore, getDeployStore } from "@netlify/blobs";

// Repositorio de grupos de carga (Unitarización y embalaje de la carga).
// GET    /api/grupos            -> lista de grupos
// POST   /api/grupos            -> registra un grupo (valida número y carga repetidos por curso)
// DELETE /api/grupos?id=...     -> elimina un grupo (requiere header x-clave-instructor = ADMIN_KEY)

type Grupo = {
  id: string;
  curso: string;
  numero: number;
  carga: string;
  cargaOtra: string;
  descripcion: string;
  jefe: string;
  calculista: string;
  operarios: string[];
  creado: string;
};

function store() {
  const opts = { name: "grupos-carga", consistency: "strong" as const };
  return Netlify.context?.deploy?.context === "production" ? getStore(opts) : getDeployStore(opts);
}

const txt = (v: unknown, max = 120) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const norm = (s: string) => s.trim().toLowerCase();
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

async function listar(): Promise<Grupo[]> {
  const s = store();
  const { blobs } = await s.list();
  const items = await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })));
  return (items.filter(Boolean) as Grupo[]).sort(
    (a, b) => a.curso.localeCompare(b.curso) || a.numero - b.numero
  );
}

export default async (req: Request, context: Context) => {
  try {
    if (req.method === "GET") {
      const clave = Netlify.env.get("ADMIN_KEY");
      const enviada = req.headers.get("x-clave-instructor");
      const instructor = !!clave && !!enviada && enviada === clave;
      return json({ grupos: await listar(), instructor });
    }

    if (req.method === "POST") {
      let body: any;
      try { body = await req.json(); } catch { return json({ error: "Datos inválidos." }, 400); }
      const g: Grupo = {
        id: crypto.randomUUID(),
        curso: txt(body.curso, 80),
        numero: Math.trunc(Number(body.numero)),
        carga: txt(body.carga, 80),
        cargaOtra: txt(body.cargaOtra, 80),
        descripcion: txt(body.descripcion, 500),
        jefe: txt(body.jefe),
        calculista: txt(body.calculista),
        operarios: (Array.isArray(body.operarios) ? body.operarios : []).map((x: unknown) => txt(x)).filter(Boolean).slice(0, 12),
        creado: new Date().toISOString(),
      };
      if (!g.curso) return json({ error: "Escribe el curso o ficha." }, 400);
      if (!Number.isFinite(g.numero) || g.numero < 1 || g.numero > 99) return json({ error: "El número de grupo debe estar entre 1 y 99." }, 400);
      if (!g.carga) return json({ error: "Selecciona el tipo de carga." }, 400);
      if (g.carga === "Otra" && !g.cargaOtra) return json({ error: "Escribe cuál es la otra carga." }, 400);
      if (!g.jefe || !g.calculista || !g.operarios.length) return json({ error: "Completa los tres roles: jefe, calculista y al menos un operario." }, 400);

      const mismos = (await listar()).filter((x) => norm(x.curso) === norm(g.curso));
      if (mismos.some((x) => x.numero === g.numero)) return json({ error: `El grupo ${g.numero} ya existe en ${g.curso}. Usa otro número.` }, 409);
      if (g.carga !== "Otra" && mismos.some((x) => x.carga === g.carga)) return json({ error: `La carga “${g.carga}” ya la tomó otro grupo de este curso. Escoge otra.` }, 409);

      await store().setJSON(g.id, g);
      return json({ grupo: g }, 201);
    }

    if (req.method === "DELETE") {
      const clave = Netlify.env.get("ADMIN_KEY");
      if (!clave || req.headers.get("x-clave-instructor") !== clave) return json({ error: "Clave de instructor incorrecta." }, 403);
      const id = new URL(req.url).searchParams.get("id") || "";
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Grupo no válido." }, 400);
      await store().delete(id);
      return json({ ok: true });
    }

    return json({ error: "Método no permitido." }, 405);
  } catch (e) {
    console.error(e);
    return json({ error: "Error del servidor. Intenta de nuevo." }, 500);
  }
};

export const config: Config = { path: "/api/grupos" };
