/**
 * server.js - Inicia el servidor HTTP.
 * Ejecuta la semilla de base de datos antes de arrancar Express.
 */
'use strict';

const app    = require('./app');
const bcrypt = require('bcryptjs');
const { obtenerDB } = require('./db/conexion');

const PORT = process.env.PORT || 3001;

async function semilla() {
  const db = obtenerDB();
  const existe = db.prepare("SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1").get();
  if (!existe) {
    const hash = await bcrypt.hash('admin1234', 12);
    db.prepare(
      "INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?, ?, ?, ?)"
    ).run('Administrador', 'admin', hash, 'admin');
    console.log('[SEMILLA] Usuario admin creado. Usuario: admin / Contrasena: admin1234');
    console.log('[SEMILLA] Cambia la contrasena desde el panel de administracion.');
  }
}

semilla()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[SERVER] Sistema VPH en http://localhost:${PORT}`);
      console.log('[SERVER] Frontend esperado en http://localhost:5173');
    });
  })
  .catch(err => {
    console.error('[ERROR] No se pudo iniciar el servidor:', err.message);
    process.exit(1);
  });
