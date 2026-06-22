/**
 * generadorRecomendaciones.js
 * Lee config_riesgo.json y determina nivel de riesgo, recomendaciones y alerta de transferencia.
 */
'use strict';

const path   = require('path');
const fs     = require('fs');
const CONFIG = path.join(__dirname, '..', '..', 'artifacts', 'config_riesgo.json');

function cargarConfig() {
  return JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
}

function calcular(clasificacion, probabilidad) {
  const cfg = cargarConfig();

  if (cfg.umbral_bajo_medio === null || cfg.umbral_medio_alto === null) {
    return {
      nivelRiesgo:               'pendiente',
      recomendaciones:           [],
      recomendacionesGenerales:  [],
      recomendacionesNivel:      [],
      alertaTransferencia:       false
    };
  }

  let nivel;
  if (probabilidad < cfg.umbral_bajo_medio) {
    nivel = 'bajo';
  } else if (probabilidad < cfg.umbral_medio_alto) {
    nivel = 'medio';
  } else {
    nivel = 'alto';
  }

  const { generales, propias } = recomendacionesDeNivel(cfg, nivel);
  const alerta = clasificacion === 'Positivo' && nivel === 'alto';

  return {
    nivelRiesgo:               nivel,
    recomendaciones:           [...generales, ...propias],
    recomendacionesGenerales:  generales,
    recomendacionesNivel:      propias,
    alertaTransferencia:       alerta
  };
}

function recomendacionesDeNivel(cfg, nivel) {
  return {
    generales: cfg.recomendaciones_generales || [],
    propias:   (cfg.recomendaciones_por_nivel && cfg.recomendaciones_por_nivel[nivel]) || []
  };
}

function porNivel(nivel) {
  const cfg = cargarConfig();
  if (!nivel || nivel === 'pendiente' ||
      cfg.umbral_bajo_medio === null || cfg.umbral_medio_alto === null ||
      !cfg.recomendaciones_por_nivel || !cfg.recomendaciones_por_nivel[nivel]) {
    return { generales: [], propias: [] };
  }
  return recomendacionesDeNivel(cfg, nivel);
}

module.exports = { calcular, porNivel };
