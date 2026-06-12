/**
 * PanelResultadoRiesgo.jsx
 * Muestra el resultado de la evaluacion de riesgo VPH.
 *
 * Colores segun el documento de diseno:
 *   Positivo  → Rosso Vinaccia (#9B2335)
 *   Negativo  → Verde (#255951)
 *
 * Muestra alerta de transferencia si clasificacion es Positivo y nivel es alto.
 * Mientras los umbrales no esten definidos, nivel_riesgo = 'pendiente'.
 */

export default function PanelResultadoRiesgo({ resultado, onNuevaEvaluacion, onVerInforme }) {
  if (!resultado) return null;

  const {
    clasificacion, porcentaje_riesgo, nivel_riesgo,
    recomendaciones, alerta_transferencia, id
  } = resultado;

  const esPositivo     = clasificacion === 'Positivo';
  const panelClase     = esPositivo ? 'panel-resultado panel-positivo' : 'panel-resultado panel-negativo';
  const pct            = Math.round(porcentaje_riesgo);
  const nivelPendiente = !nivel_riesgo || nivel_riesgo === 'pendiente';

  return (
    <div>
      {/* ── Panel de resultado principal ── */}
      <div className={panelClase}>
        <div className="clasificacion-texto">{clasificacion}</div>
        <div className="confiabilidad-texto">Riesgo de resultado positivo: {pct}%</div>

        <div className="barra-confiabilidad-fondo">
          <div className="barra-confiabilidad-relleno" style={{ width: `${pct}%` }} />
        </div>

        <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', opacity: 0.88 }}>
          {esPositivo
            ? 'El modelo indica probabilidad elevada de infección por VPH. Se recomienda seguimiento.'
            : 'El modelo no detecta indicadores de riesgo elevado en los datos proporcionados.'}
        </p>
      </div>

      {/* ── Alerta de transferencia ── */}
      {alerta_transferencia && (
        <div className="alerta-transferencia">
          ⚠ ALERTA DE TRANSFERENCIA: Esta paciente requiere derivación urgente a especialista
          dado el resultado positivo con nivel de riesgo alto.
        </div>
      )}

      {/* ── Nivel de riesgo ── */}
      <div className="tarjeta" style={{ marginTop: '1rem' }}>
        <h3>Nivel de riesgo</h3>
        {nivelPendiente ? (
          <div className="alerta-pendiente">
            Los umbrales de nivel de riesgo (bajo / medio / alto) aún no han sido
            definidos por el director clínico. Una vez se entreguen los valores,
            este campo se completará automáticamente sin cambiar el sistema.
          </div>
        ) : (
          <p style={{ textTransform: 'capitalize', fontWeight: 700, fontSize: '1.1rem',
                      color: nivel_riesgo === 'alto' ? '#9B2335' :
                             nivel_riesgo === 'medio' ? '#B8860B' : '#255951' }}>
            {nivel_riesgo}
          </p>
        )}
      </div>

      {/* ── Recomendaciones ── */}
      <div className="tarjeta">
        <h3>Recomendaciones</h3>
        {!recomendaciones || recomendaciones.length === 0 ? (
          <div className="alerta-pendiente">
            Las recomendaciones clínicas por nivel de riesgo aún no han sido
            definidas. Se actualizarán automáticamente cuando el director clínico
            las proporcione.
          </div>
        ) : (
          <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.7 }}>
            {recomendaciones.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        )}
      </div>

      {/* ── Disclaimer clinico ── */}
      <p className="disclaimer">
        Esta herramienta es un apoyo a la decisión clínica y no reemplaza el diagnóstico de laboratorio.
      </p>

      {/* ── Acciones ── */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
        <button className="btn btn-secundario" onClick={onNuevaEvaluacion}>
          Nueva evaluación
        </button>
        {id && (
          <button className="btn btn-primario" onClick={() => onVerInforme(id)}>
            Ver informe completo
          </button>
        )}
      </div>
    </div>
  );
}
