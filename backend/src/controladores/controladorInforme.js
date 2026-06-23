// controladorInforme.js - Genera el objeto de informe imprimible para una evaluacion.
'use strict';

const repEval = require('../repositorios/repositorioEvaluaciones');
const repAud  = require('../repositorios/repositorioAuditoria');
const recoms  = require('../modelo/generadorRecomendaciones');

/** GET /api/evaluaciones/:id/informe */
function obtenerInforme(req, res, next) {
  try {
    const id   = Number(req.params.id);
    const eval_ = repEval.buscarPorId(id);
    if (!eval_) {
      return res.status(404).json({ error: 'Evaluacion no encontrada' });
    }
    const detalle = repEval.variablesDeEvaluacion(id);

    // Registrar acceso al informe en auditoria
    repAud.registrar({
      usuarioId: req.usuario.id,
      accion:    'VER_INFORME',
      detalle:   `Informe de evaluacion ${id} consultado`,
      ip:        req.ip
    });

    const recomendaciones = (() => {
      try {
        return JSON.parse(eval_.recomendaciones || '[]');
      } catch {
        return [];
      }
    })();

    const { generales, propias } = recoms.porNivel(eval_.nivel_riesgo);
    const recomendacionesGenerales = generales.length ? generales : recomendaciones;
    const recomendacionesNivel     = propias;

    return res.json({
      informe: {
        id:                   eval_.id,
        fecha:                eval_.fecha,
        paciente: {
          identificador: eval_.paciente_identificador,
          nombre:        eval_.paciente_nombre
        },
        registrado_por:       eval_.usuario_nombre,
        clasificacion:        eval_.clasificacion,
        probabilidad_positivo: eval_.probabilidad,
        porcentaje_riesgo:    Math.round(eval_.probabilidad * 1000) / 10,
        nivel_riesgo:         eval_.nivel_riesgo,
        recomendaciones,
        recomendaciones_generales: recomendacionesGenerales,
        recomendaciones_nivel:     recomendacionesNivel,
        variables:            JSON.parse(eval_.variables_json || '{}'),
        variables_detalle:    detalle || {}
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { obtenerInforme };
