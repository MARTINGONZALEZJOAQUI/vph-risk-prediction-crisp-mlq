// FormularioConsulta.jsx - captura de variables clinicas; se construye desde GET /api/esquema.
import { useState } from 'react';

// Etiquetas legibles para cada variable del modelo
const ETIQUETAS = {
  // Numericas
  edad:                          'Edad (años)',
  edad_primera_menstruacion:     'Edad de la primera menstruación',
  edad_primera_relacion_sexual:  'Edad de la primera relación sexual',
  num_comp_sexuales:             'Número de compañeros sexuales',
  n_hijos:                       'Número de hijos',
  // Categoricas
  procedencia:                   'Procedencia',
  e_conyugal:                    'Estado conyugal (resumen)',
  e_socioecon:                   'Estrato socioeconómico',
  embarazos:                     '¿Ha tenido embarazos?',
  menopausia:                    '¿Está en menopausia?',
  vida_sexual_activa:            '¿Tiene vida sexual activa?',
  met_plan_hormo:                '¿Usa método hormonal?',
  fumador:                       '¿Fuma actualmente?',
  cocina_lena:                   '¿Cocina con leña?',
  sabe_que_sirve_citologia:      '¿Sabe para qué sirve la citología?',
  sabe_que_es_vph:               '¿Sabe qué es el VPH?',
  conoce_pruebas_vph:            '¿Conoce las pruebas del VPH?',
  conoce_vacuna_vph:             '¿Conoce la vacuna contra el VPH?',
  etnia:                         'Etnia',
  nivel_edu_cat:                 'Nivel educativo',
  esta_civil_cat:                'Estado civil',
  ocupacion:                     'Ocupación',
  res_citologia_previa:          'Resultado de citología previa',
  infeccion_vph_previa:          '¿Infección VPH previa?',
  met_plan_cat:                  'Método anticonceptivo',
  presentado_ets:                '¿Ha presentado ETS?',
  fum_cat:                       'Patrón de tabaquismo',
  companero_trab_sexuales:       '¿La pareja tiene trabajadoras sexuales?'
};

const CAMPOS_ADICIONALES = [
  { nombre: 'no_placa',                      etiqueta: 'No. de Placa',                       tipo: 'text' },
  { nombre: 'eps',                           etiqueta: 'EPS / Aseguradora',                  tipo: 'text' },
  { nombre: 'fecha_ultima_menstruacion',     etiqueta: 'Fecha de última menstruación (FUM)',  tipo: 'date' },
  { nombre: 'fecha_ultima_citologia',        etiqueta: 'Fecha de última citología (FUC)',     tipo: 'date' },
  { nombre: 'procedimientos_cuello_uterino', etiqueta: 'Procedimientos previos en cuello uterino', tipo: 'text' },
  { nombre: 'gestaciones',                   etiqueta: 'Gestaciones (G)',                     tipo: 'number', min: 0, max: 25 },
  { nombre: 'partos',                        etiqueta: 'Partos (P)',                          tipo: 'number', min: 0, max: 25 },
  { nombre: 'cesareas',                      etiqueta: 'Cesáreas (C)',                        tipo: 'number', min: 0, max: 25 },
  { nombre: 'abortos',                       etiqueta: 'Abortos (A)',                         tipo: 'number', min: 0, max: 25 },
  { nombre: 'hijos_vivos',                   etiqueta: 'Hijos vivos (V)',                     tipo: 'number', min: 0, max: 25 }
];

export default function FormularioConsulta({ esquema, onEnviar, cargando }) {
  const [paciente, setPaciente] = useState({
    identificador: '', nombre: '', telefono: ''
  });
  const [variables, setVariables] = useState({});
  const [adicionales, setAdicionales] = useState({});
  const [errores, setErrores] = useState({});

  function cambiarPaciente(e) {
    setPaciente(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function cambiarVariable(campo, valor) {
    setVariables(prev => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores(prev => ({ ...prev, [campo]: null }));
  }

  function cambiarAdicional(campo, valor) {
    setAdicionales(prev => ({ ...prev, [campo]: valor }));
  }

  function validar() {
    const errs = {};
    if (!paciente.identificador.trim()) {
      errs.identificador = 'El número de documento es obligatorio';
    }
    if (esquema) {
      for (const [campo, cfg] of Object.entries(esquema.variables_numericas)) {
        const val = variables[campo];
        if (val === '' || val === undefined || val === null) continue;
        const num = Number(val);
        if (isNaN(num)) { errs[campo] = 'Debe ser un número'; continue; }
        if (num < cfg.minimo || num > cfg.maximo) {
          errs[campo] = `Entre ${cfg.minimo} y ${cfg.maximo}`;
        }
      }
    }
    setErrores(errs);
    return Object.keys(errs).length === 0;
  }

  function enviar(e) {
    e.preventDefault();
    if (!validar()) return;
    onEnviar({
      paciente,
      variables,
      variables_adicionales: adicionales
    });
  }

  if (!esquema) {
    return <p className="mensaje-cargando">Cargando formulario...</p>;
  }

  return (
    <form onSubmit={enviar} noValidate>

      <div className="tarjeta">
        <h2 style={{ marginBottom: '1rem' }}>Datos de la paciente</h2>
        <div className="grid-formulario">
          <div className="grupo-campo">
            <label htmlFor="identificador">Número de documento *</label>
            <input
              id="identificador" name="identificador" type="text"
              value={paciente.identificador} onChange={cambiarPaciente}
              placeholder="Cédula o tarjeta de identidad"
            />
            {errores.identificador && <span className="error-campo">{errores.identificador}</span>}
          </div>
          <div className="grupo-campo">
            <label htmlFor="nombre">Nombres y apellidos</label>
            <input
              id="nombre" name="nombre" type="text"
              value={paciente.nombre} onChange={cambiarPaciente}
              placeholder="Nombre completo"
            />
          </div>
          <div className="grupo-campo">
            <label htmlFor="telefono">Teléfono de contacto</label>
            <input
              id="telefono" name="telefono" type="text"
              value={paciente.telefono} onChange={cambiarPaciente}
              placeholder="Número telefónico"
            />
          </div>
        </div>
      </div>

      <div className="tarjeta">
        <h2 style={{ marginBottom: '1rem' }}>Datos del formulario de citología</h2>
        <div className="grid-formulario">
          {CAMPOS_ADICIONALES.map(c => (
            <div className="grupo-campo" key={c.nombre}>
              <label htmlFor={`adic_${c.nombre}`}>{c.etiqueta}</label>
              <input
                id={`adic_${c.nombre}`} type={c.tipo}
                min={c.min} max={c.max}
                value={adicionales[c.nombre] ?? ''}
                onChange={e => cambiarAdicional(c.nombre, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="tarjeta">
        <h2 style={{ marginBottom: '1rem' }}>Variables clínicas (modelo predictivo)</h2>
        <div className="grid-formulario">
          {Object.entries(esquema.variables_numericas).map(([campo, cfg]) => (
            <div className="grupo-campo" key={campo}>
              <label htmlFor={campo}>
                {ETIQUETAS[campo] || campo}
                <span style={{ fontWeight: 400, color: '#888', marginLeft: 4 }}>
                  ({cfg.minimo}–{cfg.maximo})
                </span>
              </label>
              <input
                id={campo} type="number"
                min={cfg.minimo} max={cfg.maximo} step="1"
                value={variables[campo] ?? ''}
                onChange={e => cambiarVariable(campo, e.target.value)}
                placeholder="Dejar vacío = usar mediana"
              />
              {errores[campo] && <span className="error-campo">{errores[campo]}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="tarjeta">
        <h2 style={{ marginBottom: '1rem' }}>Variables de comportamiento y antecedentes</h2>
        <div className="grid-formulario">
          {Object.entries(esquema.variables_categoricas).map(([campo, opciones]) => (
            <div className="grupo-campo" key={campo}>
              <label htmlFor={campo}>{ETIQUETAS[campo] || campo}</label>
              <select
                id={campo}
                value={variables[campo] ?? ''}
                onChange={e => cambiarVariable(campo, e.target.value)}
              >
                <option value="">— No especificado —</option>
                {opciones.map(op => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <p className="disclaimer">
        Esta herramienta es un apoyo a la decisión clínica y no reemplaza el diagnóstico de laboratorio.
        Los resultados deben ser interpretados por personal de salud capacitado.
      </p>

      <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
        <button type="submit" className="btn btn-primario" disabled={cargando}>
          {cargando ? 'Calculando...' : 'Evaluar riesgo VPH'}
        </button>
      </div>
    </form>
  );
}
