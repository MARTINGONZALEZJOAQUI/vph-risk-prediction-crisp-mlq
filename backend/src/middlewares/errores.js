// middlewares/errores.js - Manejador global de errores de Express.
'use strict';

function manejadorErrores(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('[ERROR]', err.message || err);
  const estado = err.statusCode || err.status || 500;
  res.status(estado).json({
    error: err.message || 'Error interno del servidor'
  });
}

module.exports = { manejadorErrores };
