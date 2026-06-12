/**
 * controladorHistorial.js
 * Recupera cronologicamente las evaluaciones previas de una paciente.
 */
'use strict';

const repPac  = require('../repositorios/repositorioPacientes');
const repEval = require('../repositorios/repositorioEvaluaciones');

/** GET /api/pacientes/:identificador/historial */
function historialPorPaciente(req, res, next) {
  try {
    const { identificador } = req.params;
    const pac = repPac.buscarPorIdentificador(identificador);
    if (!pac) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    const historial = repEval.historialPorPaciente(pac.id);
    return res.json({
      paciente: { id: pac.id, identificador: pac.identificador, nombre: pac.nombre },
      total:    historial.length,
      evaluaciones: historial
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { historialPorPaciente };
