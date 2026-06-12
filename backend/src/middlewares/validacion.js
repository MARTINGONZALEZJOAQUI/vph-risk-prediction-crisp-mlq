/**
 * middlewares/validacion.js
 * Valida las variables de entrada del formulario contra el esquema del modelo.
 * Usa esquema_entrada.json para verificar rangos numericos y valores categoricos permitidos.
 */
'use strict';

const path   = require('path');
const SCHEMA = require(path.join(__dirname, '..', '..', 'artifacts', 'esquema_entrada.json'));

function validarVariables(req, res, next) {
  const datos = req.body.variables || {};
  const errores = [];

  // Validar numericas
  for (const [campo, cfg] of Object.entries(SCHEMA.variables_numericas)) {
    const val = datos[campo];
    if (val === undefined || val === null || val === '') continue; // se imputara con mediana
    const num = Number(val);
    if (isNaN(num)) {
      errores.push(`El campo ${campo} debe ser un numero`);
    } else if (num < cfg.minimo || num > cfg.maximo) {
      errores.push(`El campo ${campo} debe estar entre ${cfg.minimo} y ${cfg.maximo}`);
    }
  }

  // Validar categoricas
  for (const [campo, opciones] of Object.entries(SCHEMA.variables_categoricas)) {
    const val = datos[campo];
    if (val === undefined || val === null || val === '') continue; // se imputara con Desconocido
    if (!opciones.includes(String(val))) {
      errores.push(`El campo ${campo} debe ser uno de: ${opciones.join(', ')}`);
    }
  }

  if (errores.length > 0) {
    return res.status(400).json({ error: 'Datos de entrada invalidos', detalles: errores });
  }

  next();
}

module.exports = { validarVariables };
