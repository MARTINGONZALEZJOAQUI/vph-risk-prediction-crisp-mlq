/**
 * Historial.jsx
 * Pagina de historial clinico por paciente.
 */
import { useState } from 'react';
import VistaHistorialPaciente from '../componentes/VistaHistorialPaciente.jsx';
import FormularioPostconsulta from '../componentes/FormularioPostconsulta.jsx';

export default function Historial() {
  const [verInformeId, setVerInformeId] = useState(null);

  if (verInformeId) {
    return (
      <div className="contenedor">
        <FormularioPostconsulta evaluacionId={verInformeId} onVolver={() => setVerInformeId(null)} />
      </div>
    );
  }

  return (
    <div className="contenedor">
      <h1 style={{ marginBottom: '1.25rem' }}>Historial clínico</h1>
      <VistaHistorialPaciente onVerInforme={id => setVerInformeId(id)} />
    </div>
  );
}
