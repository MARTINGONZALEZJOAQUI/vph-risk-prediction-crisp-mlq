// PanelResultadoRiesgo.jsx - muestra clasificacion, nivel de riesgo y recomendaciones.
import { estiloNivel } from '../utils/nivelRiesgo.js';

export default function PanelResultadoRiesgo({ resultado, onNuevaEvaluacion, onVerInforme }) {
  if (!resultado) return null;

  const {
    clasificacion, porcentaje_riesgo, nivel_riesgo,
    recomendaciones, recomendaciones_generales, recomendaciones_nivel,
    alerta_transferencia, id
  } = resultado;

  const pct            = Math.round(porcentaje_riesgo);
  const nivelPendiente = !nivel_riesgo || nivel_riesgo === 'pendiente';
  const { color, fondo } = estiloNivel(nivel_riesgo, clasificacion);

  const generales = recomendaciones_generales || [];
  const delNivel  = recomendaciones_nivel || [];
  const hayListasSeparadas = generales.length > 0 || delNivel.length > 0;
  const combinadas = recomendaciones || [];

  return (
    <div>
      <div className="panel-resultado"
           style={{ background: fondo, borderLeft: `8px solid ${color}`, color: '#1f2937' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
          <span aria-hidden="true"
                style={{ width: 26, height: 26, borderRadius: '50%', background: color,
                         flexShrink: 0, boxShadow: '0 0 0 3px rgba(255,255,255,0.7)' }} />
          <span className="clasificacion-texto" style={{ color }}>{clasificacion}</span>
        </div>
        <div className="confiabilidad-texto" style={{ color: '#374151' }}>
          Riesgo de resultado positivo: {pct}%
        </div>
      </div>

      {alerta_transferencia && (
        <div className="alerta-transferencia">
          ⚠ ALERTA DE TRANSFERENCIA: Esta paciente requiere derivación urgente a especialista
          dado el resultado positivo con nivel de riesgo alto.
        </div>
      )}

      <div className="tarjeta" style={{ marginTop: '1rem' }}>
        <h3>Nivel de riesgo</h3>
        {nivelPendiente ? (
          <div className="alerta-pendiente">
            Los umbrales de nivel de riesgo (bajo / medio / alto) aún no han sido
            definidos por el director clínico. Una vez se entreguen los valores,
            este campo se completará automáticamente sin cambiar el sistema.
          </div>
        ) : (
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem',
                      textTransform: 'capitalize', fontWeight: 700, fontSize: '1.1rem', color }}>
            <span aria-hidden="true"
                  style={{ width: 14, height: 14, borderRadius: '50%', background: color }} />
            {nivel_riesgo}
          </p>
        )}
      </div>

      <div className="tarjeta">
        <h3>Recomendaciones</h3>
        {hayListasSeparadas ? (
          <>
            {generales.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ margin: '0.25rem 0 0.5rem', color: '#374151' }}>Recomendaciones generales</h4>
                <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.7 }}>
                  {generales.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            {delNivel.length > 0 && (
              <div>
                <h4 style={{ margin: '0.25rem 0 0.5rem', color }}>
                  Recomendaciones para tu nivel de riesgo <span style={{ textTransform: 'capitalize' }}>({nivel_riesgo})</span>
                </h4>
                <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.7 }}>
                  {delNivel.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </>
        ) : combinadas.length === 0 ? (
          <div className="alerta-pendiente">
            Las recomendaciones clínicas por nivel de riesgo aún no han sido
            definidas. Se actualizarán automáticamente cuando el director clínico
            las proporcione.
          </div>
        ) : (
          <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.7 }}>
            {combinadas.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        )}
      </div>

      <p className="disclaimer">
        Esta herramienta es un apoyo a la decisión clínica y no reemplaza el diagnóstico de laboratorio.
      </p>

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
