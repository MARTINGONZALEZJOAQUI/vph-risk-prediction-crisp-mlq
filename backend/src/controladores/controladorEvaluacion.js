/**
 * controladorEvaluacion.js
 * Orquesta el flujo de captura de variables, inferencia del modelo y persistencia.
 * Tambien entrega el esquema de entrada para construir el formulario en el frontend.
 */
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

    // 1. Obtener o crear paciente
    const pac = repPac.crearOObtener({
      identificador: paciente.identificador,
      nombre:        paciente.nombre,
      telefono:      paciente.telefono
    });

    // 2. Ejecutar modelo de inferencia (microservicio Python). La probabilidad ES el riesgo de positivo.
    let resultado;
    try {
      resultado = await modelo.predecir(variables || {});
    } catch (e) {
      return res.status(503).json({
        error: 'El servicio de inferencia no está disponible. Verifique que el microservicio Python esté en ejecución.'
      });
    }

    // 3. Calcular nivel de riesgo y recomendaciones (placeholder si no hay umbrales)
    const { nivelRiesgo, recomendaciones, alertaTransferencia } =
      recoms.calcular(resultado.clasificacion, resultado.probabilidad_positivo);

    // 4. Construir objeto de variables detalladas para la tabla comprehensiva
    const variablesDetalle = {
      ...(variables_adicionales || {}),
      ...Object.fromEntries(
        Object.entries(variables || {}).map(([k, v]) => [k, v])
      )
    };

    // 5. Persistir evaluacion y variables
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

    // 6. Registro de auditoria
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
