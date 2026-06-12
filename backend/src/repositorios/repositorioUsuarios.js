/**
 * repositorioUsuarios.js
 * Operaciones de lectura y escritura sobre la tabla usuarios.
 */
'use strict';

const { obtenerDB } = require('../db/conexion');

function buscarPorUsuario(usuario) {
  const db = obtenerDB();
  return db.prepare('SELECT * FROM usuarios WHERE usuario = ? AND activo = 1').get(usuario);
}

function buscarPorId(id) {
  const db = obtenerDB();
  return db.prepare('SELECT id, nombre, usuario, rol, creado_en FROM usuarios WHERE id = ?').get(id);
}

function listarTodos() {
  const db = obtenerDB();
  return db.prepare('SELECT id, nombre, usuario, rol, activo, creado_en FROM usuarios ORDER BY creado_en').all();
}

function crear({ nombre, usuario, passwordHash, rol }) {
  const db = obtenerDB();
  const stmt = db.prepare(
    'INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(nombre, usuario, passwordHash, rol || 'enfermeria');
  return result.lastInsertRowid;
}

function actualizar(id, campos) {
  const db = obtenerDB();
  const sets = [];
  const vals = [];
  if (campos.nombre)        { sets.push('nombre = ?');        vals.push(campos.nombre); }
  if (campos.passwordHash)  { sets.push('password_hash = ?'); vals.push(campos.passwordHash); }
  if (campos.rol)           { sets.push('rol = ?');           vals.push(campos.rol); }
  if (campos.activo !== undefined) { sets.push('activo = ?'); vals.push(campos.activo ? 1 : 0); }
  if (!sets.length) return 0;
  vals.push(id);
  return db.prepare(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = ?`).run(...vals).changes;
}

function eliminar(id) {
  const db = obtenerDB();
  return db.prepare('UPDATE usuarios SET activo = 0 WHERE id = ?').run(id).changes;
}

module.exports = { buscarPorUsuario, buscarPorId, listarTodos, crear, actualizar, eliminar };
