// App.jsx - enrutamiento principal y gestion de sesion.
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { logout } from './servicios/api.js';
import PaginaInicial  from './paginas/PaginaInicial.jsx';
import InicioSesion   from './paginas/InicioSesion.jsx';
import Consulta       from './paginas/Consulta.jsx';
import Historial      from './paginas/Historial.jsx';
import AdminUsuarios  from './paginas/AdminUsuarios.jsx';

function Cabecera({ usuario, onCerrarSesion }) {
  return (
    <header className="cabecera">
      <div className="cabecera-titulo">
        Sistema Predictivo de Riesgo VPH — Centro de Salud Alfonso López
      </div>
      {usuario && (
        <nav className="cabecera-usuario">
          <NavLink to="/consulta"  style={({ isActive }) => ({ color: isActive ? '#ffd700' : '#fff' })}>
            Evaluación
          </NavLink>
          <NavLink to="/historial" style={({ isActive }) => ({ color: isActive ? '#ffd700' : '#fff' })}>
            Historial
          </NavLink>
          {usuario.rol === 'admin' && (
            <NavLink to="/admin" style={({ isActive }) => ({ color: isActive ? '#ffd700' : '#fff' })}>
              Usuarios
            </NavLink>
          )}
          <span style={{ opacity: 0.7 }}>{usuario.nombre}</span>
          <button className="btn btn-secundario" style={{ padding: '0.3rem 0.85rem', fontSize: '0.85rem' }}
                  onClick={onCerrarSesion}>
            Salir
          </button>
        </nav>
      )}
    </header>
  );
}

// Redirige a /login si el usuario no está autenticado.
function Protegida({ usuario, children }) {
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [usuario, setUsuario] = useState(() => {
    try {
      const u = sessionStorage.getItem('vph_usuario');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  async function cerrarSesion() {
    await logout();
    setUsuario(null);
  }

  return (
    <BrowserRouter>
      <Cabecera usuario={usuario} onCerrarSesion={cerrarSesion} />
      <Routes>
        <Route path="/" element={<PaginaInicial />} />
        <Route path="/login" element={
          usuario
            ? <Navigate to="/consulta" replace />
            : <InicioSesion onSesionIniciada={setUsuario} />
        } />
        <Route path="/consulta" element={
          <Protegida usuario={usuario}><Consulta /></Protegida>
        } />
        <Route path="/historial" element={
          <Protegida usuario={usuario}><Historial /></Protegida>
        } />
        <Route path="/admin" element={
          usuario?.rol === 'admin'
            ? <AdminUsuarios />
            : <Navigate to="/consulta" replace />
        } />
        {/* Redirige cualquier ruta desconocida */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
