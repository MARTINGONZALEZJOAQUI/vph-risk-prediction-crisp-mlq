// FormularioPostconsulta.jsx - informe imprimible de la evaluacion.
import { useEffect, useState } from 'react';
import { obtenerInforme } from '../servicios/api.js';
import { estiloNivel } from '../utils/nivelRiesgo.js';

function Fila({ etiqueta, valor }) {
  if (valor === undefined || valor === null || valor === '') return null;
  return (
    <tr>
      <td style={{ fontWeight: 600, padding: '0.35rem 0.5rem', width: '55%', color: '#444' }}>{etiqueta}</td>
      <td style={{ padding: '0.35rem 0.5rem' }}>{String(valor)}</td>
    </tr>
  );
}

const ETIQUETAS_DETALLE = {
  edad: 'Edad (años)',
  edad_primera_menstruacion: 'Edad primera menstruación',
  edad_primera_relacion_sexual: 'Edad primera relación sexual',
  num_comp_sexuales: 'No. compañeros sexuales',
  n_hijos: 'No. hijos',
  procedencia: 'Procedencia',
  etnia: 'Etnia',
  nivel_edu_cat: 'Nivel educativo',
  esta_civil_cat: 'Estado civil',
  ocupacion: 'Ocupación',
  e_conyugal: 'Estado conyugal',
  vida_sexual_activa: 'Vida sexual activa',
  menopausia: 'Menopausia',
  embarazos: 'Embarazos',
  met_plan_cat: 'Método anticonceptivo',
  met_plan_hormo: 'Método hormonal',
  fumador: 'Fumadora',
  fum_cat: 'Patrón de tabaquismo',
  cocina_lena: 'Cocina con leña',
  res_citologia_previa: 'Resultado citología previa',
  infeccion_vph_previa: 'Infección VPH previa',
  presentado_ets: 'Ha presentado ETS',
  compañero_trab_sexuales: 'compañero_trab_sexuales',
  sabe_que_sirve_citologia: 'Sabe para qué sirve la citología',
  sabe_que_es_vph: 'Sabe qué es el VPH',
  conoce_pruebas_vph: 'Conoce pruebas del VPH',
  conoce_vacuna_vph: 'Conoce la vacuna VPH',
  e_socioecon: 'Estrato socioeconómico',
  // Adicionales CITOLOGIAS
  no_placa: 'No. de Placa',
  eps: 'EPS',
  fecha_ultima_menstruacion: 'FUM',
  fecha_ultima_citologia: 'FUC',
  gestaciones: 'Gestaciones (G)',
  partos: 'Partos (P)',
  cesareas: 'Cesáreas (C)',
  abortos: 'Abortos (A)',
  hijos_vivos: 'Hijos vivos (V)',
  procedimientos_cuello_uterino: 'Procedimientos en cuello uterino',
  no_patologia: 'No. de Patología',
  resultado_patologia: 'Resultado de patología'
};

export default function FormularioPostconsulta({ evaluacionId, onVolver }) {
  const [informe, setInforme] = useState(null);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!evaluacionId) return;
    obtenerInforme(evaluacionId)
      .then(data => setInforme(data.informe))
      .catch(err => setError(err.message));
  }, [evaluacionId]);

  if (error) return (
    <div className="tarjeta">
      <p className="mensaje-error">{error}</p>
      <button className="btn btn-secundario" onClick={onVolver}>Volver</button>
    </div>
  );
  if (!informe) return <p className="mensaje-cargando">Cargando informe...</p>;

  const { color, fondo } = estiloNivel(informe.nivel_riesgo, informe.clasificacion);
  const generales = informe.recomendaciones_generales || [];
  const delNivel  = informe.recomendaciones_nivel || [];
  const hayListasSeparadas = generales.length > 0 || delNivel.length > 0;
  const combinadas = informe.recomendaciones || [];

  return (
    <div>
      {/* Controles fuera de impresion */}
      <div className="no-imprimir" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <button className="btn btn-secundario" onClick={onVolver}>← Volver</button>
        <button className="btn btn-primario" onClick={() => window.print()}>Imprimir informe</button>
      </div>

      <div className="tarjeta" id="area-informe">

        {/* Encabezado */}
        <div style={{ borderBottom: '2px solid #ccc', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#2C5F8A' }}>
            Universidad del Cauca — Centro de Salud Alfonso López
          </div>
          <div style={{ fontSize: '0.9rem', color: '#555' }}>
            Sistema Predictivo de Riesgo VPH — Informe de Evaluación
          </div>
          <div style={{ fontSize: '0.85rem', color: '#777', marginTop: '0.25rem' }}>
            Fecha: {new Date(informe.fecha).toLocaleString('es-CO')} &nbsp;|&nbsp;
            Registrado por: {informe.registrado_por} &nbsp;|&nbsp;
            Evaluación No. {informe.id}
          </div>
        </div>

        {/* Datos de la paciente */}
        <h3 style={{ marginBottom: '0.5rem' }}>Datos de la paciente</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: '0.92rem' }}>
          <tbody>
            <Fila etiqueta="Número de documento" valor={informe.paciente.identificador} />
            <Fila etiqueta="Nombre"               valor={informe.paciente.nombre} />
          </tbody>
        </table>

        {/* Resultado del modelo */}
        <div style={{ background: fondo, color: '#1f2937', borderRadius: 8, borderLeft: `8px solid ${color}`,
                      padding: '1rem', marginBottom: '1rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
            <span aria-hidden="true"
                  style={{ width: 22, height: 22, borderRadius: '50%', background: color,
                           flexShrink: 0, boxShadow: '0 0 0 3px rgba(255,255,255,0.7)' }} />
            <span style={{ fontSize: '1.6rem', fontWeight: 700, color }}>{informe.clasificacion}</span>
          </div>
          <div style={{ fontSize: '0.95rem', color: '#374151', marginTop: '0.35rem' }}>
            Riesgo de resultado positivo: {informe.porcentaje_riesgo}% &nbsp;|&nbsp;
            Nivel de riesgo: <span style={{ textTransform: 'capitalize', fontWeight: 700, color }}>{informe.nivel_riesgo || 'pendiente'}</span>
          </div>
        </div>

        {/* Alerta de transferencia */}
        {informe.alerta_transferencia && (
          <div className="alerta-transferencia" style={{ marginBottom: '1rem' }}>
            ⚠ ALERTA: Se requiere derivación urgente a especialista.
          </div>
        )}

        {/* Recomendaciones */}
        <h3 style={{ marginBottom: '0.5rem' }}>Recomendaciones</h3>
        {hayListasSeparadas ? (
          <div style={{ marginBottom: '1rem' }}>
            {generales.length > 0 && (
              <>
                <h4 style={{ margin: '0.25rem 0 0.4rem', color: '#374151' }}>Recomendaciones generales</h4>
                <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.7, marginBottom: '0.75rem' }}>
                  {generales.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </>
            )}
            {delNivel.length > 0 && (
              <>
                <h4 style={{ margin: '0.25rem 0 0.4rem', color }}>
                  Recomendaciones para el nivel de riesgo <span style={{ textTransform: 'capitalize' }}>({informe.nivel_riesgo})</span>
                </h4>
                <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.7 }}>
                  {delNivel.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </>
            )}
          </div>
        ) : combinadas.length === 0 ? (
          <div className="alerta-pendiente" style={{ marginBottom: '1rem' }}>
            Pendiente de definición clínica por el director del programa.
          </div>
        ) : (
          <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.7, marginBottom: '1rem' }}>
            {combinadas.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        )}

        {/* Variables registradas */}
        <h3 style={{ marginBottom: '0.5rem' }}>Variables registradas</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <tbody>
            {Object.entries(ETIQUETAS_DETALLE).map(([campo, etiqueta]) => {
              const val = informe.variables_detalle?.[campo] ?? informe.variables?.[campo];
              if (val === null || val === undefined || val === '') return null;
              return <Fila key={campo} etiqueta={etiqueta} valor={val} />;
            })}
          </tbody>
        </table>

        {/* Disclaimer */}
        <div className="disclaimer" style={{ marginTop: '1rem' }}>
          Esta herramienta es un apoyo a la decisión clínica y no reemplaza el diagnóstico de laboratorio.
          Los resultados deben ser interpretados por personal de salud capacitado.
        </div>
      </div>

      <style>{`
        @media print {
          .no-imprimir { display: none !important; }
          .cabecera     { display: none !important; }
          .nav-lateral  { display: none !important; }
          body { background: #fff; }
        }
      `}</style>
    </div>
  );
}
