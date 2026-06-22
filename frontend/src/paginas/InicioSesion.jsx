// InicioSesion.jsx - formulario de login; guarda el token en sessionStorage.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../servicios/api.js';

export default function InicioSesion({ onSesionIniciada }) {
  const [usuario,    setUsuario]    = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error,      setError]      = useState('');
  const [cargando,   setCargando]   = useState(false);
  const nav = useNavigate();

  async function enviar(e) {
    e.preventDefault();
    setError('');
    if (!usuario.trim() || !contrasena) {
      setError('Ingrese usuario y contraseña');
      return;
    }
    setCargando(true);
    try {
      const data = await login(usuario.trim(), contrasena);
      sessionStorage.setItem('vph_token',   data.token);
      sessionStorage.setItem('vph_usuario', JSON.stringify({ nombre: data.nombre, rol: data.rol }));
      onSesionIniciada({ nombre: data.nombre, rol: data.rol });
      nav('/consulta');
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="contenedor" style={{ maxWidth: 420, paddingTop: '3rem' }}>
      <div className="tarjeta">
        <h1 style={{ marginBottom: '0.25rem', textAlign: 'center' }}>Iniciar sesión</h1>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Sistema Predictivo de Riesgo VPH — Centro de Salud Alfonso López
        </p>

        <form onSubmit={enviar}>
          <div className="grupo-campo">
            <label htmlFor="usuario">Usuario</label>
            <input
              id="usuario" type="text" autoComplete="username"
              value={usuario} onChange={e => setUsuario(e.target.value)}
              placeholder="Nombre de usuario"
            />
          </div>
          <div className="grupo-campo">
            <label htmlFor="contrasena">Contraseña</label>
            <input
              id="contrasena" type="password" autoComplete="current-password"
              value={contrasena} onChange={e => setContrasena(e.target.value)}
              placeholder="Contraseña"
            />
          </div>

          {error && <p className="mensaje-error" style={{ marginBottom: '0.75rem' }}>{error}</p>}

          <button type="submit" className="btn btn-primario" disabled={cargando}
                  style={{ width: '100%', marginTop: '0.25rem', padding: '0.65rem' }}>
            {cargando ? 'Verificando...' : 'Entrar'}
          </button>
        </form>

        <p className="disclaimer" style={{ marginTop: '1.25rem' }}>
          Acceso restringido al personal autorizado del Centro de Salud Alfonso López.
        </p>
      </div>
    </div>
  );
}
