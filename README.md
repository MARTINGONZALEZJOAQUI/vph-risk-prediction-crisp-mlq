# Sistema Predictivo de Riesgo VPH

Proyecto desarrollado para el Centro de Salud Alfonso López. El sistema estima el riesgo de resultado positivo de infección por VPH a partir de variables clínicas, demográficas y de comportamiento, y entrega ese riesgo como un **porcentaje** para apoyar la priorización de citología y seguimiento. El modelo es un **HistGradientBoosting** entrenado con scikit-learn siguiendo la metodología CRISP-ML(Q), servido a través de un microservicio Python.

**Stack:** Node.js 22 · Express · SQLite · React 18 · Vite · microservicio de inferencia en Python (scikit-learn)

> Esta herramienta es un apoyo a la decisión clínica y no reemplaza el diagnóstico de laboratorio ni el criterio del profesional de salud.

**Institución.** Universidad del Cauca, Popayán, Cauca

**Elaborado por**:
* `JOSE MARTIN GONZALEZ JOAQUI`
* `BRIYITH VANEZA GUACAS NARVAEZ`
* `KAROL TATIANA PALECHOR VALENCIA`
* `YULIETH GABRIELA JARAMILLO YELA`


---

## Requisitos previos

- **Node.js 22 o superior** (versión LTS 22.x; necesaria para el módulo nativo `node:sqlite`)
- **Python 3.12** (ejecuta el microservicio que carga el modelo)
- **Git**

Verifica las versiones:
```bash
node --version
python --version
git --version
```

---

## Descargar el repositorio

```bash
git clone https://github.com/MARTINGONZALEZJOAQUI/vph-risk-prediction-crisp-mlq.git
cd vph-risk-prediction-crisp-mlq
```

---

## Instalación

El proyecto tiene tres partes que se instalan, el microservicio de inferencia (Python), el backend (Node) y el frontend (React).

### 1. Entorno de Python para el microservicio

Desde la raíz del repositorio, crea el entorno virtual `.venv` e instala las librerías del modelo:

```bash
# Windows
python -m venv .venv
.venv\Scripts\python -m pip install --upgrade pip
.venv\Scripts\python -m pip install scikit-learn pandas numpy joblib

# Linux / macOS
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install scikit-learn pandas numpy joblib
```

El microservicio carga `backend/artifacts/modelo_vph.joblib`, que contiene el preprocesador, el clasificador HistGradientBoosting y el calibrador isotónico.

### 2. Dependencias del backend

```bash
cd backend
npm install
cd ..
```

### 3. Dependencias del frontend

```bash
cd frontend
npm install
cd ..
```

---

## Correr el proyecto

Se necesitan **tres terminales** abiertas al mismo tiempo.

**Terminal 1 Microservicio de inferencia (Python):**
```bash
cd backend
npm run inferencia
```
Queda escuchando en `http://127.0.0.1:8001` con el modelo cargado. Debe estar activo para poder evaluar; si no responde, el backend devuelve `503` al crear una evaluación.

> El script `inferencia` detecta automáticamente el intérprete del entorno `.venv` de la raíz del proyecto y funciona en Windows, Linux y macOS. 

**Terminal 2 Backend (Node + Express):**
```bash
cd backend
npm run dev
```
Cuando veas `Sistema VPH en http://localhost:3001`, el backend está listo. La primera vez crea automáticamente la base de datos `vph.db` y el usuario administrador.

**Terminal 3 Frontend (React + Vite):**
```bash
cd frontend
npm run dev
```
Abre `http://localhost:5173` en el navegador. En desarrollo, Vite redirige las peticiones `/api` al backend.

**Credenciales** usuario `admin` / contraseña `admin1234`.

---

## Estructura

```
sistema-vph/
  backend/
    artifacts/
      modelo_vph.joblib       Modelo HistGB (preprocesador + clasificador + calibrador)
      umbral.json             Umbral de clasificación (0.1303) y métricas del modelo
      esquema_entrada.json    Rangos y categorías válidas para el formulario
      config_riesgo.json      Umbrales de nivel de riesgo y recomendaciones por nivel
    inferencia/
      servicio.py             Microservicio Python que carga el modelo y devuelve el riesgo
    scripts/
      ejecutar-inferencia.js  Lanzador multiplataforma del microservicio (npm run inferencia)
    src/
      db/                     Esquema SQLite y conexión (node:sqlite)
      modelo/                 Cliente HTTP del microservicio + generador de recomendaciones
      repositorios/           Acceso a datos
      controladores/          Lógica de negocio
      middlewares/            JWT, validación, errores
      rutas/                  Endpoints Express
  frontend/
    src/
      paginas/                PaginaInicial, InicioSesion, Consulta, Historial, AdminUsuarios
      componentes/            FormularioConsulta, PanelResultadoRiesgo, VistaHistorialPaciente, FormularioPostconsulta
      servicios/              api.js, capa de llamadas al backend
      utils/                  Color de cada nivel de riesgo
  DOCUMENTACION.md            Documentación técnica detallada
  README.md                   Esta guía
```

---

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/login | Iniciar sesión |
| GET | /api/esquema | Variables del formulario |
| POST | /api/evaluaciones | Crear evaluación y obtener el porcentaje de riesgo |
| GET | /api/pacientes/:id/historial | Historial de una paciente |
| GET | /api/evaluaciones/:id/informe | Informe imprimible de una evaluación |
| PUT | /api/auth/usuarios/:id | Editar usuario (admin) |
| DELETE | /api/auth/usuarios/:id | Desactivar usuario (admin) |

La referencia completa de la API, la base de datos y los componentes está en `DOCUMENTACION.md`.

---

## Sobre el modelo

HistGradientBoosting entrenado con scikit-learn sobre los datos del centro de salud, coronado por su equilibrio entre F1 y la menor tasa de falsos positivos. Se utiliza desde un microservicio Python que el backend consume por HTTP.

Para cada paciente el modelo devuelve dos resultados.

El primero es el **porcentaje de riesgo de resultado positivo**. Es la probabilidad que calcula el modelo de que el resultado de VPH de esa paciente sea positivo, expresada de 0 a 100, es decir la probabilidad multiplicada por 100. Por ejemplo, un valor de 36.6 % significa que el modelo estima esa probabilidad de positividad. Es el número que orienta la priorización para citología y seguimiento.

El segundo es la **clasificación**, que puede ser Positivo o Negativo. Se obtiene al comparar esa probabilidad con el umbral de decisión de 0.1303, equivalente a cerca del 13 %. Si la probabilidad alcanza o supera el umbral, la paciente se marca como Positivo, y si queda por debajo se marca como Negativo. El umbral se eligió para equilibrar el F1 con la menor tasa de falsos positivos, de modo que no se dispare una alarma ante cualquier riesgo mínimo.

| Métrica | Valor |
|---------|-------|
| ROC-AUC | ≈ 0.63 |
| F1 (umbral clínico) | ≈ 0.30 |
| PR-AUC | ≈ 0.23 |
| Umbral de clasificación | 0.1303 |

El rendimiento refleja el techo del conjunto de datos disponible. Para mejorarlo se requieren predictores adicionales como resultado de HPV-DNA o citología actual. El modelo es un apoyo al triaje, no una herramienta de diagnóstico autónoma.

Todo el desarrollo del modelo, desde la réplica del modelo de referencia y el estudio de balanceo hasta la elección del modelo ganador y su exportación, está documentado y ejecutado en el notebook [`MODEL_VPH_Final.ipynb`](MODEL_VPH_Final.ipynb).

---

## Nivel de riesgo y recomendaciones

Además de la clasificación, cada evaluación recibe un nivel de riesgo a partir del porcentaje calculado. El nivel es bajo por debajo del 13 %, medio entre el 13 % y el 25 %, y alto del 25 % en adelante. El resultado se acompaña de un color según el nivel, verde para bajo, ámbar para medio y rojo para alto.

La paciente recibe siempre un bloque de cuidados generales y, debajo, las recomendaciones propias del nivel obtenido. Los umbrales y los textos viven en `backend/artifacts/config_riesgo.json`, que el servidor lee en cada evaluación, de modo que se pueden ajustar sin tocar el código.
