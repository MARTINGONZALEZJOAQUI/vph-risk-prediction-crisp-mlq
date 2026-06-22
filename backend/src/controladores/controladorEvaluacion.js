// controladorEvaluacion.js - Captura variables, llama al modelo y persiste el resultado.
'use strict';

const path     = require('path');
const repPac   = require('../repositorios/repositorioPacientes');
const repEval  = require('../repositorios/repositorioEvaluaciones');
const repAud   = require('../repositorios/repositorioAuditoria');
const modelo   = require('../modelo/modeloInferenciaVPH');
const recoms   = require('../modelo/generadorRecomendaciones');
const ESQUEMA  = require(path.join(__dirname, '..', '..', 'artifacts', 'esquema_entrada.json'));

/** GET /api/esquema - Entrega el esquema de entrada para el formulario dinamico. */
function obtenerEsquema(req, res) {
  return res.json(ESQUEMA);
}

/**
 * POST /api/evaluaciones
 * Body esperado:
 * {
 *   "paciente": { "identificador": "12345678", "nombre": "...", "telefono": "..." },
 *   "variables": { <variables del modelo> },
 *   "variables_adicionales": { <campos extra del formulario CITOLOGIAS> }
 * }
 */
async function crearEvaluacion(req, res, next) {
  try {
    const { paciente, variables, variables_adicionales } = req.body;

    if (!paciente || !paciente.identificador) {
      return res.status(400).json({ error: 'Se requiere identificador del paciente' });
    }

    // obtener o crear paciente
    const pac = repPac.crearOObtener({
      identificador: paciente.identificador,
      nombre:        paciente.nombre,
      telefono:      paciente.telefono
    });

    // llamar al microservicio de inferencia
    let resultado;
    try {
      resultado = await modelo.predecir(variables || {});
    } catch (e) {
      return res.status(503).json({
        error: 'El servicio de inferencia no está disponible. Verifique que el microservicio Python esté en ejecución.'
      });
    }

    // calcular nivel de riesgo y recomendaciones
    const { nivelRiesgo, recomendaciones, recomendacionesGenerales,
            recomendacionesNivel, alertaTransferencia } =
      recoms.calcular(resultado.clasificacion, resultado.probabilidad_positivo);

    // fusionar variables del modelo con las adicionales del formulario
    const variablesDetalle = {
      ...(variables_adicionales || {}),
      ...Object.fromEntries(
        Object.entries(variables || {}).map(([k, v]) => [k, v])
      )
    };

    // persistir
    const evalId = repEval.crear({
      pacienteId:          pac.id,
      usuarioId:           req.usuario.id,
      variablesJson:       JSON.stringify(variables || {}),
      clasificacion:       resultado.clasificacion,
      probabilidad:        resultado.probabilidad_positivo,
      confiabilidad:       resultado.probabilidad_positivo,
      nivelRiesgo,
      recomendaciones,
      alertaTransferencia,
      variablesDetalle
    });

    // auditoria
    repAud.registrar({
      usuarioId: req.usuario.id,
      accion:    'CREAR_EVALUACION',
      detalle:   `Evaluacion ${evalId} para paciente ${pac.identificador} - ${resultado.clasificacion}`,
      ip:        req.ip
    });

    return res.status(201).json({
      id:                   evalId,
      clasificacion:        resultado.clasificacion,
      probabilidad_positivo: resultado.probabilidad_positivo,
      porcentaje_riesgo:     resultado.porcentaje_riesgo,
      nivel_riesgo:         nivelRiesgo,
      recomendaciones,
      recomendaciones_generales: recomendacionesGenerales,
      recomendaciones_nivel:     recomendacionesNivel,
      alerta_transferencia: alertaTransferencia,
      paciente: {
        id:            pac.id,
        identificador: pac.identificador,
        nombre:        pac.nombre
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { obtenerEsquema, crearEvaluacion };
