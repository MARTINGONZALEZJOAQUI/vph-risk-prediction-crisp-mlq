'use strict';
const router = require('express').Router();
const ctrl   = require('../controladores/controladorHistorial');
const { verificarToken } = require('../middlewares/auth');

router.get('/:identificador/historial', verificarToken, ctrl.historialPorPaciente);

module.exports = router;
