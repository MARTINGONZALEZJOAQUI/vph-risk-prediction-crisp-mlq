/**
 * inferencia.test.js
 * Verifica que el cliente del microservicio (modeloInferenciaVPH) parsea correctamente
 * la respuesta y entrega el porcentaje de riesgo. Mockea fetch para no depender de Python.
 */
'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const modelo   = require('../src/modelo/modeloInferenciaVPH');

function mockFetch(respuesta, ok = true) {
  global.fetch = async () => ({ ok, json: async () => respuesta });
}

test('predecir devuelve clasificacion, probabilidad y porcentaje de riesgo', async () => {
  mockFetch({ clasificacion: 'Negativo', probabilidad_positivo: 0.087, porcentaje_riesgo: 8.7, umbral: 0.1303 });
  const r = await modelo.predecir({ edad: 35 });
  assert.ok(['Positivo', 'Negativo'].includes(r.clasificacion));
  assert.ok(r.probabilidad_positivo >= 0 && r.probabilidad_positivo <= 1);
  assert.equal(r.porcentaje_riesgo, 8.7);
});

test('predecir propaga error 503 si el servicio falla', async () => {
  global.fetch = async () => { throw new Error('conexion rechazada'); };
  await assert.rejects(() => modelo.predecir({}), (e) => e.status === 503);
});

test('umbral del modelo esta entre 0 y 1', () => {
  assert.ok(modelo.umbral > 0 && modelo.umbral < 1);
});
