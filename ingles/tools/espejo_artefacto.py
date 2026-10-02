#!/usr/bin/env python3
"""Prepara el espejo del curso para publicarlo como un Artifact de claude.ai.

Uso:  python3 ingles/tools/espejo_artefacto.py SALIDA_DIR

Escribe SALIDA_DIR/portada.html (la portada sin doctype/head/body, como exige el Artifact)
y SALIDA_DIR/files.json: el mapa {ruta_publicada: ruta_local} para el parámetro `files`.
El espejo contiene TODO lo necesario para reconstruir la carpeta ingles/ (plantilla,
herramientas, datos de cada día), así sirve de respaldo cuando no se puede hacer push.
Restaurar: leer cada ruta publicada del artifact y guardarla en ingles/<ruta>,
excepto "fuente-index.html" (va a ingles/index.html), "plantilla.html" (va a ingles/_plantilla.html)
y "extra/solo-docente.ts" (va a netlify/edge-functions/solo-docente.ts: la clave de docente).
"""
import json, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]

def main(out):
    out = pathlib.Path(out); out.mkdir(parents=True, exist_ok=True)
    hub = (ROOT / "index.html").read_text(encoding="utf-8")
    for t in ['<!doctype html>\n', '<html lang="es">\n', '<head>\n', '</head>\n', '<body>\n', '</body>\n', '</html>\n']:
        hub = hub.replace(t, "")
    hub = re.sub(r'<meta charset="utf-8">\n<meta name="viewport"[^>]*>\n', "", hub)
    hub = re.sub(r"<title>.*?</title>", "<title>Inglés americano de Charly</title>", hub, count=1)
    (out / "portada.html").write_text(hub, encoding="utf-8")

    files = {"dias.json": "ingles/dias.json", "plantilla.html": "ingles/_plantilla.html", "fuente-index.html": "ingles/index.html"}
    for fp in sorted((ROOT / "datos").glob("*.json")):
        files[f"datos/{fp.name}"] = f"ingles/datos/{fp.name}"
    for fp in sorted(ROOT.glob("dia-*/index.html")):
        files[f"{fp.parent.name}/index.html"] = f"ingles/{fp.parent.name}/index.html"
    for fp in sorted((ROOT / "tools").glob("*.py")):
        files[f"tools/{fp.name}"] = {"from": f"ingles/tools/{fp.name}", "contentType": "text/plain"}
    files["extra/solo-docente.ts"] = {"from": "netlify/edge-functions/solo-docente.ts", "contentType": "text/plain"}
    (out / "files.json").write_text(json.dumps(files, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(files, ensure_ascii=False))

if __name__ == "__main__":
    if len(sys.argv) != 2: sys.exit("uso: espejo_artefacto.py SALIDA_DIR")
    main(sys.argv[1])
