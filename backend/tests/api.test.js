/**
 * api.test.js
 * Pruebas de integracion de la API RESTful.
 * Corre con: node --test tests/api.test.js
 */
'use strict';

const { test }   = require('node:test');
const assert     = require('node:assert/strict');
const http       = require('http');
const bcrypt     = require('bcryptjs');

// Usar base de datos en memoria para tests
process.env.JWT_SECRET    = 'test_secret_pruebas';
process.env.DB_PATH_OVERRIDE = ':memory:'; // senial para conexion.js en modo test

const app = require('../src/app');

// Mock del microservicio de inferencia: el controlador llama fetch hacia el servicio Python.
global.fetch = async () => ({
  ok: true,
  json: async () => ({
    clasificacion: 'Negativo',
    probabilidad_positivo: 0.087,
    porcentaje_riesgo: 8.7,
    umbral: 0.1303
  })
});

let servidor;
let baseUrl;
let tokenAdmin;

// ── Helpers ────────────────────────────────────────────────────────────────────
function peticion(metodo, ruta, body, token) {
  return new Promise((resolve, reject) => {
    const data    = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (data)  headers['Content-Length'] = Buffer.byteLength(data);

    const url = new URL(ruta, baseUrl);
    const req = http.request(
      { hostname: url.hostname, port: url.port, path: url.pathname, method: metodo, headers },
      res => {
        let chunks = '';
        res.on('data', c => (chunks += c));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(chunks) }); }
          catch { resolve({ status: res.statusCode, body: chunks }); }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Setup / teardown ───────────────────────────────────────────────────────────
test.before(async () => {
  // Crear usuario admin en la DB de test
  const { obtenerDB } = require('../src/db/conexion');
  const db   = obtenerDB();
  const hash = await bcrypt.hash('admin1234', 10);
  db.prepare(
    "INSERT OR IGNORE INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?, ?, ?, ?)"
  ).run('Administrador', 'admin', hash, 'admin');

  // Levantar servidor en puerto dinamico
  await new Promise(resolve => {
    servidor = app.listen(0, () => {
      baseUrl = `http://localhost:${servidor.address().port}`;
      resolve();
    });
  });
});

test.after(() => servidor.close());

// ── Pruebas ────────────────────────────────────────────────────────────────────
test('GET /api/health devuelve estado ok', async () => {
  const r = await peticion('GET', '/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.estado, 'ok');
});

test('POST /api/auth/login con credenciales incorrectas devuelve 401', async () => {
  const r = await peticion('POST', '/api/auth/login', { usuario: 'nadie', contrasena: 'mal' });
  assert.equal(r.status, 401);
});

test('POST /api/auth/login con credenciales correctas devuelve token JWT', async () => {
  const r = await peticion('POST', '/api/auth/login', { usuario: 'admin', contrasena: 'admin1234' });
  assert.equal(r.status, 200);
  assert.ok(r.body.token, 'Debe devolver token');
  assert.equal(r.body.rol, 'admin');
  tokenAdmin = r.body.token;
});

test('GET /api/esquema sin autenticacion devuelve 401', async () => {
  const r = await peticion('GET', '/api/esquema');
  assert.equal(r.status, 401);
});

test('GET /api/esquema con token valido devuelve variables del modelo', async () => {
  const r = await peticion('GET', '/api/esquema', null, tokenAdmin);
  assert.equal(r.status, 200);
  assert.ok(r.body.variables_numericas, 'Debe tener variables_numericas');
  assert.ok(r.body.variables_categoricas, 'Debe tener variables_categoricas');
  assert.ok(r.body.variables_numericas.edad, 'Debe incluir campo edad');
});

test('POST /api/evaluaciones crea evaluacion y devuelve clasificacion', async () => {
  const r = await peticion('POST', '/api/evaluaciones', {
    paciente: { identificador: '11111111', nombre: 'Paciente Test' },
    variables: {
      edad: 35,
      n_hijos: 2,
      num_comp_sexuales: 1,
      edad_primera_menstruacion: 13,
      edad_primera_relacion_sexual: 17,
      procedencia: 'Urbano',
      infeccion_vph_previa: 'No',
      res_citologia_previa: 'Negativa',
      fumador: 'NO',
      menopausia: 'No'
    }
  }, tokenAdmin);
  assert.equal(r.status, 201);
  assert.ok(r.body.id > 0, 'Debe devolver un id de evaluacion');
  assert.ok(['Positivo', 'Negativo'].includes(r.body.clasificacion));
  assert.ok(typeof r.body.porcentaje_riesgo === 'number' && r.body.porcentaje_riesgo >= 0 && r.body.porcentaje_riesgo <= 100);
  assert.equal(r.body.nivel_riesgo, 'pendiente'); // umbrales aun no definidos
});

test('GET /api/pacientes/:id/historial devuelve historial de la paciente', async () => {
  const r = await peticion('GET', '/api/pacientes/11111111/historial', null, tokenAdmin);
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.evaluaciones));
  assert.equal(r.body.evaluaciones.length, 1);
});

test('GET /api/pacientes/inexistente/historial devuelve 404', async () => {
  const r = await peticion('GET', '/api/pacientes/99999999/historial', null, tokenAdmin);
  assert.equal(r.status, 404);
});
