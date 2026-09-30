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
- Todo lo que entregan los aprendices debe tener respaldo: WhatsApp, correo, copiar al portapapeles y descargar archivo.
- Diseño claro/oscuro con tokens en `:root` y `prefers-color-scheme`.
- Clave de instructor para acciones de administración: variable de entorno `ADMIN_KEY` en Netlify (nunca en el código).

## Publicar una herramienta nueva
1. Crear `/<area>/<nombre>/index.html`.
2. Agregar la entrada en `HERRAMIENTAS` de `/index.html`.
3. Commit y push a `main`; Netlify publica en ~1 minuto.
