# LogiLab SENA — reglas del repositorio

Sitio: https://logilab-sena.netlify.app (Netlify, proyecto `logilab-sena`, se publica solo con cada push a `main`).
Autor: Carlos Barrios · Instructor SENA (Centro Industrial y de Energías Alternativas, Regional Guajira).

## Estructura
- `/index.html` — portal. El catálogo está en el arreglo `HERRAMIENTAS` del script: cada herramienta nueva se agrega ahí (la más reciente primero dentro de su área).
- `/<area>/<nombre-en-minusculas-con-guiones>/index.html` — una carpeta por herramienta. Áreas actuales: `logistica/`.
- `/netlify/functions/` — funciones de servidor (TypeScript `.mts`). Datos en Netlify Blobs (`getStore` en producción, `getDeployStore` en previews).

## Convenciones
- HTML autocontenido, sin build; librerías solo por CDN con versión fija.
- Marca: verde SENA `#39A900`, pie "By Carlos Barrios · Instructor", enlace de regreso al portal (`/`).
  - Excepción: herramientas para la Universidad de La Guajira usan azul marino `#0B2545` con dorado y pie "By Carlos Barrios · Docente" (como sus diapositivas del curso).
- `/logistica/grupos-carga/` es para Uniguajira (Unitarización y Embalaje de la Carga 732235, Corte 2): grupos A1 y B1, 7 productos del expediente, un producto por equipo, sin repetir producto dentro del grupo (entre A1 y B1 sí). La API `/api/grupos` garantiza esas reglas con escrituras `onlyIfNew` en Blobs.
- `/logistica/s0-ruta-del-pallet/` (Uniguajira): entregables S0 por equipo e individuales en `/api/entregas` (Blobs `unitarizacion-entregas`), con calificación por rúbrica (PATCH, solo docente) y sábana de notas. Si un estudiante reenvía, la nota se conserva marcada `reenvio`.
- Todo lo que entregan los aprendices debe tener respaldo: WhatsApp, correo, copiar al portapapeles y descargar archivo.
- Diseño claro/oscuro con tokens en `:root` y `prefers-color-scheme`.
- Clave de instructor para acciones de administración: variable de entorno `ADMIN_KEY` en Netlify (nunca en el código).

## Publicar una herramienta nueva
1. Crear `/<area>/<nombre>/index.html`.
2. Agregar la entrada en `HERRAMIENTAS` de `/index.html`.
3. Commit y push a `main`; Netlify publica en ~1 minuto.
