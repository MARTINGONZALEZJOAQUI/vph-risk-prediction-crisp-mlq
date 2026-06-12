/**
 * Consulta.jsx
 * Pagina principal de consulta: flujo FormularioConsulta -> PanelResultadoRiesgo -> FormularioPostconsulta.
 */
import { useEffect, useState } from 'react';
import { obtenerEsquema, crearEvaluacion } from '../servicios/api.js';
import FormularioConsulta from '../componentes/FormularioConsulta.jsx';
import PanelResultadoRiesgo from '../componentes/PanelResultadoRiesgo.jsx';
import FormularioPostconsulta from '../componentes/FormularioPostconsulta.jsx';

export default function Consulta() {
  const [esquema,       setEsquema]       = useState(null);
  const [resultado,     setResultado]     = useState(null);
  const [verInformeId,  setVerInformeId]  = useState(null);
  const [cargando,      setCargando]      = useState(false);
  const [errorGlobal,   setErrorGlobal]   = useState('');

  useEffect(() => {
    obtenerEsquema()
      .then(setEsquema)
      .catch(err => setErrorGlobal(err.message || 'No se pudo cargar el esquema del formulario'));
  }, []);

  async function evaluarRiesgo(payload) {
    setErrorGlobal('');
    setCargando(true);
    try {
      const res = await crearEvaluacion(payload);
      setResultado(res);
    } catch (err) {
      setErrorGlobal(err.message || 'Error al evaluar');
    } finally {
      setCargando(false);
    }
  }

  function reiniciar() {
    setResultado(null);
    setVerInformeId(null);
    setErrorGlobal('');
  }

  if (verInformeId) {
    return (
      <div className="contenedor">
        <FormularioPostconsulta evaluacionId={verInformeId} onVolver={reiniciar} />
      </div>
    );
  }

  if (resultado) {
    return (
      <div className="contenedor">
        <h1 style={{ marginBottom: '1rem' }}>Resultado de la evaluación</h1>
        <PanelResultadoRiesgo
          resultado={resultado}
          onNuevaEvaluacion={reiniciar}
          onVerInforme={id => setVerInformeId(id)}
        />
      </div>
    );
  }

  return (
    <div className="contenedor">
      <h1 style={{ marginBottom: '0.25rem' }}>Nueva evaluación de riesgo VPH</h1>
      <p style={{ color: '#666', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
        Complete los campos disponibles. Los campos numéricos vacíos se imputarán con
        la mediana del conjunto de datos; los categóricos vacíos se tratarán como "No especificado".
      </p>

      {errorGlobal && <p className="mensaje-error" style={{ marginBottom: '1rem' }}>{errorGlobal}</p>}

      <FormularioConsulta
        esquema={esquema}
        onEnviar={evaluarRiesgo}
        cargando={cargando}
      />
    </div>
  );
}
