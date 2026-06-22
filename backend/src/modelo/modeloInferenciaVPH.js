// modeloInferenciaVPH.js - Cliente HTTP del microservicio Python de inferencia.
'use strict';

const path = require('path');
const meta = require(path.join(__dirname, '..', '..', 'artifacts', 'umbral.json'));

const SERVICIO = process.env.INFERENCIA_URL || 'http://127.0.0.1:8001';

// Llama al microservicio y devuelve la prediccion.
async function predecir(datos) {
  let resp;
  try {
    resp = await fetch(`${SERVICIO}/predecir`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ variables: datos || {} })
    });
  } catch (e) {
    const err = new Error('El servicio de inferencia no responde');
    err.status = 503;
    throw err;
  }
  if (!resp.ok) {
    const err = new Error('El servicio de inferencia devolvio un error');
    err.status = 503;
    throw err;
  }
  const d = await resp.json();
  return {
    clasificacion:         d.clasificacion,
    probabilidad_positivo: d.probabilidad_positivo,
    porcentaje_riesgo:     d.porcentaje_riesgo
  };
}

/** Umbral de clasificacion del modelo, expuesto por compatibilidad. */
const umbral = meta.umbral;

module.exports = { predecir, umbral };
