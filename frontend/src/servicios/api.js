/**
 * api.js
 * Capa de comunicacion con el backend.
 * Todas las llamadas al API RESTful pasan por aqui.
 */

const BASE = '/api';

function obtenerToken() {
  return sessionStorage.getItem('vph_token');
}

function cabeceras(conBody = false) {
  const h = {};
  const token = obtenerToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  if (conBody) h['Content-Type'] = 'application/json';
  return h;
}

async function manejarRespuesta(res) {
  const data = await res.json().catch(() => ({ error: 'Respuesta no valida del servidor' }));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

// ── Autenticacion ──────────────────────────────────────────────────────────────

export async function login(usuario, contrasena) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: cabeceras(true),
    body: JSON.stringify({ usuario, contrasena })
  });
  return manejarRespuesta(res);
}

export async function logout() {
  await fetch(`${BASE}/auth/logout`, { method: 'POST', headers: cabeceras() });
  sessionStorage.removeItem('vph_token');
  sessionStorage.removeItem('vph_usuario');
}

// ── Esquema de entrada ─────────────────────────────────────────────────────────

export async function obtenerEsquema() {
  const res = await fetch(`${BASE}/esquema`, { headers: cabeceras() });
  return manejarRespuesta(res);
}

// ── Evaluaciones ───────────────────────────────────────────────────────────────

export async function crearEvaluacion(payload) {
  const res = await fetch(`${BASE}/evaluaciones`, {
    method: 'POST',
    headers: cabeceras(true),
    body: JSON.stringify(payload)
  });
  return manejarRespuesta(res);
}

export async function obtenerInforme(id) {
  const res = await fetch(`${BASE}/evaluaciones/${id}/informe`, { headers: cabeceras() });
  return manejarRespuesta(res);
}

// ── Historial ──────────────────────────────────────────────────────────────────

export async function historialPaciente(identificador) {
  const res = await fetch(
    `${BASE}/pacientes/${encodeURIComponent(identificador)}/historial`,
    { headers: cabeceras() }
  );
  return manejarRespuesta(res);
}

// ── Administracion de usuarios (solo admin) ────────────────────────────────────

export async function listarUsuarios() {
  const res = await fetch(`${BASE}/auth/usuarios`, { headers: cabeceras() });
  return manejarRespuesta(res);
}

export async function crearUsuario(datos) {
  const res = await fetch(`${BASE}/auth/usuarios`, {
    method: 'POST',
    headers: cabeceras(true),
    body: JSON.stringify(datos)
  });
  return manejarRespuesta(res);
}

export async function editarUsuario(id, datos) {
  const res = await fetch(`${BASE}/auth/usuarios/${id}`, {
    method: 'PUT',
    headers: cabeceras(true),
    body: JSON.stringify(datos)
  });
  return manejarRespuesta(res);
}

export async function eliminarUsuario(id) {
  const res = await fetch(`${BASE}/auth/usuarios/${id}`, {
    method: 'DELETE',
    headers: cabeceras()
  });
  return manejarRespuesta(res);
}
