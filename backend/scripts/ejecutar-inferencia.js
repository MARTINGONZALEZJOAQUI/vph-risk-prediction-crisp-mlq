// ejecutar-inferencia.js - Lanza inferencia/servicio.py usando el .venv del proyecto.
'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const RAIZ = path.resolve(__dirname, '..', '..');                 // sistema-vph/
const SERVICIO = path.resolve(__dirname, '..', 'inferencia', 'servicio.py');

// PYTHON_EXE permite forzar un interprete concreto.
const pythonVenv = process.platform === 'win32'
  ? path.join(RAIZ, '.venv', 'Scripts', 'python.exe')
  : path.join(RAIZ, '.venv', 'bin', 'python');

const python = process.env.PYTHON_EXE || pythonVenv;

if (!process.env.PYTHON_EXE && !fs.existsSync(python)) {
  console.error(`No se encontro el interprete de Python en:\n  ${python}\n` +
    `Crea el entorno virtual .venv desde la raiz del proyecto (ver README, seccion Instalacion) ` +
    `o indica un interprete con la variable de entorno PYTHON_EXE.`);
  process.exit(1);
}

const proc = spawn(python, [SERVICIO], { stdio: 'inherit' });

proc.on('error', (err) => {
  console.error(`No se pudo iniciar el microservicio de inferencia: ${err.message}`);
  process.exit(1);
});

proc.on('exit', (codigo) => process.exit(codigo ?? 0));
