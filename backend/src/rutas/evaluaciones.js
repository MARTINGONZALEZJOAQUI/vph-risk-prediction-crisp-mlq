'use strict';
const router = require('express').Router();
const ctrl   = require('../controladores/controladorEvaluacion');
const { verificarToken }   = require('../middlewares/auth');
const { validarVariables } = require('../middlewares/validacion');

// Esquema del formulario (no requiere validacion de variables, solo autenticacion)
router.get('/esquema', verificarToken, ctrl.obtenerEsquema);

// Crear evaluacion
router.post('/', verificarToken, validarVariables, ctrl.crearEvaluacion);

module.exports = router;
