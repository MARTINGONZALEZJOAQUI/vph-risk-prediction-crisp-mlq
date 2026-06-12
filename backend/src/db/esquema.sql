-- ============================================================
--  Sistema Predictivo VPH - Esquema SQLite
--  Centro de Salud Alfonso Lopez, Universidad del Cauca
-- ============================================================
PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
-- USUARIOS DEL SISTEMA (enfermeria y admin)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre        TEXT    NOT NULL,
  usuario       TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,           -- bcrypt hash
  rol           TEXT    NOT NULL DEFAULT 'enfermeria' CHECK(rol IN ('enfermeria','admin')),
  activo        INTEGER NOT NULL DEFAULT 1,
  creado_en     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------
-- PACIENTES (solo identificador; los datos clinicos van en variables_evaluacion)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pacientes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  identificador TEXT    NOT NULL UNIQUE,    -- cedula o tarjeta
  nombre        TEXT,                        -- nombre completo (opcional)
  telefono      TEXT,
  creado_en     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------
-- EVALUACIONES (resultado de cada ejecucion del modelo)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evaluaciones (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  paciente_id          INTEGER NOT NULL REFERENCES pacientes(id),
  usuario_id           INTEGER NOT NULL REFERENCES usuarios(id),
  fecha                TEXT    NOT NULL DEFAULT (datetime('now')),
  variables_json       TEXT    NOT NULL,    -- snapshot JSON de todas las variables
  clasificacion        TEXT    NOT NULL CHECK(clasificacion IN ('Positivo','Negativo')),
  probabilidad         REAL    NOT NULL,    -- probabilidad de positivo [0,1]
  confiabilidad        REAL    NOT NULL,    -- confiabilidad del resultado [0,1]
  nivel_riesgo         TEXT    DEFAULT 'pendiente',   -- bajo|medio|alto|pendiente
  recomendaciones      TEXT,               -- JSON array, vacio mientras este pendiente
  alerta_transferencia INTEGER DEFAULT 0   -- 0|1, 0 mientras umbrales esten pendientes
);

-- ------------------------------------------------------------
-- VARIABLES DE EVALUACION (tabla comprehensiva con todas las variables)
-- Incluye: variables de entrada del modelo (BD VPH) +
--          variables adicionales del formulario CITOLOGIAS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS variables_evaluacion (
  id                              INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluacion_id                   INTEGER NOT NULL UNIQUE REFERENCES evaluaciones(id),

  -- === VARIABLES DEL FORMULARIO DE CITOLOGIAS (adicionales al modelo) ===
  no_placa                        TEXT,    -- No. de Placa
  eps                             TEXT,    -- EPS / aseguradora
  fecha_ultima_menstruacion       TEXT,    -- FUM
  fecha_ultima_citologia          TEXT,    -- FUC
  procedimientos_cuello_uterino   TEXT,    -- procedimientos anteriores en cuello uterino
  gestaciones                     INTEGER, -- G
  partos                          INTEGER, -- P
  cesareas                        INTEGER, -- C
  abortos                         INTEGER, -- A
  hijos_vivos                     INTEGER, -- V
  no_patologia                    TEXT,    -- No. de PATOLOGIA (numero de muestra)
  resultado_patologia             TEXT,    -- resultado de patologia (texto libre)
  insatisfactorias                TEXT,    -- nota sobre muestras insatisfactorias
  seguimiento_llamada             TEXT,    -- nota de seguimiento por llamada
  fecha_envio_lamina              TEXT,    -- fecha de envio de lamina al laboratorio
  fecha_recibo_resultado          TEXT,    -- fecha de recibo del resultado

  -- === VARIABLES NUMERICAS DEL MODELO ===
  edad                            REAL,    -- edad en anos [18-69]
  edad_primera_menstruacion       REAL,    -- edad menarca [9-17]
  edad_primera_relacion_sexual    REAL,    -- edad inicio relaciones [10-27]
  num_comp_sexuales               REAL,    -- numero de companeros sexuales [1-21]
  n_hijos                         REAL,    -- numero de hijos [0-13]

  -- === VARIABLES CATEGORICAS DEL MODELO ===
  procedencia                     TEXT,    -- Rural | Urbano
  e_conyugal                      TEXT,    -- Con pareja | Sin pareja
  e_socioecon                     TEXT,    -- Dos o mas | Uno
  embarazos                       TEXT,    -- No | Si
  menopausia                      TEXT,    -- No | Si
  vida_sexual_activa              TEXT,    -- No | Si
  met_plan_hormo                  TEXT,    -- No | Si
  fumador                         TEXT,    -- NO | SI
  cocina_lena                     TEXT,    -- No | Si
  sabe_que_sirve_citologia        TEXT,    -- No | Si
  sabe_que_es_vph                 TEXT,    -- No | Si
  conoce_pruebas_vph              TEXT,    -- No | Si
  conoce_vacuna_vph               TEXT,    -- No | Si
  etnia                           TEXT,    -- Afro | Indigena | Mestiza
  nivel_edu_cat                   TEXT,    -- Ninguno | Primaria | Secundaria | Tecnico / Univ.
  esta_civil_cat                  TEXT,    -- Casada | Separada | Soltera
  ocupacion                       TEXT,    -- Ama de casa | Otras | Trab. Formal | Trab. Informal
  res_citologia_previa            TEXT,    -- Anormal | NS/NR | Negativa
  infeccion_vph_previa            TEXT,    -- NS/NR | No | Si
  met_plan_cat                    TEXT,    -- Barrera | Hormonales | Irreversibles | Mecanicos | Naturales | Ninguno
  presentado_ets                  TEXT,    -- NS/NR | No | Si
  fum_cat                         TEXT,    -- Diario | Ex-fumador | Nunca | Ocasional
  companero_trab_sexuales         TEXT     -- NS/NR | No | Si
);

-- ------------------------------------------------------------
-- AUDITORIA (log de operaciones sobre datos clinicos)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER REFERENCES usuarios(id),
  accion     TEXT    NOT NULL,
  detalle    TEXT,
  ip         TEXT,
  fecha      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------
-- INDICES
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_evaluaciones_paciente  ON evaluaciones(paciente_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_usuario   ON evaluaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_fecha     ON evaluaciones(fecha);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario      ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha        ON auditoria(fecha);
CREATE INDEX IF NOT EXISTS idx_pacientes_identificador ON pacientes(identificador);
