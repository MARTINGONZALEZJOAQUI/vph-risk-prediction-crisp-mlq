/**
 * repositorioAuditoria.js
 * Registro de operaciones sobre datos clinicos (log de auditoria).
 */
'use strict';

const { obtenerDB } = require('../db/conexion');

function registrar({ usuarioId, accion, detalle, ip }) {
  const db = obtenerDB();
  db.prepare('INSERT INTO auditoria (usuario_id, accion, detalle, ip) VALUES (?, ?, ?, ?)').run(
    usuarioId || null, accion, detalle || null, ip || null
  );
}

function listar({ limite = 100, offset = 0 } = {}) {
  const db = obtenerDB();
  return db.prepare(`
    SELECT a.id, a.accion, a.detalle, a.ip, a.fecha, u.usuario
    FROM auditoria a
    LEFT JOIN usuarios u ON u.id = a.usuario_id
    ORDER BY a.fecha DESC
    LIMIT ? OFFSET ?
  `).all(limite, offset);
}

module.exports = { registrar, listar };
