# LogiLab SENA

Herramientas interactivas de logística para aprendices del SENA La Guajira.
**By Carlos Barrios · Instructor**

Sitio publicado: https://logilab-sena.netlify.app

## Herramientas
| Área | Herramienta | Ruta |
|---|---|---|
| Logística (Uniguajira) | Selección de carga por equipos A1 · B1 | `/logistica/grupos-carga/` |

## Cómo está organizado
- `index.html`: portal con el catálogo de herramientas.
- Una carpeta por herramienta dentro de su área (`logistica/…`).
- `netlify/functions/grupos.mts`: API `/api/grupos` que guarda los grupos de carga en Netlify Blobs.

Cada push a `main` se publica automáticamente en Netlify.
