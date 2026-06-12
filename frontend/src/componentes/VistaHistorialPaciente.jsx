/**
 * VistaHistorialPaciente.jsx
 * Buscador por identificador y tabla cronologica de evaluaciones previas.
 */
import { useState } from 'react';
import { historialPaciente } from '../servicios/api.js';

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function VistaHistorialPaciente({ onVerInforme }) {
  const [identificador, setIdentificador] = useState('');
  const [historial, setHistorial]         = useState(null);
  const [pacienteInfo, setPacienteInfo]   = useState(null);
  const [error, setError]                 = useState('');
  const [buscando, setBuscando]           = useState(false);

  async function buscar(e) {
    e.preventDefault();
    if (!identificador.trim()) return;
    setBuscando(true);
    setError('');
    setHistorial(null);
    try {
      const data = await historialPaciente(identificador.trim());
      setPacienteInfo(data.paciente);
      setHistorial(data.evaluaciones);
    } catch (err) {
      setError(err.message || 'No se encontró la paciente');
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div>
      {/* ── Buscador ── */}
      <div className="tarjeta">
        <h2 style={{ marginBottom: '1rem' }}>Historial clínico por paciente</h2>
        <form onSubmit={buscar} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={identificador}
            onChange={e => setIdentificador(e.target.value)}
            placeholder="Número de documento de la paciente"
            style={{ flex: 1, minWidth: 200 }}
          />
          <button type="submit" className="btn btn-primario" disabled={buscando}>
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
        </form>
        {error && <p className="mensaje-error" style={{ marginTop: '0.5rem' }}>{error}</p>}
      </div>

      {/* ── Resultado ── */}
      {historial !== null && (
        <div className="tarjeta">
          {pacienteInfo && (
            <div style={{ marginBottom: '1rem' }}>
              <strong>Paciente:</strong> {pacienteInfo.nombre || 'Sin nombre'}{' '}
              — Documento: <strong>{pacienteInfo.identificador}</strong>
            </div>
          )}

          {historial.length === 0 ? (
            <p style={{ color: '#666' }}>Esta paciente no tiene evaluaciones registradas.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tabla-historial">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Clasificación</th>
                    <th>Riesgo</th>
                    <th>Nivel de riesgo</th>
                    <th>Registrado por</th>
                    <th>Informe</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map(ev => (
                    <tr key={ev.id}>
                      <td>{formatearFecha(ev.fecha)}</td>
                      <td>
                        <span className={ev.clasificacion === 'Positivo' ? 'badge-positivo' : 'badge-negativo'}>
                          {ev.clasificacion}
                        </span>
                      </td>
                      <td>{Math.round(ev.probabilidad * 100)}%</td>
                      <td style={{ textTransform: 'capitalize' }}>{ev.nivel_riesgo || '—'}</td>
                      <td>{ev.registrado_por}</td>
                      <td>
                        <button
                          className="btn btn-secundario"
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                          onClick={() => onVerInforme(ev.id)}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
