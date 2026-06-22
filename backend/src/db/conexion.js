// conexion.js - Singleton SQLite (node:sqlite). DB_PATH_OVERRIDE permite usar :memory: en tests.
'use strict';

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs   = require('fs');

const ESQUEMA_SQL = path.join(__dirname, 'esquema.sql');

let db;

function obtenerDB() {
  if (!db) {
    const override = process.env.DB_PATH_OVERRIDE;
    const DB_PATH  = override || path.join(__dirname, '..', '..', '..', 'vph.db');

    const esNueva = DB_PATH === ':memory:' || !fs.existsSync(DB_PATH);
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');

    if (esNueva) {
      const sql = fs.readFileSync(ESQUEMA_SQL, 'utf8');
      db.exec(sql);
      if (DB_PATH !== ':memory:') {
        console.log('[DB] Base de datos creada:', DB_PATH);
      }
    }
  }
  return db;
}

module.exports = { obtenerDB };
