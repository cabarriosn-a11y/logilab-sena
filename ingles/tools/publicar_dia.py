#!/usr/bin/env python3
"""Genera la página de un reto diario de inglés a partir de su JSON.

Uso:  python3 ingles/tools/publicar_dia.py ingles/datos/dia-04.json [--artefacto salida.html]

--artefacto: además escribe una versión para publicar como Artifact de claude.ai
(sin doctype/head/body, sin micrófono ni descargas). Plan B si no se puede hacer push.

- Valida el JSON (campos obligatorios, quiz con respuesta válida, palabras no repetidas).
- Escribe ingles/dia-NN/index.html usando ingles/_plantilla.html.
- Guarda una copia en ingles/datos/dia-NN.json y reconstruye ingles/dias.json
  (catálogo + registro de lo enseñado) a partir de datos/semilla.json y datos/dia-*.json.
Después: git add, commit y push a main (Netlify publica en ~1 minuto).
"""
import json, sys, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]  # carpeta ingles/
MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]
DIAS = ["lunes","martes","miércoles","jueves","viernes","sábado","domingo"]
OBLIG = ["dia","fecha","nivel","nivelNum","tema","intro","palabras","frase","pronunciacion","gramatica","quiz","hablar","escribir","vidaReal","cierre"]

def fail(msg):
    sys.exit(f"ERROR: {msg}")

def entrada_de(x):
    nn = f"{int(x['dia']):02d}"
    return {"dia": x["dia"], "fecha": x["fecha"], "nivel": x["nivel"], "nivelNum": x["nivelNum"],
            "tema": x["tema"], "emoji": x.get("emoji", ""), "ruta": f"dia-{nn}/",
            "palabras": [w["en"] for w in x["palabras"]], "significados": [w["es"] for w in x["palabras"]],
            "frase": x["frase"]["en"], "pronunciacion": x["pronunciacion"]["titulo"], "gramatica": x["gramatica"]["titulo"]}

def main(path, artefacto=None):
    d = json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
    for k in OBLIG:
        if k not in d: fail(f"falta el campo '{k}'")
    for w in d["palabras"]:
        for k in ["en","fig","ipa","es","ej","ejEs"]:
            if not w.get(k): fail(f"palabra {w.get('en')} sin '{k}'")
    for i, q in enumerate(d["quiz"]):
        if not (0 <= q.get("correcta", -1) < len(q.get("opciones", []))): fail(f"quiz #{i+1}: 'correcta' fuera de rango")
    for k in ["en","es","cuando","noCuando"]:
        if not d["frase"].get(k): fail(f"frase sin '{k}'")

    # Registro de lo ya enseñado: semilla (días sin página) + todos los datos/dia-*.json
    semilla = json.loads((ROOT / "datos" / "semilla.json").read_text(encoding="utf-8"))
    otros_datos = []
    for fp in sorted((ROOT / "datos").glob("dia-*.json")):
        x = json.loads(fp.read_text(encoding="utf-8"))
        if x["dia"] != d["dia"]: otros_datos.append(x)
    ya = {p.lower() for x in semilla["dias"] for p in x["palabras"]} | {w["en"].lower() for x in otros_datos for w in x["palabras"]}
    rep = [w["en"] for w in d["palabras"] if w["en"].lower() in ya]
    if rep: fail(f"palabras ya enseñadas en otro día: {rep}")

    f = datetime.date.fromisoformat(d["fecha"])
    d.setdefault("fechaLarga", f"{DIAS[f.weekday()]} {f.day} de {MESES[f.month-1]} de {f.year}")
    nn = f"{int(d['dia']):02d}"
    tpl = (ROOT / "_plantilla.html").read_text(encoding="utf-8")
    data = json.dumps(d, ensure_ascii=False).replace("</", "<\\/")
    titulo = f"Día {d['dia']} · {d['tema']} · Inglés americano"
    desc = f"Reto diario de inglés americano, día {d['dia']} ({d['nivel']}): " + ", ".join(w["en"] for w in d["palabras"])
    esc = lambda s: s.replace("&","&amp;").replace("<","&lt;").replace('"',"&quot;")
    html = tpl.replace("__TITULO__", esc(titulo)).replace("__DESCRIPCION__", esc(desc)).replace("__DATA__", data)
    out = ROOT / f"dia-{nn}" / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")

    destino = ROOT / "datos" / f"dia-{nn}.json"
    if pathlib.Path(path).resolve() != destino.resolve():
        destino.write_text(json.dumps(d, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    entradas = [entrada_de(x) for x in otros_datos + [d]]
    dias = {x["dia"]: x for x in semilla["dias"]}
    dias.update({x["dia"]: x for x in entradas})
    cat = {"inicio": semilla["inicio"], "dias": [dias[k] for k in sorted(dias)]}
    (ROOT / "dias.json").write_text(json.dumps(cat, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    if artefacto:
        import re
        a = html
        for t in ['<!doctype html>\n','<html lang="es">\n','<head>\n','</head>\n','<body>\n','</body>\n','</html>\n']:
            a = a.replace(t, '')
        a = re.sub(r'<meta charset="utf-8">\n<meta name="viewport"[^>]*>\n', '', a)
        a = a.replace('<script id="data"', '<script>window.__ARTIFACT__=1</script>\n<script id="data"', 1)
        a = re.sub(r'<title>.*?</title>', f"<title>Inglés Día {d['dia']} · {esc(d['tema'])}</title>", a, count=1)
        pathlib.Path(artefacto).write_text(a, encoding="utf-8")
        print(f"Artefacto -> {artefacto}")
    print(f"OK -> {out.relative_to(ROOT.parent)}  |  URL: https://logilab-sena.netlify.app/ingles/dia-{nn}/")

if __name__ == "__main__":
    args = sys.argv[1:]
    art = None
    if "--artefacto" in args:
        i = args.index("--artefacto"); art = args[i+1]; del args[i:i+2]
    if len(args) != 1: fail("uso: publicar_dia.py ingles/datos/dia-NN.json [--artefacto salida.html]")
    main(args[0], art)
