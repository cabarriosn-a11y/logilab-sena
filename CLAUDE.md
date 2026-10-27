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
- `/logistica/s0-ruta-del-pallet/` (Uniguajira): entregables S0 por equipo e individuales en `/api/entregas` (Blobs `unitarizacion-entregas`), con calificación por rúbrica (PATCH, solo docente) y sábana de notas. Si un estudiante reenvía, la nota se conserva marcada `reenvio`. Cada reemplazo guarda la versión anterior en `historial` (5 últimas); un ticket con el código de otra persona se rechaza (409) y, con `v:2` en el envío, la entrega de equipo enviada por otra persona pide confirmación (`reemplazar:true`). Las páginas nuevas deben enviar `v:2` y traer el botón «Soy otro estudiante · empezar en limpio» (computadores compartidos).
- `/logistica/s2-laboratorio-manutencion/` (Uniguajira): hoja de laboratorio por equipo (`S2-LAB`) y ticket individual (`S2-TICKET`) en la misma API. Para una sesión nueva: agregar sus actividades a `ACTIVIDADES` en `entregas.mts` (las que terminan en `-TICKET` son individuales) y cargar el panel con `/api/entregas?sesion=SN`.
- `/logistica/repositorio-732235/` (Uniguajira): repositorio del curso. Materiales para estudiantes en `archivos/` y en el arreglo `SESIONES` de su `index.html` (la sesión más reciente primero; subir PDF además del .pptx/.docx para verlos en el celular). Guías docentes y solucionarios SOLO en `docente/archivos/` y en `docente/index.html`, protegidos por la edge function `netlify/edge-functions/solo-docente-732235.ts` (clave `ADMIN_KEY`, cookie propia). Nunca poner un solucionario fuera de `docente/`.
- `/logistica/s3-taller-qpm/` (Uniguajira): taller de Quick Pallet Maker individual (`S3-QPM`), taller avanzado de paletización multiproducto y contenerización individual (`S3-QPMA`, ejercicios 7–10 en `EJS2`, datos en `AV`, referencias en `revisionAv`) y ticket individual (`S3-TICKET`); los tres se guardan por código (lista `INDIVIDUALES` en `entregas.mts`) y la sábana los une por nombre o código, con las entregas antiguas por equipo (`…/A1-eN`) como respaldo para todo el equipo. Los ejercicios están en el arreglo `EJS` de la página; el panel docente calcula las referencias (patrón por capa, capas, peso, factor limitante) a partir de los datos. El panel cuenta los ✓ por ejercicio (`CUENTA`) y sugiere la nota de los criterios mapeados en `CRIT_EJ` (sin pisar notas guardadas). En la sábana, taller 1–6 y avanzado 7–10 son UNA sola nota de taller (60/40, `tallerUnico`), pesos guardados en `s3_pesos_u`. La ventana de calificar une las dos entregas del mismo estudiante (`parDe`: código, o nombre en el grupo): muestra 1–10 juntos y guarda con un PATCH por entrega (criterios con prefijo `L:`/`A:` en el formulario). Nunca borrar ni migrar entregas en Blobs para cambios de presentación.
- La S2 trae un ejercicio por producto (constante `EJ` en su página): las respuestas no van en el código; el panel docente las calcula a partir de los datos.
- `/logistica/cedi-logilab-3d/` (SENA y Uniguajira): simulador 3D de CEDI con Three.js r128 (cdnjs). Las guías de práctica están en el objeto `GUIDES` (S = SENA, U = Uniguajira) y los escenarios por defecto en `DEFAULT_CFG`. Las entregas no usan backend: WhatsApp, correo, copiar y descargar .txt; el borrador se guarda en `localStorage`.
- `/logistica/equipos-3d/` (SENA): visores 3D de equipos en piezas. Motor compartido en `motor-3d.js` (Three.js r128); cada equipo es `/logistica/equipos-3d/<equipo>/index.html` que carga `../motor-3d.js` y llama `LogiLab3D.mount({...parts})` con `portal:'../'`. Agregar cada equipo nuevo al arreglo `EQUIPOS` de `/logistica/equipos-3d/index.html` (cambiar de 'soon' a 'ok'). Escenario oscuro holográfico a propósito. Ver la librería de piezas en `biblioteca/`.
- `/logistica/patio-logilab/` (SENA): simulador de montacargas que usa `../equipos-3d/motor-3d.js` (`LogiLab3D.kit()`). Misiones en el objeto `MISSIONS`, reglas e incidentes en `RULES` (normas: OSHA 1910.178, ANSI/ITSDF B56.1, Res. 1401/2007, Decreto 1072/2015). Entrega: WhatsApp, correo, copiar y .txt.
- `/api/plan` (`netlify/functions/plan.mts`, Blobs `plan-estrategico`): buzón del Taller Plan Estratégico Logístico (SENA) que vive en GitHub Pages (`logilab-sesiones/logistica/taller-plan-estrategico/`). CORS solo para `cabarriosn-a11y.github.io` y este sitio. POST sin clave guarda códigos `LLPE…~` (un registro por envío, nunca se sobrescribe); GET y PUT (evaluaciones combinadas por `at`, `del:true` = entrega eliminada) piden `x-clave-instructor` = `ADMIN_KEY`.
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
