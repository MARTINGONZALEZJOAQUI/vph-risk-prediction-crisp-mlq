/**
 * generadorRecomendaciones.js
 * Lee config_riesgo.json y determina nivel de riesgo, recomendaciones y alerta de transferencia.
 *
 * Mientras los umbrales de nivel de riesgo no esten definidos, el campo nivel_riesgo
 * se devuelve como "pendiente" y las recomendaciones como lista vacia.
 * Cuando el director clinico complete los valores nulos en config_riesgo.json,
 * el sistema empezara a mostrar nivel y recomendaciones automaticamente sin cambiar el codigo.
 */
'use strict';

const path   = require('path');
const fs     = require('fs');
const CONFIG = path.join(__dirname, '..', '..', 'artifacts', 'config_riesgo.json');

function cargarConfig() {
  return JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
}

/**
 * Dado el resultado del modelo, calcula nivel de riesgo, recomendaciones y alerta.
 *
 * @param {string} clasificacion  'Positivo' | 'Negativo'
 * @param {number} probabilidad   Probabilidad de positivo [0,1]
 * @returns {{ nivelRiesgo: string, recomendaciones: string[], alertaTransferencia: boolean }}
 */
function calcular(clasificacion, probabilidad) {
  const cfg = cargarConfig();

  // Si no hay umbrales definidos, todo queda pendiente
  if (cfg.umbral_bajo_medio === null || cfg.umbral_medio_alto === null) {
    return {
      nivelRiesgo:          'pendiente',
      recomendaciones:      [],
      alertaTransferencia:  false
    };
  }

  // Determinar nivel
  let nivel;
  if (probabilidad < cfg.umbral_bajo_medio) {
    nivel = 'bajo';
  } else if (probabilidad < cfg.umbral_medio_alto) {
    nivel = 'medio';
  } else {
    nivel = 'alto';
  }

  const recs  = (cfg.recomendaciones_por_nivel[nivel] || []);
  const alerta = clasificacion === 'Positivo' && nivel === 'alto';

  return {
    nivelRiesgo:         nivel,
    recomendaciones:     recs,
    alertaTransferencia: alerta
  };
}

module.exports = { calcular };
