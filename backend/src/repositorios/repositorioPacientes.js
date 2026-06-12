/**
 * repositorioPacientes.js
 * Operaciones sobre la tabla pacientes.
 */
'use strict';

const { obtenerDB } = require('../db/conexion');

function buscarPorIdentificador(identificador) {
  const db = obtenerDB();
  return db.prepare('SELECT * FROM pacientes WHERE identificador = ?').get(identificador);
}

function buscarPorId(id) {
  const db = obtenerDB();
  return db.prepare('SELECT * FROM pacientes WHERE id = ?').get(id);
}

function crearOObtener({ identificador, nombre, telefono }) {
  const db = obtenerDB();
  const existente = buscarPorIdentificador(identificador);
  if (existente) return existente;
  const result = db.prepare(
    'INSERT INTO pacientes (identificador, nombre, telefono) VALUES (?, ?, ?)'
  ).run(identificador, nombre || null, telefono || null);
  return buscarPorId(result.lastInsertRowid);
}

function listarTodos() {
  const db = obtenerDB();
  return db.prepare('SELECT id, identificador, nombre, creado_en FROM pacientes ORDER BY creado_en DESC').all();
}

module.exports = { buscarPorIdentificador, buscarPorId, crearOObtener, listarTodos };
