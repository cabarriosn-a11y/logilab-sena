# LogiLab SENA

Herramientas interactivas de logística para aprendices del SENA La Guajira.
**By Carlos Barrios · Instructor**

Sitio publicado: https://logilab-sena.netlify.app

## Herramientas
| Área | Herramienta | Ruta |
|---|---|---|
| Logística (SENA) | Plan Maestro Riohacha · Sesión 1 | `/logistica/s1-plan-maestro-riohacha/` |
| Logística (Uniguajira) | Repositorio del curso 732235 | `/logistica/repositorio-732235/` |
| Logística (Uniguajira) | Laboratorio de manutención S2 | `/logistica/s2-laboratorio-manutencion/` |
| Logística (Uniguajira) | La ruta del pallet: entregables S0 | `/logistica/s0-ruta-del-pallet/` |
| Logística (Uniguajira) | Selección de carga por equipos A1 · B1 | `/logistica/grupos-carga/` |

## Cómo está organizado
- `index.html`: portal con el catálogo de herramientas.
- Una carpeta por herramienta dentro de su área (`logistica/…`).
- `netlify/functions/grupos.mts`: API `/api/grupos` que guarda los grupos de carga en Netlify Blobs.
- `netlify/functions/entregas.mts`: API `/api/entregas` que guarda los entregables de sesión (S0, S2) en Netlify Blobs; el docente los consulta con `ADMIN_KEY`.

Cada push a `main` se publica automáticamente en Netlify.
