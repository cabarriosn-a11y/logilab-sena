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
- `/logistica/s2-laboratorio-manutencion/` (Uniguajira): hoja de laboratorio por equipo (`S2-LAB`) y ticket individual (`S2-TICKET`) en la misma API. Para una sesión nueva: agregar sus actividades a `ACTIVIDADES` en `entregas.mts` (las que terminan en `-TICKET` son individuales) y cargar el panel con `/api/entregas?sesion=SN`.
- `/logistica/repositorio-732235/` (Uniguajira): repositorio del curso. Materiales para estudiantes en `archivos/` y en el arreglo `SESIONES` de su `index.html` (la sesión más reciente primero; subir PDF además del .pptx/.docx para verlos en el celular). Guías docentes y solucionarios SOLO en `docente/archivos/` y en `docente/index.html`, protegidos por la edge function `netlify/edge-functions/solo-docente-732235.ts` (clave `ADMIN_KEY`, cookie propia). Nunca poner un solucionario fuera de `docente/`.
- `/logistica/s3-taller-qpm/` (Uniguajira): taller de Quick Pallet Maker por equipo (`S3-QPM`) y ticket individual (`S3-TICKET`). Los ejercicios están en el arreglo `EJS` de la página; el panel docente calcula las referencias (patrón por capa, capas, peso, factor limitante) a partir de los datos.
- La S2 trae un ejercicio por producto (constante `EJ` en su página): las respuestas no van en el código; el panel docente las calcula a partir de los datos.
- Todo lo que entregan los aprendices debe tener respaldo: WhatsApp, correo, copiar al portapapeles y descargar archivo.
- Diseño claro/oscuro con tokens en `:root` y `prefers-color-scheme`.
- Clave de instructor para acciones de administración: variable de entorno `ADMIN_KEY` en Netlify (nunca en el código).

## Curso de inglés americano (`/ingles/`, solo docente)
- Todo `/ingles/*` está protegido por la edge function `netlify/edge-functions/solo-docente.ts` con la clave `ADMIN_KEY` (cookie de 180 días; salir en `/ingles/salir`). Nunca publicar `ingles/` sin esa función.
- Un reto por día: `ingles/datos/dia-NN.json` (mismo esquema que `dia-04.json`) → `python3 ingles/tools/publicar_dia.py ingles/datos/dia-NN.json` genera `ingles/dia-NN/index.html` y reconstruye `ingles/dias.json`.
- Registro de lo enseñado: `ingles/datos/semilla.json` + `ingles/datos/dia-*.json`; no repetir palabras ni frases. Día 1 = 2026-09-29.
- Lo genera y publica cada mañana la tarea programada "Reto diario de inglés".

## Publicar una herramienta nueva
1. Crear `/<area>/<nombre>/index.html`.
2. Agregar la entrada en `HERRAMIENTAS` de `/index.html`.
3. Commit y push a `main`; Netlify publica en ~1 minuto.
