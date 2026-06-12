'use strict';
const router = require('express').Router();
const ctrl   = require('../controladores/controladorAuth');
const { verificarToken, soloAdmin } = require('../middlewares/auth');

router.post('/login',  ctrl.login);
router.post('/logout', verificarToken, ctrl.logout);

// Gestion de usuarios (solo admin)
router.get(   '/usuarios',     verificarToken, soloAdmin, ctrl.listarUsuarios);
router.post(  '/usuarios',     verificarToken, soloAdmin, ctrl.crearUsuario);
router.put(   '/usuarios/:id', verificarToken, soloAdmin, ctrl.editarUsuario);
router.delete('/usuarios/:id', verificarToken, soloAdmin, ctrl.eliminarUsuario);

module.exports = router;
