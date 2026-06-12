# Documentación Técnica — Sistema Predictivo de Riesgo VPH

**Centro de Salud Alfonso López · Universidad del Cauca · Grupo Salud Reproductiva**

---

## Tabla de contenidos

1. [Descripción general](#1-descripción-general)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Estructura de carpetas](#3-estructura-de-carpetas)
4. [Requisitos e instalación](#4-requisitos-e-instalación)
5. [Variables de entorno](#5-variables-de-entorno)
6. [Base de datos](#6-base-de-datos)
7. [Backend — módulos del servidor](#7-backend--módulos-del-servidor)
   - [Punto de entrada](#71-punto-de-entrada-appjs--serverjs)
   - [Conexión a la base de datos](#72-conexión-a-la-base-de-datos-dbconexionjs)
   - [Motor de inferencia VPH](#73-motor-de-inferencia-vph-modelomodeloInferenciaVPHjs)
   - [Generador de recomendaciones](#74-generador-de-recomendaciones-modelogeneradorRecomendacionesjs)
   - [Repositorios](#75-repositorios-capa-de-acceso-a-datos)
   - [Controladores](#76-controladores-lógica-de-negocio)
   - [Middlewares](#77-middlewares)
   - [Rutas](#78-rutas)
8. [API RESTful — referencia completa](#8-api-restful--referencia-completa)
9. [Artefactos del modelo](#9-artefactos-del-modelo)
10. [Frontend — componentes React](#10-frontend--componentes-react)
    - [App y enrutamiento](#101-app-y-enrutamiento-appjsx)
    - [Páginas](#102-páginas)
    - [Componentes](#103-componentes)
    - [Servicio de API](#104-servicio-de-api-serviciosapijs)
    - [Estilos](#105-estilos-estilosglobalcss)
11. [Seguridad](#11-seguridad)
12. [Pruebas](#12-pruebas)
13. [Flujo completo de una evaluación](#13-flujo-completo-de-una-evaluación)
14. [Placeholders pendientes de datos clínicos](#14-placeholders-pendientes-de-datos-clínicos)
15. [Glosario](#15-glosario)

---

## 1. Descripción general

El **Sistema Predictivo de Riesgo VPH** es una herramienta de apoyo a la decisión clínica para el personal de enfermería del Centro de Salud Alfonso López. A partir de variables demográficas, clínicas y conductuales de la paciente, el sistema estima la probabilidad de resultado positivo de infección por el Virus del Papiloma Humano (VPH), la clasifica como **Positivo** o **Negativo**, y entrega el **porcentaje de riesgo de resultado positivo** de la paciente. Ese porcentaje es la probabilidad que calcula el modelo expresada en escala de 0 a 100.

### Características principales

- Inferencia mediante un microservicio Python local que ejecuta el modelo HistGradientBoosting de scikit-learn.
- Base de datos SQLite de archivo único, ideal para consultorio sin servidor externo.
- Formulario dinámico construido desde el esquema del modelo, siempre sincronizado.
- Historial cronológico de evaluaciones por paciente.
- Informe imprimible desde el navegador.
- Administración de usuarios con RBAC (roles: `enfermeria` y `admin`).
- Log de auditoría completo sobre toda operación clínica.
- Placeholders para nivel de riesgo y recomendaciones, que se activan sin tocar el código cuando el director clínico entregue los umbrales.

### Limitaciones conocidas del modelo

| Métrica | Valor |
|---------|-------|
| ROC-AUC | ≈ 0.63 |
| F1 (umbral clínico) | ≈ 0.30 |
| PR-AUC | ≈ 0.23 |
| Umbral de clasificación | 0.1303 |

El rendimiento refleja el techo del conjunto de datos disponible. Para mejorarlo se requieren predictores adicionales como resultado de HPV-DNA o citología actual.

> **Aviso clínico:** Esta herramienta es un apoyo a la decisión y no reemplaza el diagnóstico de laboratorio ni el criterio del profesional de salud.

---

## 2. Arquitectura del sistema

```
┌─────────────────────────────────────────────────────┐
│                   Navegador (React)                  │
│  PaginaInicial · InicioSesion · Consulta · Historial │
│  AdminUsuarios · FormularioPostconsulta              │
└───────────────────────┬─────────────────────────────┘
                        │  HTTP/JSON  (proxy Vite en dev,
                        │             CORS en producción)
┌───────────────────────▼─────────────────────────────┐
│            API RESTful (Node.js + Express)            │
│                                                       │
│  /api/auth      → ControladorAutenticacion           │
│  /api/esquema   → ControladorEvaluacion              │
│  /api/evaluaciones → ControladorEvaluacion           │
│                    ControladorInforme                 │
│  /api/pacientes → ControladorHistorial               │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │         ModeloInferenciaVPH                  │    │
│  │  Cliente HTTP del microservicio de inferencia│    │
│  └──────────────────────┬──────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │         GeneradorRecomendaciones             │    │
│  │  Lee artifacts/config_riesgo.json            │    │
│  │  Nivel de riesgo + recomendaciones           │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  Repositorios DAO → SQLite (vph.db)                  │
└──────────────────────────┬──────────────────────────┘
                           │  HTTP/JSON  (127.0.0.1:8001)
┌──────────────────────────▼──────────────────────────┐
│        Microservicio de inferencia (Python)          │
│  inferencia/servicio.py                               │
│  Carga artifacts/modelo_vph.joblib (HistGB)           │
│  POST /predecir → porcentaje de riesgo de positivo    │
└─────────────────────────────────────────────────────┘
```

### Patrón de diseño: Frontera · Control · Entidad

El sistema sigue el patrón FCE definido en el documento de construcción:

| Capa | Componentes |
|------|-------------|
| **Frontera (Frontend)** | `FormularioConsulta`, `PanelResultadoRiesgo`, `VistaHistorialPaciente`, `FormularioPostconsulta` |
| **Control (Backend)** | `ControladorEvaluacion`, `ControladorAutenticacion`, `ControladorHistorial`, `ControladorInforme`, `ModeloInferenciaVPH`, `GeneradorRecomendaciones` |
| **Entidad (Datos)** | Tablas SQLite: `evaluaciones`, `variables_evaluacion`, `pacientes`, `usuarios`, `auditoria` |

---

## 3. Estructura de carpetas

```
sistema-vph/
│
├── README.md                      Guía rápida de arranque
├── DOCUMENTACION.md               Este archivo
├── vph.db                         Base de datos SQLite (se crea en el primer arranque)
│
├── backend/
│   ├── package.json
│   ├── artifacts/                 Artefactos del modelo
│   │   ├── modelo_vph.joblib         Modelo HistGB (preprocesador + clasificador + calibrador)
│   │   ├── umbral.json               Umbral de clasificación y métricas del modelo
│   │   ├── esquema_entrada.json      Rangos y categorías válidas para el formulario
│   │   └── config_riesgo.json        Umbrales de nivel de riesgo (pendiente de completar)
│   ├── inferencia/
│   │   └── servicio.py               Microservicio Python que ejecuta el modelo y devuelve el riesgo
│   ├── src/
│   │   ├── app.js                    Configura Express y exporta la app (sin arrancar)
│   │   ├── server.js                 Semilla de BD + arranque del servidor HTTP
│   │   ├── db/
│   │   │   ├── esquema.sql           DDL completo de las 5 tablas SQLite
│   │   │   └── conexion.js           Singleton DatabaseSync (node:sqlite)
│   │   ├── modelo/
│   │   │   ├── modeloInferenciaVPH.js       Cliente del microservicio de inferencia
│   │   │   └── generadorRecomendaciones.js  Nivel de riesgo y recomendaciones
│   │   ├── repositorios/
│   │   │   ├── repositorioUsuarios.js
│   │   │   ├── repositorioPacientes.js
│   │   │   ├── repositorioEvaluaciones.js
│   │   │   └── repositorioAuditoria.js
│   │   ├── controladores/
│   │   │   ├── controladorAuth.js
│   │   │   ├── controladorEvaluacion.js
│   │   │   ├── controladorHistorial.js
│   │   │   └── controladorInforme.js
│   │   ├── middlewares/
│   │   │   ├── auth.js               Verificación JWT y RBAC
│   │   │   ├── validacion.js         Validación de rangos y categorías del formulario
│   │   │   └── errores.js            Manejador global de errores Express
│   │   └── rutas/
│   │       ├── auth.js
│   │       ├── evaluaciones.js
│   │       ├── historial.js
│   │       └── informe.js
│   └── tests/
│       ├── inferencia.test.js        3 pruebas unitarias del cliente de inferencia
│       └── api.test.js               8 pruebas de integración de la API
│
└── frontend/
    ├── package.json
    ├── vite.config.js                Proxy /api → localhost:3001
    ├── index.html
    └── src/
        ├── main.jsx                  Punto de entrada React
        ├── App.jsx                   Enrutamiento + cabecera + gestión de sesión
        ├── estilos/
        │   └── global.css            Paleta institucional, tarjetas, formularios, tabla
        ├── servicios/
        │   └── api.js                Capa fetch hacia el backend
        ├── paginas/
        │   ├── PaginaInicial.jsx     Bienvenida, propósito, instrucciones
        │   ├── InicioSesion.jsx      Login con JWT
        │   ├── Consulta.jsx          Flujo completo: formulario → resultado → informe
        │   ├── Historial.jsx         Búsqueda y tabla cronológica por paciente
        │   └── AdminUsuarios.jsx     Gestión de usuarios (solo admin)
        └── componentes/
            ├── FormularioConsulta.jsx       Formulario dinámico de variables clínicas
            ├── PanelResultadoRiesgo.jsx     Panel de resultado con colores y alerta
            ├── VistaHistorialPaciente.jsx   Buscador + tabla de evaluaciones
            └── FormularioPostconsulta.jsx   Informe imprimible
```

---

## 4. Requisitos e instalación

### Requisitos del sistema

| Componente | Versión mínima | Notas |
|------------|---------------|-------|
| Node.js | 22.0.0 | Necesario para `node:sqlite` built-in |
| npm | 9.0.0 | Incluido con Node.js |
| Python | 3.12 | Microservicio de inferencia, con el entorno `sistema-vph/.venv` (scikit-learn, pandas, joblib) |
| Sistema operativo | Windows / Linux / macOS | Sin restricción |

### Instalación del backend

```bash
cd sistema-vph/backend
npm install
```

Dependencias instaladas:

| Paquete | Versión | Uso |
|---------|---------|-----|
| `express` | ^4.18.2 | Servidor HTTP y enrutamiento |
| `bcryptjs` | ^2.4.3 | Hash de contraseñas (puro JS, sin compilar) |
| `jsonwebtoken` | ^9.0.2 | Emisión y verificación de tokens JWT |
| `cors` | ^2.8.5 | Cabeceras CORS para el frontend |

> La base de datos usa **`node:sqlite`**, módulo nativo de Node.js 22+. No se instala ningún paquete adicional para SQLite.

### Instalación del frontend

```bash
cd sistema-vph/frontend
npm install
```

Dependencias principales:

| Paquete | Versión | Uso |
|---------|---------|-----|
| `react` + `react-dom` | ^18.3.1 | Framework de UI |
| `react-router-dom` | ^6.26.0 | Enrutamiento SPA |
| `vite` | ^5.4.0 | Servidor de desarrollo y bundler |
| `@vitejs/plugin-react` | ^4.3.1 | Transformación JSX |

### Arranque en desarrollo

```bash
# Terminal 1 — microservicio de inferencia (Python)
cd sistema-vph/backend
npm run inferencia
# → http://127.0.0.1:8001  (carga modelo_vph.joblib del modelo HistGB)

# Terminal 2 — backend
cd sistema-vph/backend
npm run dev
# → http://localhost:3001
# Primera ejecución: crea vph.db y el usuario admin automáticamente

# Terminal 3 — frontend
cd sistema-vph/frontend
npm run dev
# → http://localhost:5173
```

El microservicio de inferencia debe estar en ejecución para que el backend pueda evaluar. Si no responde, el backend devuelve `503` al crear una evaluación. En desarrollo, Vite actúa como proxy: todas las peticiones a `/api` se reenvían a `http://localhost:3001`.

### Credenciales iniciales

| Campo | Valor |
|-------|-------|
| Usuario | `admin` |
| Contraseña | `admin1234` |

> **Cambiar la contraseña** en el primer inicio de sesión desde el panel de Administración de Usuarios.

---

## 5. Variables de entorno

Todas las variables tienen valores predeterminados para desarrollo. En producción se deben definir.

### Backend (`backend/.env`)

| Variable | Predeterminado | Descripción |
|----------|---------------|-------------|
| `PORT` | `3001` | Puerto del servidor Express |
| `JWT_SECRET` | `vph_dev_secret_cambiar_en_produccion` | Secreto de firma de tokens JWT. **Cambiar en producción.** |
| `JWT_EXPIRA` | `8h` | Tiempo de expiración del token JWT |
| `FRONTEND_URL` | `http://localhost:5173` | Origen permitido en CORS |
| `INFERENCIA_URL` | `http://127.0.0.1:8001` | URL del microservicio de inferencia que el backend consume |
| `DB_PATH_OVERRIDE` | *(no definido)* | Ruta alternativa de la BD. Acepta `:memory:` para una base de datos en memoria. |

### Frontend (`frontend/.env`)

En desarrollo no se requiere ninguna variable; el proxy de Vite maneja la comunicación con el backend.

Para producción (build estático):

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `VITE_API_BASE` | `https://mi-servidor/api` | URL base del backend (si no se usa proxy) |

---

## 6. Base de datos

La base de datos es un archivo SQLite único (`vph.db`) ubicado en la raíz de `sistema-vph/`. Se crea automáticamente al primer arranque del servidor aplicando el esquema definido en `backend/src/db/esquema.sql`.

### Diagrama de tablas

```
┌──────────────┐       ┌────────────────────┐       ┌──────────────────────────┐
│   usuarios   │       │    evaluaciones     │       │   variables_evaluacion    │
├──────────────┤       ├────────────────────┤       ├──────────────────────────┤
│ id (PK)      │──┐    │ id (PK)            │──┐    │ id (PK)                  │
│ nombre       │  │    │ paciente_id (FK)   │  └───▶│ evaluacion_id (FK UNIQUE)│
│ usuario      │  └───▶│ usuario_id (FK)    │       │ [16 campos CITOLOGIAS]   │
│ password_hash│       │ fecha              │       │ [5 variables numéricas]  │
│ rol          │       │ variables_json     │       │ [23 variables categóricas]│
│ activo       │       │ clasificacion      │       └──────────────────────────┘
│ creado_en    │       │ probabilidad       │
└──────────────┘       │ confiabilidad      │       ┌──────────────┐
                       │ nivel_riesgo       │       │   pacientes   │
┌──────────────┐       │ recomendaciones    │       ├──────────────┤
│   auditoria  │       │ alerta_transf...   │  ┌───│ id (PK)      │
├──────────────┤       └────────────────────┘  │   │ identificador│
│ id (PK)      │                               │   │ nombre       │
│ usuario_id   │       ┌────────────────────┐  │   │ telefono     │
│ accion       │       │    evaluaciones     │◀─┘   │ creado_en    │
│ detalle      │       │  (paciente_id FK)  │       └──────────────┘
│ ip           │
│ fecha        │
└──────────────┘
```

### Descripción de tablas

#### `usuarios`

Almacena los usuarios del sistema con su contraseña hasheada.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER PK | Identificador autoincremental |
| `nombre` | TEXT | Nombre completo del usuario |
| `usuario` | TEXT UNIQUE | Nombre de login |
| `password_hash` | TEXT | Hash bcrypt de la contraseña (12 rondas) |
| `rol` | TEXT | `enfermeria` o `admin` |
| `activo` | INTEGER | `1` = activo, `0` = desactivado |
| `creado_en` | TEXT | Fecha ISO de creación |

#### `pacientes`

Registro mínimo de la paciente. Los datos clínicos detallados se guardan en `variables_evaluacion`.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER PK | Identificador autoincremental |
| `identificador` | TEXT UNIQUE | Cédula o tarjeta de identidad |
| `nombre` | TEXT | Nombre completo (opcional) |
| `telefono` | TEXT | Teléfono de contacto (opcional) |
| `creado_en` | TEXT | Fecha ISO de primera evaluación |

#### `evaluaciones`

Resultado de cada ejecución del modelo predictivo.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER PK | Identificador autoincremental |
| `paciente_id` | INTEGER FK | Referencia a `pacientes` |
| `usuario_id` | INTEGER FK | Referencia a `usuarios` (quién registró) |
| `fecha` | TEXT | Fecha y hora ISO de la evaluación |
| `variables_json` | TEXT | Snapshot JSON de las variables del modelo |
| `clasificacion` | TEXT | `Positivo` o `Negativo` |
| `probabilidad` | REAL | Probabilidad de positivo ∈ [0, 1] |
| `confiabilidad` | REAL | Copia de la probabilidad de positivo ∈ [0, 1], conservada por compatibilidad |
| `nivel_riesgo` | TEXT | `bajo`, `medio`, `alto` o `pendiente` |
| `recomendaciones` | TEXT | JSON array de recomendaciones clínicas |
| `alerta_transferencia` | INTEGER | `1` si requiere derivación urgente, `0` si no |

#### `variables_evaluacion`

Tabla comprehensiva con todas las variables clínicas de la evaluación. Relacionada 1:1 con `evaluaciones`.

**Variables adicionales del formulario CITOLOGIAS (16 columnas):**

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `no_placa` | TEXT | Número de placa del portaobjetos |
| `eps` | TEXT | EPS o aseguradora de la paciente |
| `fecha_ultima_menstruacion` | TEXT | Fecha última menstruación (FUM) |
| `fecha_ultima_citologia` | TEXT | Fecha última citología (FUC) |
| `procedimientos_cuello_uterino` | TEXT | Procedimientos previos en cuello uterino |
| `gestaciones` | INTEGER | Número de gestaciones (G) |
| `partos` | INTEGER | Número de partos (P) |
| `cesareas` | INTEGER | Número de cesáreas (C) |
| `abortos` | INTEGER | Número de abortos (A) |
| `hijos_vivos` | INTEGER | Número de hijos vivos (V) |
| `no_patologia` | TEXT | Número de muestra de patología |
| `resultado_patologia` | TEXT | Resultado de patología (texto libre) |
| `insatisfactorias` | TEXT | Nota sobre muestras insatisfactorias |
| `seguimiento_llamada` | TEXT | Nota de seguimiento por llamada |
| `fecha_envio_lamina` | TEXT | Fecha de envío de lámina al laboratorio |
| `fecha_recibo_resultado` | TEXT | Fecha de recibo del resultado |

**Variables numéricas del modelo (5 columnas):**

| Columna | Tipo | Rango válido |
|---------|------|-------------|
| `edad` | REAL | 18 – 69 años |
| `edad_primera_menstruacion` | REAL | 9 – 17 años |
| `edad_primera_relacion_sexual` | REAL | 10 – 27 años |
| `num_comp_sexuales` | REAL | 1 – 21 |
| `n_hijos` | REAL | 0 – 13 |

**Variables categóricas del modelo (23 columnas):**

| Columna | Opciones válidas |
|---------|-----------------|
| `procedencia` | Rural · Urbano |
| `e_conyugal` | Con pareja · Sin pareja |
| `e_socioecon` | Dos o más · Uno |
| `embarazos` | No · Si |
| `menopausia` | No · Si |
| `vida_sexual_activa` | No · Si |
| `met_plan_hormo` | No · Si |
| `fumador` | NO · SI |
| `cocina_lena` | No · Si |
| `sabe_que_sirve_citologia` | No · Si |
| `sabe_que_es_vph` | No · Si |
| `conoce_pruebas_vph` | No · Si |
| `conoce_vacuna_vph` | No · Si |
| `etnia` | Afro · Indígena · Mestiza |
| `nivel_edu_cat` | Ninguno · Primaria · Secundaria · Técnico / Univ. |
| `esta_civil_cat` | Casada · Separada · Soltera |
| `ocupacion` | Ama de casa · Otras · Trab. Formal · Trab. Informal |
| `res_citologia_previa` | Anormal · NS/NR · Negativa |
| `infeccion_vph_previa` | NS/NR · No · Si |
| `met_plan_cat` | Barrera · Hormonales · Irreversibles · Mecánicos · Naturales · Ninguno |
| `presentado_ets` | NS/NR · No · Si |
| `fum_cat` | Diario · Ex-fumador · Nunca · Ocasional |
| `companero_trab_sexuales` | NS/NR · No · Si |

#### `auditoria`

Registro inmutable de toda operación sobre datos clínicos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER PK | Identificador autoincremental |
| `usuario_id` | INTEGER FK | Usuario que realizó la acción |
| `accion` | TEXT | Código de acción: `LOGIN`, `LOGOUT`, `CREAR_EVALUACION`, `VER_INFORME`, `CREAR_USUARIO`, `EDITAR_USUARIO`, `ELIMINAR_USUARIO` |
| `detalle` | TEXT | Descripción legible de la acción |
| `ip` | TEXT | Dirección IP de origen |
| `fecha` | TEXT | Fecha y hora ISO |

### Índices

```sql
idx_evaluaciones_paciente   ON evaluaciones(paciente_id)
idx_evaluaciones_usuario    ON evaluaciones(usuario_id)
idx_evaluaciones_fecha      ON evaluaciones(fecha)
idx_auditoria_usuario       ON auditoria(usuario_id)
idx_auditoria_fecha         ON auditoria(fecha)
idx_pacientes_identificador ON pacientes(identificador)
```

---

## 7. Backend — módulos del servidor

### 7.1 Punto de entrada: `app.js` y `server.js`

La separación entre `app.js` y `server.js` permite importar la aplicación Express sin efectos secundarios, es decir sin escuchar en ningún puerto.

**`app.js`** — configura Express y exporta la instancia:
- Aplica CORS restringido al origen del frontend.
- Registra las rutas `/api/esquema`, `/api/auth`, `/api/evaluaciones`, `/api/pacientes`.
- Sirve los artefactos del modelo como archivos estáticos en `/artifacts`.
- Agrega el manejador global de errores al final.

**`server.js`** — arranca el servidor:
1. Ejecuta `semilla()`: crea el usuario `admin` con contraseña `admin1234` si no existe ningún administrador en la base de datos.
2. Llama a `app.listen(PORT)`.

```bash
# Arranque normal
node src/server.js

# Arranque con recarga automática (desarrollo)
node --watch src/server.js
```

---

### 7.2 Conexión a la base de datos: `db/conexion.js`

Implementa el patrón **Singleton** sobre `DatabaseSync` de `node:sqlite`.

```js
const { obtenerDB } = require('./db/conexion');
const db = obtenerDB(); // misma instancia en toda la aplicación
```

- Si `vph.db` no existe, lo crea y aplica `esquema.sql` automáticamente.
- Activa `PRAGMA foreign_keys = ON` y `journal_mode = WAL` en cada apertura.
- Si la variable `DB_PATH_OVERRIDE` está definida (p. ej. `:memory:`), la usa en lugar del archivo, lo que permite trabajar con una base de datos en memoria sin afectar `vph.db`.

---

### 7.3 Motor de inferencia VPH: `modelo/modeloInferenciaVPH.js` y `inferencia/servicio.py`

La inferencia se reparte en dos piezas. El módulo de control **ModeloInferenciaVPH** es un cliente HTTP que delega la predicción en el microservicio Python, que es quien ejecuta el modelo.

#### Microservicio de inferencia: `inferencia/servicio.py`

Servidor de la biblioteca estándar de Python que carga `artifacts/modelo_vph.joblib` una sola vez al arrancar. El artefacto contiene el preprocesador, el clasificador HistGradientBoosting y el calibrador isotónico. Escucha en `127.0.0.1:8001`.

- `GET /health` devuelve el estado, el nombre del modelo y el umbral.
- `POST /predecir` recibe `{ "variables": { ... } }`, arma una fila con las 28 columnas que el modelo espera, imputa internamente lo que falte, y calcula la probabilidad de positivo. La probabilidad **es** el riesgo de resultado positivo de la paciente; el porcentaje de riesgo es esa probabilidad multiplicada por 100.

```json
{
  "probabilidad_positivo": 0.087,
  "porcentaje_riesgo": 8.7,
  "clasificacion": "Negativo",
  "umbral": 0.1303
}
```

#### Cliente en el backend: `modeloInferenciaVPH.js`

Expone `predecir(datos)`, una función asíncrona que envía las variables al microservicio con `fetch` y devuelve `{ clasificacion, probabilidad_positivo, porcentaje_riesgo }`. Si el microservicio no responde, lanza un error que el controlador convierte en una respuesta `503` con un mensaje claro.

#### Algoritmo de predicción

1. El preprocesador imputa los faltantes, escala las variables numéricas y codifica las categóricas.
2. El clasificador HistGradientBoosting calcula la probabilidad de positivo.
3. El calibrador isotónico ajusta esa probabilidad para que el porcentaje de riesgo sea fiable.
4. Clasifica: `Positivo` si `prob ≥ umbral` (0.1303), `Negativo` en caso contrario.
5. El porcentaje de riesgo es `prob × 100`.

---

### 7.4 Generador de recomendaciones: `modelo/generadorRecomendaciones.js`

Lee `artifacts/config_riesgo.json` en cada llamada (sin caché), lo que permite actualizar los umbrales sin reiniciar el servidor.

#### Lógica

```
Si umbral_bajo_medio = null  O  umbral_medio_alto = null:
    → nivel_riesgo = "pendiente"
    → recomendaciones = []
    → alerta_transferencia = false
Sino:
    Si prob < umbral_bajo_medio   → nivel = "bajo"
    Si prob < umbral_medio_alto   → nivel = "medio"
    En otro caso                  → nivel = "alto"
    alerta_transferencia = (clasificacion == "Positivo") AND (nivel == "alto")
```

#### Salida de `calcular(clasificacion, probabilidad)`

```json
{
  "nivelRiesgo": "pendiente",
  "recomendaciones": [],
  "alertaTransferencia": false
}
```

---

### 7.5 Repositorios (capa de acceso a datos)

Todos los repositorios obtienen la conexión mediante `obtenerDB()` y utilizan `db.prepare(...).run(...)` o `.get(...)` o `.all(...)` para operaciones síncronas.

#### `repositorioUsuarios.js`

| Función | Descripción |
|---------|-------------|
| `buscarPorUsuario(usuario)` | Busca un usuario activo por nombre de login |
| `buscarPorId(id)` | Devuelve datos públicos de un usuario (sin hash) |
| `listarTodos()` | Lista todos los usuarios ordenados por fecha de creación |
| `crear({ nombre, usuario, passwordHash, rol })` | Inserta un usuario nuevo y devuelve su `id` |
| `actualizar(id, campos)` | Actualiza nombre, hash, rol o estado activo |
| `eliminar(id)` | Desactivación lógica: pone `activo = 0`. El registro se conserva. |

#### `repositorioPacientes.js`

| Función | Descripción |
|---------|-------------|
| `buscarPorIdentificador(identificador)` | Busca por cédula o tarjeta |
| `buscarPorId(id)` | Busca por id interno |
| `crearOObtener({ identificador, nombre, telefono })` | Devuelve el paciente existente o lo crea si es nuevo |
| `listarTodos()` | Lista todos los pacientes |

#### `repositorioEvaluaciones.js`

| Función | Descripción |
|---------|-------------|
| `crear({ ... })` | Inserta en `evaluaciones` y `variables_evaluacion` dentro de una transacción `BEGIN/COMMIT`. Devuelve el `id` de la evaluación. |
| `buscarPorId(id)` | Devuelve la evaluación con datos del paciente y el usuario que la registró |
| `historialPorPaciente(pacienteId)` | Lista las evaluaciones de una paciente ordenadas por fecha descendente |
| `variablesDeEvaluacion(evaluacionId)` | Devuelve la fila completa de `variables_evaluacion` |

> **Nota sobre transacciones:** `node:sqlite` no dispone del método `.transaction()` de `better-sqlite3`. Las transacciones se implementan con `db.exec('BEGIN')` / `db.exec('COMMIT')` y `db.exec('ROLLBACK')` en el bloque `catch`.

#### `repositorioAuditoria.js`

| Función | Descripción |
|---------|-------------|
| `registrar({ usuarioId, accion, detalle, ip })` | Inserta un registro en la tabla `auditoria` |
| `listar({ limite, offset })` | Lista los registros más recientes con paginación |

---

### 7.6 Controladores (lógica de negocio)

#### `controladorAuth.js`

Gestiona autenticación y administración de usuarios.

| Función | Ruta | Descripción |
|---------|------|-------------|
| `login` | `POST /api/auth/login` | Verifica credenciales con bcrypt, emite token JWT, registra en auditoría |
| `logout` | `POST /api/auth/logout` | Registra el cierre de sesión en auditoría |
| `listarUsuarios` | `GET /api/auth/usuarios` | Solo accesible con rol `admin` |
| `crearUsuario` | `POST /api/auth/usuarios` | Hashea la contraseña con bcrypt (12 rondas) y crea el usuario |
| `editarUsuario` | `PUT /api/auth/usuarios/:id` | Actualiza nombre, contraseña y/o rol. Bloquea edición de cuentas admin y de la propia cuenta. |
| `eliminarUsuario` | `DELETE /api/auth/usuarios/:id` | Desactivación lógica (`activo = 0`). Bloquea eliminación de cuentas admin y de la propia cuenta. |

#### `controladorEvaluacion.js`

Orquesta el flujo central del sistema.

| Función | Ruta | Descripción |
|---------|------|-------------|
| `obtenerEsquema` | `GET /api/esquema` | Devuelve `esquema_entrada.json` para construir el formulario |
| `crearEvaluacion` | `POST /api/evaluaciones` | Flujo: obtener/crear paciente → inferir → calcular nivel → persistir → auditar |

#### `controladorHistorial.js`

| Función | Ruta | Descripción |
|---------|------|-------------|
| `historialPorPaciente` | `GET /api/pacientes/:identificador/historial` | Devuelve lista cronológica de evaluaciones |

#### `controladorInforme.js`

| Función | Ruta | Descripción |
|---------|------|-------------|
| `obtenerInforme` | `GET /api/evaluaciones/:id/informe` | Consolida todos los datos de una evaluación para el informe imprimible |

---

### 7.7 Middlewares

#### `auth.js`

```
verificarToken(req, res, next)
  → Lee el encabezado Authorization: Bearer <token>
  → Verifica la firma con JWT_SECRET
  → Agrega req.usuario = { id, usuario, rol }
  → Si falta o es inválido → 401 Unauthorized

soloAdmin(req, res, next)
  → Si req.usuario.rol !== 'admin' → 403 Forbidden
```

#### `validacion.js`

Valida el cuerpo de `POST /api/evaluaciones` contra `esquema_entrada.json`:

- **Variables numéricas:** si se proporcionan, deben ser números dentro del rango `[minimo, maximo]`. Los campos vacíos se permiten (se imputarán con la mediana en el motor).
- **Variables categóricas:** si se proporcionan, deben estar en la lista de opciones. Los campos vacíos se permiten (se imputarán como `"Desconocido"`).
- Devuelve `400 Bad Request` con un array `detalles` listando todos los errores encontrados.

#### `errores.js`

Manejador global de Express de cuatro argumentos `(err, req, res, next)`. Registra el error en consola y devuelve una respuesta JSON genérica con el código HTTP adecuado.

---

### 7.8 Rutas

| Archivo | Prefijo | Rutas registradas |
|---------|---------|------------------|
| `rutas/auth.js` | `/api/auth` | `POST /login`, `POST /logout`, `GET /usuarios`, `POST /usuarios`, `PUT /usuarios/:id`, `DELETE /usuarios/:id` |
| `rutas/evaluaciones.js` | `/api/evaluaciones` | `POST /` |
| `rutas/historial.js` | `/api/pacientes` | `GET /:identificador/historial` |
| `rutas/informe.js` | `/api/evaluaciones` | `GET /:id/informe` |
| *(app.js directo)* | `/api` | `GET /esquema`, `GET /health` |

---

## 8. API RESTful — referencia completa

Todas las rutas salvo `POST /api/auth/login` y `GET /api/health` requieren el encabezado:

```
Authorization: Bearer <token>
```

Los errores siempre devuelven JSON con el campo `error` y opcionalmente `detalles`.

---

### `GET /api/health`

Health-check. No requiere autenticación.

**Respuesta 200:**
```json
{ "estado": "ok", "sistema": "VPH Prediccion", "version": "1.0.0" }
```

---

### `POST /api/auth/login`

Inicia sesión. No requiere token previo.

**Cuerpo:**
```json
{
  "usuario": "admin",
  "contrasena": "admin1234"
}
```

**Respuesta 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "rol": "admin",
  "nombre": "Administrador"
}
```

**Errores:**
- `400` — faltan campos
- `401` — credenciales incorrectas

---

### `POST /api/auth/logout`

Cierra sesión y registra en auditoría.

**Respuesta 200:**
```json
{ "mensaje": "Sesion cerrada" }
```

---

### `GET /api/auth/usuarios` *(solo admin)*

Lista todos los usuarios del sistema.

**Respuesta 200:**
```json
[
  {
    "id": 1,
    "nombre": "Administrador",
    "usuario": "admin",
    "rol": "admin",
    "activo": 1,
    "creado_en": "2026-06-02 10:00:00"
  }
]
```

---

### `POST /api/auth/usuarios` *(solo admin)*

Crea un nuevo usuario.

**Cuerpo:**
```json
{
  "nombre": "María López",
  "usuario": "mlopez",
  "contrasena": "clave1234",
  "rol": "enfermeria"
}
```

**Respuesta 201:**
```json
{ "id": 2, "mensaje": "Usuario creado" }
```

**Errores:**
- `400` — faltan campos requeridos
- `409` — el nombre de usuario ya existe

---

### `PUT /api/auth/usuarios/:id` *(solo admin)*

Actualiza nombre completo, contraseña y/o rol de un usuario de enfermería.

**Restricciones de seguridad:**
- No se puede editar una cuenta con rol `admin` → `403`
- No se puede editar la propia cuenta del admin autenticado → `403`
- La contraseña, si se envía, debe tener al menos 6 caracteres → `400`

**Cuerpo (todos los campos son opcionales):**
```json
{
  "nombre": "Enf. María López",
  "contrasena": "nueva2024",
  "rol": "enfermeria"
}
```

**Respuesta 200:**
```json
{ "mensaje": "Usuario actualizado" }
```

**Errores:**
- `400` — contraseña demasiado corta o sin campos para actualizar
- `403` — intento de editar cuenta admin o la propia cuenta
- `404` — usuario no encontrado

---

### `DELETE /api/auth/usuarios/:id` *(solo admin)*

Desactiva lógicamente un usuario de enfermería (`activo = 0`). El registro se conserva en la base de datos para mantener la integridad de los registros de auditoría y evaluaciones.

**Restricciones de seguridad:**
- No se puede eliminar una cuenta con rol `admin` → `403`
- No se puede eliminar la propia cuenta → `403`

**Respuesta 200:**
```json
{ "mensaje": "Usuario desactivado" }
```

**Errores:**
- `403` — intento de eliminar cuenta admin o la propia cuenta
- `404` — usuario no encontrado

> Un usuario desactivado no puede iniciar sesión (`buscarPorUsuario` filtra por `activo = 1`). Sus evaluaciones y registros de auditoría anteriores se conservan íntegros.

---

### `GET /api/esquema`

Devuelve el esquema de entrada del modelo para construir el formulario dinámico.

**Respuesta 200:**
```json
{
  "objetivo": "res_vph",
  "umbral_clasificacion": 0.1303,
  "variables_numericas": {
    "edad": { "tipo": "numero", "minimo": 18.0, "maximo": 69.0 },
    "...": {}
  },
  "variables_categoricas": {
    "procedencia": ["Rural", "Urbano"],
    "...": []
  }
}
```

---

### `POST /api/evaluaciones`

Crea una evaluación de riesgo VPH. Este es el endpoint principal del sistema.

**Cuerpo:**
```json
{
  "paciente": {
    "identificador": "12345678",
    "nombre": "Ana García",
    "telefono": "3001234567"
  },
  "variables": {
    "edad": 35,
    "n_hijos": 2,
    "num_comp_sexuales": 1,
    "edad_primera_menstruacion": 13,
    "edad_primera_relacion_sexual": 17,
    "procedencia": "Urbano",
    "infeccion_vph_previa": "No",
    "res_citologia_previa": "Negativa",
    "fumador": "NO",
    "menopausia": "No"
  },
  "variables_adicionales": {
    "no_placa": "2024-001",
    "eps": "Sura",
    "fecha_ultima_menstruacion": "2026-05-15",
    "gestaciones": 3,
    "partos": 2
  }
}
```

> Los campos de `variables` vacíos o no incluidos se imputarán automáticamente (numéricos con la mediana, categóricos como `"Desconocido"`). No es necesario enviar todos los campos.

**Respuesta 201:**
```json
{
  "id": 42,
  "clasificacion": "Negativo",
  "probabilidad_positivo": 0.08741,
  "porcentaje_riesgo": 8.7,
  "nivel_riesgo": "pendiente",
  "recomendaciones": [],
  "alerta_transferencia": false,
  "paciente": {
    "id": 7,
    "identificador": "12345678",
    "nombre": "Ana García"
  }
}
```

**Errores:**
- `400` — falta el identificador del paciente o una variable tiene valor fuera de rango
- `401` — sin autenticación

---

### `GET /api/pacientes/:identificador/historial`

Devuelve el historial cronológico (más reciente primero) de una paciente.

**Ejemplo:** `GET /api/pacientes/12345678/historial`

**Respuesta 200:**
```json
{
  "paciente": {
    "id": 7,
    "identificador": "12345678",
    "nombre": "Ana García"
  },
  "total": 2,
  "evaluaciones": [
    {
      "id": 42,
      "fecha": "2026-06-02 14:30:00",
      "clasificacion": "Negativo",
      "probabilidad": 0.08741,
      "nivel_riesgo": "pendiente",
      "alerta_transferencia": 0,
      "registrado_por": "Enfermera López"
    }
  ]
}
```

**Errores:**
- `404` — paciente no encontrado

---

### `GET /api/evaluaciones/:id/informe`

Devuelve todos los datos de una evaluación consolidados para el informe imprimible.

**Ejemplo:** `GET /api/evaluaciones/42/informe`

**Respuesta 200:**
```json
{
  "informe": {
    "id": 42,
    "fecha": "2026-06-02 14:30:00",
    "paciente": {
      "identificador": "12345678",
      "nombre": "Ana García"
    },
    "registrado_por": "Enfermera López",
    "clasificacion": "Negativo",
    "probabilidad_positivo": 0.08741,
    "porcentaje_riesgo": 8.7,
    "nivel_riesgo": "pendiente",
    "alerta_transferencia": false,
    "recomendaciones": [],
    "variables": { "edad": 35, "procedencia": "Urbano", "..." : "..." },
    "variables_detalle": {
      "no_placa": "2024-001",
      "eps": "Sura",
      "gestaciones": 3,
      "..." : "..."
    }
  }
}
```

**Errores:**
- `404` — evaluación no encontrada

---

## 9. Artefactos del modelo

Los artefactos están en `backend/artifacts/`.

### `modelo_vph.joblib`

Modelo HistGradientBoosting entrenado con scikit-learn, serializado con joblib. Es un diccionario con tres piezas: el preprocesador (`pre`) que imputa, escala y codifica las 28 variables, el clasificador (`clf`) HistGradientBoosting y el calibrador isotónico (`iso`) que ajusta la probabilidad. El microservicio Python lo carga al arrancar y calcula la probabilidad como `iso.predict(clf.predict_proba(pre.transform(df)))`.

### `umbral.json`

Punto de corte de clasificación y métricas del modelo.

```json
{
  "campeon": "HistGB",
  "tipo": "sklearn",
  "umbral": 0.1303,
  "estrategia_balanceo": "sin_balanceo",
  "test_PR_AUC": 0.2258,
  "test_ROC_AUC": 0.6287,
  "test_Brier": 0.1226
}
```

### `esquema_entrada.json`

Define los rangos válidos y las opciones categóricas permitidas para la validación del formulario. El frontend lo obtiene mediante `GET /api/esquema` para construir dinámicamente el formulario.

### `config_riesgo.json`

Controla el nivel de riesgo, las recomendaciones clínicas y la alerta de transferencia. **Actualmente con placeholders** (ver [sección 14](#14-placeholders-pendientes-de-datos-clínicos)).

---

## 10. Frontend — componentes React

### 10.1 App y enrutamiento: `App.jsx`

Gestiona la sesión del usuario (guardada en `sessionStorage`) y define todas las rutas.

| Ruta | Componente | Protección |
|------|------------|-----------|
| `/` | `PaginaInicial` | Pública |
| `/login` | `InicioSesion` | Redirige a `/consulta` si ya hay sesión |
| `/consulta` | `Consulta` | Requiere sesión activa |
| `/historial` | `Historial` | Requiere sesión activa |
| `/admin` | `AdminUsuarios` | Solo rol `admin`; redirige a `/consulta` si no es admin |
| `*` | — | Redirige a `/` |

La cabecera muestra los enlaces de navegación únicamente cuando hay una sesión activa. El enlace **Usuarios** solo aparece para el rol `admin`.

---

### 10.2 Páginas

#### `PaginaInicial.jsx`

Pantalla de bienvenida pública. Describe el propósito del sistema, los usuarios objetivo y las instrucciones de uso en pasos numerados. Incluye un aviso clínico y un botón para ir al login.

#### `InicioSesion.jsx`

Formulario de login (usuario + contraseña). Al autenticarse correctamente:
1. Guarda el token JWT en `sessionStorage` bajo la clave `vph_token`.
2. Guarda los datos del usuario `{ nombre, rol }` en `sessionStorage` bajo `vph_usuario`.
3. Navega automáticamente a `/consulta`.

#### `Consulta.jsx`

Página principal de trabajo. Controla el flujo de tres fases:

```
FASE 1: FormularioConsulta  →  llama POST /api/evaluaciones
FASE 2: PanelResultadoRiesgo  →  muestra resultado
FASE 3: FormularioPostconsulta  →  informe imprimible (opcional)
```

Al cargar, obtiene el esquema desde `GET /api/esquema` para pasarlo a `FormularioConsulta`.

#### `Historial.jsx`

Envuelve `VistaHistorialPaciente` y gestiona la navegación al informe de una evaluación específica.

#### `AdminUsuarios.jsx`

Disponible solo para el rol `admin`. Tres secciones:
1. **Lista de usuarios:** tabla con ID, nombre, usuario, rol, estado, fecha de creación y columna **Acciones**.
   - Los usuarios de enfermería activos muestran los botones **Editar** y **Desactivar**.
   - Las cuentas admin y la cuenta del usuario actualmente autenticado muestran `—` en acciones (no editables ni eliminables desde la UI).
2. **Modal de edición** (`ModalEditar`): aparece al hacer clic en **Editar**. Permite cambiar nombre completo, contraseña (opcional; dejar vacío para no cambiar) y rol. Valida mínimo 6 caracteres si se ingresa contraseña. Llama `PUT /api/auth/usuarios/:id`.
3. **Crear nuevo usuario:** formulario con nombre, nombre de usuario, contraseña y selector de rol. Valida longitud mínima de contraseña (6 caracteres) antes de enviar.

Al hacer clic en **Desactivar** se muestra un `window.confirm` con el nombre del usuario. Si se acepta, llama `DELETE /api/auth/usuarios/:id` y marca el usuario como inactivo.

---

### 10.3 Componentes

#### `FormularioConsulta.jsx`

El formulario se divide en cuatro secciones:

1. **Datos de la paciente** — número de documento (obligatorio), nombre completo y teléfono.
2. **Datos del formulario de citología** — 10 campos adicionales del formulario CITOLOGIAS (No. de Placa, EPS, FUM, FUC, gestaciones, partos, cesáreas, abortos, hijos vivos, procedimientos previos). Estos campos se almacenan en `variables_adicionales` y se guardan en `variables_evaluacion`.
3. **Variables clínicas del modelo** — 5 campos numéricos con rango visible. Los campos vacíos muestran el placeholder `"Dejar vacío = usar mediana"`.
4. **Variables de comportamiento y antecedentes** — 23 selectores para las variables categóricas. Opción `"— No especificado —"` al inicio.

La validación en cliente verifica rangos numéricos antes de enviar, pero permite enviar campos vacíos.

#### `PanelResultadoRiesgo.jsx`

Muestra el resultado siguiendo la especificación de colores del documento:

| Clasificación | Color de fondo | Código hex |
|--------------|---------------|-----------|
| Positivo | Rosso Vinaccia | `#9B2335` |
| Negativo | Verde | `#255951` |

Incluye:
- Texto grande con la clasificación.
- Porcentaje de riesgo de resultado positivo y barra de progreso visual.
- Alerta de transferencia (fondo amarillo, borde naranja) cuando `alerta_transferencia = true`.
- Sección de nivel de riesgo con placeholder amarillo punteado si está pendiente.
- Sección de recomendaciones con placeholder si están pendientes.
- Aviso clínico.
- Botones: **Nueva evaluación** y **Ver informe completo**.

#### `VistaHistorialPaciente.jsx`

- Campo de búsqueda por número de documento.
- Al buscar: llama `GET /api/pacientes/:identificador/historial`.
- Muestra tabla cronológica con: fecha, clasificación (badge de color), riesgo en %, nivel de riesgo y botón **Ver** para ir al informe.

#### `FormularioPostconsulta.jsx`

Carga los datos del informe desde `GET /api/evaluaciones/:id/informe` y los presenta en un formato estructurado listo para imprimir con `window.print()`. El CSS de impresión oculta la cabecera de navegación y los controles de la página.

Secciones del informe:
1. Encabezado institucional con fecha, evaluador y número de evaluación.
2. Datos de la paciente.
3. Panel de resultado (fondo de color según clasificación).
4. Alerta de transferencia (si aplica).
5. Recomendaciones o placeholder.
6. Tabla de variables registradas (etiquetas legibles para todas las columnas).
7. Aviso clínico.

---

### 10.4 Servicio de API: `servicios/api.js`

Capa de abstracción sobre `fetch`. Todas las llamadas al backend pasan por aquí.

| Función exportada | Descripción |
|------------------|-------------|
| `login(usuario, contrasena)` | POST /api/auth/login |
| `logout()` | POST /api/auth/logout + limpia sessionStorage |
| `obtenerEsquema()` | GET /api/esquema |
| `crearEvaluacion(payload)` | POST /api/evaluaciones |
| `obtenerInforme(id)` | GET /api/evaluaciones/:id/informe |
| `historialPaciente(identificador)` | GET /api/pacientes/:id/historial |
| `listarUsuarios()` | GET /api/auth/usuarios |
| `crearUsuario(datos)` | POST /api/auth/usuarios |
| `editarUsuario(id, datos)` | PUT /api/auth/usuarios/:id |
| `eliminarUsuario(id)` | DELETE /api/auth/usuarios/:id |

El token JWT se lee de `sessionStorage` en cada llamada. Si la respuesta HTTP no es `ok`, lanza un `Error` con el mensaje del campo `error` de la respuesta JSON.

---

### 10.5 Estilos: `estilos/global.css`

Sistema de diseño basado en variables CSS:

| Variable | Valor | Uso |
|----------|-------|-----|
| `--color-positivo` | `#9B2335` | Rosso Vinaccia — resultado positivo |
| `--color-negativo` | `#255951` | Verde — resultado negativo |
| `--color-primario` | `#2C5F8A` | Azul institucional — cabecera, botones, títulos |
| `--color-fondo` | `#F5F7FA` | Fondo general de la página |
| `--color-advertencia` | `#B8860B` | Nivel de riesgo medio |
| `--color-pendiente` | `#8B6914` | Zona de placeholders pendientes |

Clases utilitarias principales: `.tarjeta`, `.btn`, `.btn-primario`, `.btn-positivo`, `.btn-negativo`, `.grid-formulario`, `.panel-resultado`, `.panel-positivo`, `.panel-negativo`, `.badge-positivo`, `.badge-negativo`, `.alerta-transferencia`, `.alerta-pendiente`, `.disclaimer`.

---

## 11. Seguridad

| Medida | Implementación |
|--------|---------------|
| **Contraseñas** | bcrypt con 12 rondas de sal. Nunca se almacena en texto plano. |
| **Tokens de sesión** | JWT firmado con `JWT_SECRET`, expiración de 8 horas. El frontend los guarda en `sessionStorage` (no en `localStorage` ni en cookies). |
| **Control de acceso** | Middleware `verificarToken` en todas las rutas protegidas. Middleware `soloAdmin` en rutas de gestión de usuarios. |
| **Validación de entrada** | Doble validación: en el cliente (guía al usuario) y en el servidor (seguridad). El middleware `validarVariables` rechaza rangos inválidos y categorías no permitidas. |
| **Auditoría** | Todo login, logout, creación de evaluación, consulta de informe y creación de usuario queda registrado con usuario, acción, detalle e IP. |
| **Foreign keys** | `PRAGMA foreign_keys = ON` activo en SQLite. |
| **CORS** | Restringido al origen del frontend (`FRONTEND_URL`). |
| **Secretos** | El `JWT_SECRET` predeterminado es solo para desarrollo. Se debe cambiar en producción mediante la variable de entorno. |

---

## 12. Pruebas

Las pruebas se ejecutan con el test runner nativo de Node.js (`node:test`), sin dependencias externas.

```bash
cd backend
npm test
# Ejecuta: node --test tests/inferencia.test.js tests/api.test.js
```

### `tests/inferencia.test.js` — Pruebas unitarias (3 pruebas)

Verifican el cliente del microservicio (`modeloInferenciaVPH`) mockeando `fetch`, de modo que no dependen de que el servicio Python esté corriendo.

| Prueba | Verificación |
|--------|-------------|
| Devuelve clasificación, probabilidad y porcentaje de riesgo | El objeto retornado tiene los tres campos con valores válidos |
| Propaga error 503 si el servicio falla | `predecir()` rechaza con `status == 503` cuando el servicio no responde |
| Umbral entre 0 y 1 | `modelo.umbral > 0 && modelo.umbral < 1` |

### `tests/api.test.js` — Pruebas de integración (8 pruebas)

Levantan la app en un puerto dinámico con una base de datos **en memoria** (`DB_PATH_OVERRIDE=':memory:'`) y mockean el microservicio de inferencia, así que no requieren ni Python ni un archivo de base de datos.

| Prueba | Verificación |
|--------|-------------|
| `GET /api/health` | Estado 200, `body.estado == 'ok'` |
| `POST /api/auth/login` credenciales incorrectas | Estado 401 |
| `POST /api/auth/login` credenciales correctas | Estado 200, token presente, `rol == 'admin'` |
| `GET /api/esquema` sin token | Estado 401 |
| `GET /api/esquema` con token | Estado 200, `variables_numericas` y `variables_categoricas` presentes |
| `POST /api/evaluaciones` | Estado 201, `id > 0`, clasificación válida, `porcentaje_riesgo` en `[0, 100]`, `nivel_riesgo == 'pendiente'` |
| `GET /api/pacientes/11111111/historial` | Estado 200, array de 1 evaluación |
| `GET /api/pacientes/inexistente/historial` | Estado 404 |

### Resultado esperado

```
✔ predecir devuelve clasificacion, probabilidad y porcentaje de riesgo
✔ predecir propaga error 503 si el servicio falla
✔ umbral del modelo esta entre 0 y 1
✔ GET /api/health devuelve estado ok
✔ POST /api/auth/login con credenciales incorrectas devuelve 401
✔ POST /api/auth/login con credenciales correctas devuelve token JWT
✔ GET /api/esquema sin autenticacion devuelve 401
✔ GET /api/esquema con token valido devuelve variables del modelo
✔ POST /api/evaluaciones crea evaluacion y devuelve clasificacion
✔ GET /api/pacientes/:id/historial devuelve historial de la paciente
✔ GET /api/pacientes/inexistente/historial devuelve 404

tests 11 · pass 11 · fail 0
```

---

## 13. Flujo completo de una evaluación

El siguiente diagrama muestra el recorrido completo de datos desde que la enfermera abre el formulario hasta que se genera el informe.

```
ENFERMERA
   │
   ├─ 1. Abre /consulta
   │        Consulta.jsx llama GET /api/esquema
   │        ← esquema_entrada.json (rangos y categorías)
   │        FormularioConsulta construye los campos dinámicamente
   │
   ├─ 2. Completa el formulario y envía
   │        Consulta.jsx llama POST /api/evaluaciones
   │        {paciente, variables, variables_adicionales}
   │           │
   │           ├─ Middleware verificarToken       → valida JWT
   │           ├─ Middleware validarVariables     → valida rangos y categorías
   │           ├─ ControladorEvaluacion
   │           │     ├─ repositorioPacientes.crearOObtener()
   │           │     ├─ modeloInferenciaVPH.predecir(variables)   ← HTTP al microservicio Python
   │           │     │     → {clasificacion, probabilidad_positivo, porcentaje_riesgo}
   │           │     ├─ generadorRecomendaciones.calcular()
   │           │     │     → {nivelRiesgo, recomendaciones, alertaTransferencia}
   │           │     ├─ repositorioEvaluaciones.crear()   ← transacción SQLite
   │           │     │     → INSERT evaluaciones
   │           │     │     → INSERT variables_evaluacion
   │           │     └─ repositorioAuditoria.registrar('CREAR_EVALUACION')
   │           └─ Respuesta 201: {id, clasificacion, porcentaje_riesgo, ...}
   │
   ├─ 3. Ve el resultado
   │        PanelResultadoRiesgo:
   │        - Fondo Rosso Vinaccia (#9B2335) si Positivo
   │        - Fondo Verde (#255951) si Negativo
   │        - Barra del porcentaje de riesgo de positivo
   │        - Alerta de transferencia si corresponde
   │        - Nivel de riesgo / recomendaciones (o placeholder si pendiente)
   │
   └─ 4. Genera el informe (opcional)
            Consulta.jsx muestra FormularioPostconsulta
            Llama GET /api/evaluaciones/:id/informe
            ← Todos los datos consolidados
            window.print() → impresión desde el navegador
```

---

## 14. Placeholders pendientes de datos clínicos

El sistema está diseñado para activar el nivel de riesgo y las recomendaciones **sin modificar ningún archivo de código**, solo editando `backend/artifacts/config_riesgo.json`.

### Estado actual

```json
{
  "umbral_clasificacion_positivo": 0.1303,
  "PENDIENTE": "Los umbrales de nivel de riesgo y las recomendaciones aun no fueron entregados...",
  "umbral_bajo_medio": null,
  "umbral_medio_alto": null,
  "recomendaciones_por_nivel": {
    "bajo": [],
    "medio": [],
    "alto": []
  },
  "regla_alerta_transferencia": "Disparar alerta cuando la clasificacion sea Positivo y nivel sea alto"
}
```

### Cómo activar el nivel de riesgo

Cuando el director clínico entregue los valores, editar únicamente el archivo `backend/artifacts/config_riesgo.json`, por ejemplo de la siguiente manera:

```json
{
  "umbral_clasificacion_positivo": 0.1303,
  "umbral_bajo_medio": 0.25,
  "umbral_medio_alto": 0.45,
  "recomendaciones_por_nivel": {
    "bajo": [
      "Continuar con el programa de citologías de rutina cada 3 años.",
      "Promover el uso de métodos de barrera."
    ],
    "medio": [
      "Programar seguimiento en 12 meses.",
      "Ofrecer consejería sobre factores de riesgo VPH."
    ],
    "alto": [
      "Derivar a colposcopía en los próximos 30 días.",
      "Notificar al médico tratante para evaluación urgente."
    ]
  }
}
```

El servidor lee este archivo en cada evaluación (sin caché), por lo que los cambios surten efecto inmediatamente sin reiniciar. Las evaluaciones anteriores almacenadas en la base de datos no se modifican retroactivamente.

### Comportamiento mientras están pendientes

| Campo | Valor en base de datos | Valor mostrado en pantalla |
|-------|----------------------|---------------------------|
| `nivel_riesgo` | `"pendiente"` | Aviso en recuadro amarillo punteado |
| `recomendaciones` | `null` | Aviso en recuadro amarillo punteado |
| `alerta_transferencia` | `0` | No se muestra |

---

## 15. Glosario

| Término | Definición |
|---------|-----------|
| **VPH** | Virus del Papiloma Humano. Infección de transmisión sexual asociada a lesiones precancerosas y cáncer de cuello uterino. |
| **Clasificación** | Resultado binario del modelo: `Positivo` (riesgo elevado de VPH) o `Negativo`. |
| **Probabilidad** | Valor continuo ∈ [0, 1] que representa la probabilidad de resultado positivo calculada por el modelo. Es el riesgo de positividad de la paciente. |
| **Porcentaje de riesgo** | La probabilidad de resultado positivo expresada en escala de 0 a 100, es decir `probabilidad × 100`. Es el número que el sistema entrega al personal de salud. |
| **Umbral de clasificación** | Valor 0.1303. Si `probabilidad ≥ umbral`, se clasifica como Positivo. Seleccionado para maximizar el F1-score con la menor tasa de falsos positivos. |
| **Nivel de riesgo** | Subdivisión dentro de los positivos: `bajo`, `medio` o `alto`. Pendiente de definición clínica. |
| **Alerta de transferencia** | Indicación de derivación urgente a especialista. Se activa cuando la clasificación es Positiva y el nivel de riesgo es `alto`. |
| **FCE** | Frontera-Control-Entidad. Patrón arquitectónico usado para organizar las clases del sistema. |
| **JWT** | JSON Web Token. Token firmado que se emite al hacer login y se verifica en cada petición protegida. |
| **RBAC** | Role-Based Access Control. Control de acceso por roles: `enfermeria` y `admin`. |
| **ROC-AUC** | Area Under the ROC Curve. Métrica de discriminación del modelo. Valor ≈ 0.63. |
| **HistGB** | HistGradientBoosting. Modelo de conjunto de árboles de scikit-learn usado para la predicción. |
| **F1-score** | Media armónica de precisión y recall. Valor ≈ 0.30 con el umbral clínico elegido. |
| **NS/NR** | No Sabe / No Responde. Categoría válida en variables como `infeccion_vph_previa`. |
| **FUM** | Fecha de Última Menstruación. |
| **FUC** | Fecha de Última Citología. |
| **WAL** | Write-Ahead Logging. Modo de journal de SQLite que mejora el rendimiento de escrituras concurrentes. |
| **node:sqlite** | Módulo nativo de Node.js 22+. Proporciona `DatabaseSync` para acceso síncrono a SQLite sin compilar módulos nativos externos. |
