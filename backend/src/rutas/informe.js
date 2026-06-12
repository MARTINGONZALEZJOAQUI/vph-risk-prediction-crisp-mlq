'use strict';
const router = require('express').Router();
const ctrl   = require('../controladores/controladorInforme');
const { verificarToken } = require('../middlewares/auth');

router.get('/:id/informe', verificarToken, ctrl.obtenerInforme);

module.exports = router;
