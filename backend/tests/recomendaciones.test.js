// recomendaciones.test.js - Pruebas de generadorRecomendaciones.calcular.
'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const recoms   = require('../src/modelo/generadorRecomendaciones');

test('riesgo bajo cuando la probabilidad es menor que 0.1303', () => {
  const r = recoms.calcular('Negativo', 0.05);
  assert.equal(r.nivelRiesgo, 'bajo');
  assert.ok(r.recomendaciones.length > 3, 'incluye generales mas las del nivel');
  assert.ok(r.recomendaciones[0].startsWith('Lavado de manos'), 'los generales van primero');
});

test('riesgo medio cuando la probabilidad esta entre 0.1303 y 0.25', () => {
  const r = recoms.calcular('Positivo', 0.18);
  assert.equal(r.nivelRiesgo, 'medio');
  assert.ok(r.recomendaciones.some(x => x.includes('tener un riesgo no significa')));
});

test('riesgo alto cuando la probabilidad alcanza o supera 0.25', () => {
  const r = recoms.calcular('Positivo', 0.30);
  assert.equal(r.nivelRiesgo, 'alto');
  assert.ok(r.recomendaciones.some(x => x.includes('reclames el resultado')));
});

test('las recomendaciones separan generales y propias del nivel', () => {
  const r = recoms.calcular('Negativo', 0.30);
  assert.equal(r.nivelRiesgo, 'alto');
  assert.ok(r.recomendacionesGenerales.length > 0);
  assert.ok(r.recomendacionesNivel.length > 0);
});
