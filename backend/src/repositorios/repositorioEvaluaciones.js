/**
 * repositorioEvaluaciones.js
 * Operaciones sobre evaluaciones y variables_evaluacion.
 */
'use strict';

const { obtenerDB } = require('../db/conexion');

// Guarda la evaluacion y sus variables en una transaccion; devuelve el id.
function crear({ pacienteId, usuarioId, variablesJson, clasificacion, probabilidad, confiabilidad,
                 nivelRiesgo, recomendaciones, alertaTransferencia, variablesDetalle }) {
  const db = obtenerDB();

  const insertEval = db.prepare(`
    INSERT INTO evaluaciones
      (paciente_id, usuario_id, variables_json, clasificacion, probabilidad, confiabilidad,
       nivel_riesgo, recomendaciones, alerta_transferencia)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const COLUMNAS_DETALLE = [
    'no_placa','eps','fecha_ultima_menstruacion','fecha_ultima_citologia',
    'procedimientos_cuello_uterino','gestaciones','partos','cesareas','abortos','hijos_vivos',
    'no_patologia','resultado_patologia','insatisfactorias','seguimiento_llamada',
    'fecha_envio_lamina','fecha_recibo_resultado',
    'edad','edad_primera_menstruacion','edad_primera_relacion_sexual','num_comp_sexuales','n_hijos',
    'procedencia','e_conyugal','e_socioecon','embarazos','menopausia','vida_sexual_activa',
    'met_plan_hormo','fumador','cocina_lena','sabe_que_sirve_citologia','sabe_que_es_vph',
    'conoce_pruebas_vph','conoce_vacuna_vph','etnia','nivel_edu_cat','esta_civil_cat','ocupacion',
    'res_citologia_previa','infeccion_vph_previa','met_plan_cat','presentado_ets','fum_cat',
    'companero_trab_sexuales'
  ];

  const placeholders = COLUMNAS_DETALLE.map(() => '?').join(', ');
  const insertDetalle = db.prepare(`
    INSERT INTO variables_evaluacion (evaluacion_id, ${COLUMNAS_DETALLE.join(', ')})
    VALUES (?, ${placeholders})
  `);

  // node:sqlite no tiene .transaction(); usamos BEGIN/COMMIT manual
  let evalId;
  db.exec('BEGIN');
  try {
    const r = insertEval.run(
      pacienteId, usuarioId,
      typeof variablesJson === 'string' ? variablesJson : JSON.stringify(variablesJson),
      clasificacion, probabilidad, confiabilidad,
      nivelRiesgo || 'pendiente',
      recomendaciones ? JSON.stringify(recomendaciones) : null,
      alertaTransferencia ? 1 : 0
    );
    evalId = r.lastInsertRowid;
    const vals = COLUMNAS_DETALLE.map(c => variablesDetalle ? (variablesDetalle[c] ?? null) : null);
    insertDetalle.run(evalId, ...vals);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return evalId;
}

function buscarPorId(id) {
  const db = obtenerDB();
  return db.prepare(`
    SELECT e.*, p.identificador AS paciente_identificador, p.nombre AS paciente_nombre,
           u.nombre AS usuario_nombre, u.rol AS usuario_rol
    FROM evaluaciones e
    JOIN pacientes p ON p.id = e.paciente_id
    JOIN usuarios  u ON u.id = e.usuario_id
    WHERE e.id = ?
  `).get(id);
}

function historialPorPaciente(pacienteId) {
  const db = obtenerDB();
  return db.prepare(`
    SELECT e.id, e.fecha, e.clasificacion, e.probabilidad, e.confiabilidad,
           e.nivel_riesgo, e.alerta_transferencia, u.nombre AS registrado_por
    FROM evaluaciones e
    JOIN usuarios u ON u.id = e.usuario_id
    WHERE e.paciente_id = ?
    ORDER BY e.fecha DESC
  `).all(pacienteId);
}

function variablesDeEvaluacion(evaluacionId) {
  const db = obtenerDB();
  return db.prepare('SELECT * FROM variables_evaluacion WHERE evaluacion_id = ?').get(evaluacionId);
}

module.exports = { crear, buscarPorId, historialPorPaciente, variablesDeEvaluacion };
