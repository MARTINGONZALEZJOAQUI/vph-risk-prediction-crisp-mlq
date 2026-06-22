# -*- coding: utf-8 -*-
# servicio.py - Microservicio HTTP del modelo HistGB. Expone POST /predecir.
import json, os, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import joblib, numpy as np, pandas as pd

BASE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(BASE, "..", "artifacts")
_art = joblib.load(os.path.join(ART, "modelo_vph.joblib"))
PRE, CLF, ISO = _art["pre"], _art["clf"], _art["iso"]
_meta = json.load(open(os.path.join(ART, "umbral.json"), encoding="utf-8"))
UMBRAL = float(_meta["umbral"])

NUM = ["edad", "edad_primera_menstruacion", "edad_primera_relacion_sexual",
       "num_comp_sexuales", "n_hijos"]
CAT = ["procedencia", "etnia", "nivel_edu_cat", "esta_civil_cat", "e_conyugal", "ocupacion",
       "e_socioecon", "embarazos", "menopausia", "res_citologia_previa", "vida_sexual_activa",
       "infeccion_vph_previa", "met_plan_cat", "met_plan_hormo", "presentado_ets",
       "compañero_trab_sexuales", "fumador", "fum_cat", "cocina_lena", "sabe_que_sirve_citologia",
       "sabe_que_es_vph", "conoce_pruebas_vph", "conoce_vacuna_vph"]
COLS = NUM + CAT
PUERTO = int(os.environ.get("INFERENCIA_PUERTO", "8001"))

def _predecir(variables):
    fila = {}
    for c in NUM:
        v = variables.get(c, None)
        try:
            fila[c] = float(v) if v not in (None, "", "null") else np.nan
        except (TypeError, ValueError):
            fila[c] = np.nan
    for c in CAT:
        v = variables.get(c, None)
        fila[c] = str(v) if v not in (None, "", "null") else np.nan
    df = pd.DataFrame([fila], columns=COLS)
    for c in CAT:
        df[c] = df[c].astype("object")
    prob = float(ISO.predict(CLF.predict_proba(PRE.transform(df))[:, 1])[0])
    return {
        "probabilidad_positivo": prob,
        "porcentaje_riesgo": round(prob * 100, 1),
        "clasificacion": "Positivo" if prob >= UMBRAL else "Negativo",
        "umbral": UMBRAL,
    }

class Handler(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        cuerpo = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def log_message(self, *a):
        pass

    def do_GET(self):
        if self.path == "/health":
            self._send(200, {"estado": "ok", "modelo": _meta.get("campeon", "?"), "umbral": UMBRAL})
        else:
            self._send(404, {"error": "ruta no encontrada"})

    def do_POST(self):
        if self.path != "/predecir":
            return self._send(404, {"error": "ruta no encontrada"})
        try:
            n = int(self.headers.get("Content-Length", 0))
            datos = json.loads(self.rfile.read(n) or b"{}")
            variables = datos.get("variables", {}) or {}
            self._send(200, _predecir(variables))
        except Exception as e:
            self._send(500, {"error": "fallo de inferencia", "detalle": str(e)[:300]})

if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    print(f"Microservicio de inferencia VPH escuchando en http://127.0.0.1:{PUERTO}  (modelo {_meta.get('campeon','?')}, umbral {UMBRAL:.4f})")
    ThreadingHTTPServer(("127.0.0.1", PUERTO), Handler).serve_forever()
