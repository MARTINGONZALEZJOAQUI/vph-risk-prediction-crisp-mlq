/**
 * app.js - Configura y exporta la aplicacion Express (sin arrancar el servidor).
 * El servidor se inicia en server.js para permitir imports sin efectos secundarios
 * (necesario para pruebas de integracion con node:test).
 */
'use strict';

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const { manejadorErrores }  = require('./middlewares/errores');
const { verificarToken }    = require('./middlewares/auth');
const { obtenerEsquema }    = require('./controladores/controladorEvaluacion');
const rutasAuth             = require('./rutas/auth');
const rutasEvaluaciones     = require('./rutas/evaluaciones');
const rutasHistorial        = require('./rutas/historial');
const rutasInforme          = require('./rutas/informe');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// Servir artefactos publicos
app.use('/artifacts', express.static(path.join(__dirname, '..', 'artifacts')));

// Rutas de la API
app.get('/api/esquema', verificarToken, obtenerEsquema);   // GET /api/esquema (plan §4)
app.use('/api/auth',          rutasAuth);
app.use('/api/evaluaciones',  rutasEvaluaciones);
app.use('/api/pacientes',     rutasHistorial);
app.use('/api/evaluaciones',  rutasInforme);

// Health-check
app.get('/api/health', (req, res) => {
  res.json({ estado: 'ok', sistema: 'VPH Prediccion', version: '1.0.0' });
});

app.use(manejadorErrores);

module.exports = app;
