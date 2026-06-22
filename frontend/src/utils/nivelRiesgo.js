/**
 * nivelRiesgo.js
 * Color de cada nivel de riesgo, compartido por el panel de resultado, el historial y el informe.
 */

const MAPA = {
  bajo:  { color: '#255951', fondo: '#E8F0EE' },
  medio: { color: '#B8860B', fondo: '#F7EFD9' },
  alto:  { color: '#9B2335', fondo: '#F4E1E4' }
};

export function estiloNivel(nivelRaw, clasificacion) {
  const nivel = (nivelRaw || '').toLowerCase();
  if (MAPA[nivel]) return { nivel, ...MAPA[nivel] };
  const respaldo = clasificacion === 'Positivo' ? MAPA.alto : MAPA.bajo;
  return { nivel: nivel || (clasificacion === 'Positivo' ? 'alto' : 'bajo'), ...respaldo };
}
