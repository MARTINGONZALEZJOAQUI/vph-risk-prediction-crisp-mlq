/**
 * PaginaInicial.jsx
 * Pagina de bienvenida: proposito del sistema, usuarios objetivo y como usarlo.
 */
import { useNavigate } from 'react-router-dom';

export default function PaginaInicial() {
  const nav = useNavigate();
  return (
    <div className="contenedor">

      {/* Encabezado institucional */}
      <div className="tarjeta" style={{ textAlign: 'center', background: '#2C5F8A', color: '#fff' }}>
        <h1 style={{ color: '#fff', marginBottom: '0.4rem' }}>
          Sistema Predictivo de Riesgo VPH
        </h1>
        <p style={{ opacity: 0.9, fontSize: '1rem' }}>
          Centro de Salud Alfonso López — Universidad del Cauca
        </p>
        <p style={{ opacity: 0.8, fontSize: '0.9rem', marginTop: '0.3rem' }}>
          Grupo Salud Reproductiva
        </p>
      </div>

      {/* Proposito */}
      <div className="tarjeta">
        <h2>¿Para qué sirve este sistema?</h2>
        <p style={{ marginTop: '0.5rem', lineHeight: 1.7 }}>
          Esta herramienta apoya al personal de enfermería en la identificación de
          pacientes con mayor probabilidad de infección por el Virus del Papiloma
          Humano (VPH) o lesiones precancerosas. A partir de variables demográficas,
          clínicas y conductuales, el sistema calcula un indicador de riesgo basado
          en un modelo estadístico entrenado con datos reales del programa de
          citologías del centro de salud.
        </p>
        <p style={{ marginTop: '0.75rem', lineHeight: 1.7 }}>
          El resultado indica si la paciente presenta riesgo positivo o negativo,
          junto con el porcentaje de riesgo de resultado positivo. Esta información complementa
          la evaluación clínica del profesional de salud y no reemplaza el
          diagnóstico de laboratorio.
        </p>
      </div>

      {/* Usuarios objetivo */}
      <div className="tarjeta">
        <h2>¿Quiénes usan este sistema?</h2>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', lineHeight: 1.8 }}>
          <li><strong>Personal de enfermería</strong> — registra las variables del formulario de citología y consulta el resultado del modelo.</li>
          <li><strong>Administrador del sistema</strong> — gestiona usuarios y consulta registros de auditoría.</li>
        </ul>
      </div>

      {/* Como se usa */}
      <div className="tarjeta">
        <h2>¿Cómo se usa?</h2>
        <ol style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', lineHeight: 1.9 }}>
          <li>Inicie sesión con su usuario y contraseña asignados.</li>
          <li>Ingrese los datos de la paciente en el formulario de consulta.</li>
          <li>El sistema calcula automáticamente la clasificación de riesgo VPH.</li>
          <li>Revise el resultado, las recomendaciones y genere el informe si es necesario.</li>
          <li>Consulte el historial de evaluaciones previas de cualquier paciente.</li>
        </ol>
      </div>

      {/* Aviso clinico */}
      <div className="tarjeta" style={{ background: '#fff8e1', border: '1.5px solid #ffc107' }}>
        <p style={{ fontSize: '0.9rem', color: '#664d03' }}>
          <strong>Aviso:</strong> Esta herramienta es un apoyo a la decisión clínica.
          Los resultados deben ser interpretados por personal de salud capacitado
          y no reemplazan el diagnóstico de laboratorio ni el criterio profesional.
        </p>
      </div>

      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <button className="btn btn-primario" style={{ fontSize: '1rem', padding: '0.75rem 2.5rem' }}
                onClick={() => nav('/login')}>
          Iniciar sesión
        </button>
      </div>
    </div>
  );
}
