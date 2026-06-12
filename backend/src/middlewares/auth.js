/**
 * middlewares/auth.js
 * Verifica el token JWT en el encabezado Authorization: Bearer <token>.
 * Agrega req.usuario = { id, usuario, rol } para uso en controladores.
 */
'use strict';

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'vph_dev_secret_cambiar_en_produccion';

function verificarToken(req, res, next) {
  const cabecera = req.headers['authorization'] || '';
  const token    = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticacion requerido' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario   = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
}

/** Middleware que restringe el acceso al rol admin. */
function soloAdmin(req, res, next) {
  if (req.usuario && req.usuario.rol === 'admin') return next();
  return res.status(403).json({ error: 'Acceso restringido al administrador' });
}

module.exports = { verificarToken, soloAdmin };
