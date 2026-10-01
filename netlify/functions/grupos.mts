import type { Context, Config } from "@netlify/functions";
import { getStore, getDeployStore } from "@netlify/blobs";

// Selección de carga por equipos — Unitarización y Embalaje de la Carga (Uniguajira 732235, Corte 2).
// Reglas: grupos A1 y B1; cada equipo escoge un solo producto; dentro de un mismo grupo
// un producto no se repite (entre A1 y B1 sí se puede repetir); el número de equipo no se repite en el grupo.
// GET    /api/grupos          -> { grupos: Equipo[], instructor }
// POST   /api/grupos          -> registra un equipo
// DELETE /api/grupos?id=...   -> elimina (header x-clave-instructor = ADMIN_KEY)

const GRUPOS = ["A1", "B1"];
const PRODUCTOS: Record<number, string> = {
  1: "Café verde en sacos de 70 kg",
  2: "Banano en cajas de 18,14 kg",
  3: "Aguacate Hass en cajas de 4 kg",
  4: "Baldosas cerámicas en cajas",
  5: "Aceite de palma en tambores de 200 L",
  6: "Confitería en cajas corrugadas",
  7: "Sal marina de Manaure en sacos de 50 kg",
};
const MAX_EQUIPO = 7;

type Equipo = {
  id: string; grupo: string; equipo: number; producto: number; productoNombre: string;
  jefe: string; calculista: string; operarios: string[]; creado: string;
};

function stores() {
  const prod = Netlify.context?.deploy?.context === "production";
  const mk = (name: string) => (prod ? getStore({ name, consistency: "strong" }) : getDeployStore({ name, consistency: "strong" }));
  return { equipos: mk("unitarizacion-equipos"), locks: mk("unitarizacion-locks") };
}

const txt = (v: unknown, max = 120) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

async function listar(): Promise<Equipo[]> {
  const { equipos } = stores();
  const { blobs } = await equipos.list();
  const items = await Promise.all(blobs.map((b) => equipos.get(b.key, { type: "json" })));
  return (items.filter(Boolean) as Equipo[]).sort((a, b) => a.grupo.localeCompare(b.grupo) || a.equipo - b.equipo);
}

const esInstructor = (req: Request) => {
  const clave = Netlify.env.get("ADMIN_KEY");
  return !!clave && req.headers.get("x-clave-instructor") === clave;
};

export default async (req: Request, _context: Context) => {
  try {
    if (req.method === "GET") return json({ grupos: await listar(), instructor: esInstructor(req) });

    if (req.method === "POST") {
      let b: any;
      try { b = await req.json(); } catch { return json({ error: "Datos inválidos." }, 400); }
      const grupo = txt(b.grupo, 4).toUpperCase();
      const equipo = Math.trunc(Number(b.equipo));
      const producto = Math.trunc(Number(b.producto));
      const e: Equipo = {
        id: `${grupo}-p${producto}`, grupo, equipo, producto, productoNombre: PRODUCTOS[producto] || "",
        jefe: txt(b.jefe), calculista: txt(b.calculista),
        operarios: (Array.isArray(b.operarios) ? b.operarios : []).map((x: unknown) => txt(x)).filter(Boolean).slice(0, 10),
        creado: new Date().toISOString(),
      };
      if (!GRUPOS.includes(grupo)) return json({ error: "Selecciona el grupo: A1 o B1." }, 400);
      if (!(equipo >= 1 && equipo <= MAX_EQUIPO)) return json({ error: `El número de equipo debe estar entre 1 y ${MAX_EQUIPO}.` }, 400);
      if (!e.productoNombre) return json({ error: "Selecciona uno de los 7 productos." }, 400);
      if (!e.jefe || !e.calculista || !e.operarios.length) return json({ error: "Completa los tres roles: jefe, calculista y al menos un operario." }, 400);

      const { equipos, locks } = stores();
      const lockKey = `${grupo}-e${equipo}`;
      const lock = await locks.set(lockKey, e.id, { onlyIfNew: true });
      if (!lock.modified) return json({ error: `El equipo ${equipo} del grupo ${grupo} ya escogió producto.` }, 409);
      const res = await equipos.setJSON(e.id, e, { onlyIfNew: true });
      if (!res.modified) {
        await locks.delete(lockKey);
        return json({ error: `El producto “${e.productoNombre}” ya lo escogió otro equipo del grupo ${grupo}. Escoge otro.` }, 409);
      }
      return json({ grupo: e }, 201);
    }

    if (req.method === "DELETE") {
      if (!esInstructor(req)) return json({ error: "Clave de instructor incorrecta." }, 403);
      const id = new URL(req.url).searchParams.get("id") || "";
      if (!/^(A1|B1)-p[1-7]$/.test(id)) return json({ error: "Registro no válido." }, 400);
      const { equipos, locks } = stores();
      const actual = (await equipos.get(id, { type: "json" })) as Equipo | null;
      await equipos.delete(id);
      if (actual) await locks.delete(`${actual.grupo}-e${actual.equipo}`);
      return json({ ok: true });
    }

    return json({ error: "Método no permitido." }, 405);
  } catch (err) {
    console.error(err);
    return json({ error: "Error del servidor. Intenta de nuevo." }, 500);
  }
};

export const config: Config = { path: "/api/grupos" };
