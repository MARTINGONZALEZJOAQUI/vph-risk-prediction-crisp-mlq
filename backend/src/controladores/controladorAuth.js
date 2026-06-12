/**
 * controladorAuth.js
 * Maneja autenticacion (login/logout) y gestion de usuarios (solo admin).
 * Usa bcryptjs para verificar contrasenas y jsonwebtoken para emitir tokens JWT.
 */
'use strict';

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const repUsr  = require('../repositorios/repositorioUsuarios');
const repAud  = require('../repositorios/repositorioAuditoria');

const JWT_SECRET  = process.env.JWT_SECRET || 'vph_dev_secret_cambiar_en_produccion';
const JWT_EXPIRA  = process.env.JWT_EXPIRA  || '8h';

async function login(req, res, next) {
  try {
    const { usuario, contrasena } = req.body;
    if (!usuario || !contrasena) {
      return res.status(400).json({ error: 'Usuario y contrasena requeridos' });
    }

    const fila = repUsr.buscarPorUsuario(usuario);
    if (!fila) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const ok = await bcrypt.compare(contrasena, fila.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const payload = { id: fila.id, usuario: fila.usuario, rol: fila.rol };
    const token   = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRA });

    repAud.registrar({
      usuarioId: fila.id,
      accion:    'LOGIN',
      detalle:   `Usuario ${fila.usuario} inicio sesion`,
      ip:        req.ip
    });

    return res.json({ token, rol: fila.rol, nombre: fila.nombre });
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  repAud.registrar({
    usuarioId: req.usuario.id,
    accion:    'LOGOUT',
    detalle:   `Usuario ${req.usuario.usuario} cerro sesion`,
    ip:        req.ip
  });
  return res.json({ mensaje: 'Sesion cerrada' });
}

async function listarUsuarios(req, res, next) {
  try {
    return res.json(repUsr.listarTodos());
  } catch (err) {
    next(err);
  }
}

async function crearUsuario(req, res, next) {
  try {
    const { nombre, usuario, contrasena, rol } = req.body;
    if (!nombre || !usuario || !contrasena) {
      return res.status(400).json({ error: 'nombre, usuario y contrasena son requeridos' });
    }
    const existe = repUsr.buscarPorUsuario(usuario);
    if (existe) {
      return res.status(409).json({ error: 'El nombre de usuario ya existe' });
    }
    const hash = await bcrypt.hash(contrasena, 12);
    const id   = repUsr.crear({ nombre, usuario, passwordHash: hash, rol: rol || 'enfermeria' });

    repAud.registrar({
      usuarioId: req.usuario.id,
      accion:    'CREAR_USUARIO',
      detalle:   `Admin ${req.usuario.usuario} creo usuario ${usuario}`,
      ip:        req.ip
    });

    return res.status(201).json({ id, mensaje: 'Usuario creado' });
  } catch (err) {
    next(err);
  }
}

async function editarUsuario(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de usuario invalido' });

    const objetivo = repUsr.buscarPorId(id);
    if (!objetivo) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (objetivo.rol === 'admin') {
      return res.status(403).json({ error: 'No se puede editar una cuenta de administrador' });
    }
    if (id === req.usuario.id) {
      return res.status(403).json({ error: 'No puede editar su propia cuenta desde aqui' });
    }

    const { nombre, contrasena, rol } = req.body;
    const campos = {};
    if (nombre && nombre.trim())    campos.nombre = nombre.trim();
    if (rol && ['enfermeria', 'admin'].includes(rol)) campos.rol = rol;
    if (contrasena) {
      if (contrasena.length < 6) {
        return res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres' });
      }
      campos.passwordHash = await bcrypt.hash(contrasena, 12);
    }

    if (!Object.keys(campos).length) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
    }

    repUsr.actualizar(id, campos);

    repAud.registrar({
      usuarioId: req.usuario.id,
      accion:    'EDITAR_USUARIO',
      detalle:   `Admin ${req.usuario.usuario} edito el usuario id=${id} (${objetivo.usuario})`,
      ip:        req.ip
    });

    return res.json({ mensaje: 'Usuario actualizado' });
  } catch (err) {
    next(err);
  }
}

async function eliminarUsuario(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de usuario invalido' });

    const objetivo = repUsr.buscarPorId(id);
    if (!objetivo) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (objetivo.rol === 'admin') {
      return res.status(403).json({ error: 'No se puede eliminar una cuenta de administrador' });
    }
    if (id === req.usuario.id) {
      return res.status(403).json({ error: 'No puede eliminar su propia cuenta' });
    }

    repUsr.eliminar(id);

    repAud.registrar({
      usuarioId: req.usuario.id,
      accion:    'ELIMINAR_USUARIO',
      detalle:   `Admin ${req.usuario.usuario} desactivo el usuario id=${id} (${objetivo.usuario})`,
      ip:        req.ip
    });

    return res.json({ mensaje: 'Usuario desactivado' });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, logout, listarUsuarios, crearUsuario, editarUsuario, eliminarUsuario };
