/**
 * AdminUsuarios.jsx
 * Panel de administracion de usuarios (solo rol admin).
 * Permite listar, crear, editar nombre/contraseña/rol y desactivar
 * usuarios de enfermeria. Las cuentas admin no son editables ni eliminables.
 */
import { useEffect, useState } from 'react';
import { listarUsuarios, crearUsuario, editarUsuario, eliminarUsuario } from '../servicios/api.js';

const ROLES = [
  { valor: 'enfermeria', etiqueta: 'Enfermería' },
  { valor: 'admin',      etiqueta: 'Administrador' }
];

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Modal de edición ──────────────────────────────────────────────────────────
function ModalEditar({ usuario, onCerrar, onGuardado }) {
  const [form,    setForm]    = useState({ nombre: usuario.nombre, contrasena: '', rol: usuario.rol });
  const [errs,    setErrs]    = useState({});
  const [guardando, setGuardando] = useState(false);
  const [error,   setError]   = useState('');

  function cambiar(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errs[name]) setErrs(prev => ({ ...prev, [name]: null }));
    setError('');
  }

  function validar() {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio';
    if (form.contrasena && form.contrasena.length < 6)
      e.contrasena = 'La contraseña debe tener al menos 6 caracteres';
    setErrs(e);
    return !Object.keys(e).length;
  }

  async function guardar(e) {
    e.preventDefault();
    if (!validar()) return;
    setGuardando(true);
    setError('');
    try {
      const payload = { nombre: form.nombre.trim(), rol: form.rol };
      if (form.contrasena) payload.contrasena = form.contrasena;
      await editarUsuario(usuario.id, payload);
      onGuardado(`Usuario "${usuario.usuario}" actualizado correctamente.`);
    } catch (err) {
      setError(err.message || 'Error al guardar cambios');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#fff', borderRadius: 10, padding: '2rem',
        width: 'min(440px, 92vw)', boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
      }}>
        <h2 style={{ marginBottom: '1.25rem', color: '#2C5F8A' }}>
          Editar usuario: <code style={{ fontSize: '0.9em' }}>{usuario.usuario}</code>
        </h2>

        <form onSubmit={guardar} noValidate>
          <div className="grupo-campo" style={{ marginBottom: '0.9rem' }}>
            <label htmlFor="edit-nombre">Nombre completo *</label>
            <input
              id="edit-nombre" name="nombre" type="text"
              value={form.nombre} onChange={cambiar}
            />
            {errs.nombre && <span className="error-campo">{errs.nombre}</span>}
          </div>

          <div className="grupo-campo" style={{ marginBottom: '0.9rem' }}>
            <label htmlFor="edit-contrasena">
              Nueva contraseña <span style={{ fontWeight: 400, color: '#666' }}>(dejar vacío para no cambiar)</span>
            </label>
            <input
              id="edit-contrasena" name="contrasena" type="password"
              value={form.contrasena} onChange={cambiar}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
            {errs.contrasena && <span className="error-campo">{errs.contrasena}</span>}
          </div>

          <div className="grupo-campo" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="edit-rol">Rol</label>
            <select id="edit-rol" name="rol" value={form.rol} onChange={cambiar}>
              {ROLES.map(r => (
                <option key={r.valor} value={r.valor}>{r.etiqueta}</option>
              ))}
            </select>
          </div>

          {error && <p className="mensaje-error" style={{ marginBottom: '0.75rem' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secundario" onClick={onCerrar} disabled={guardando}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primario" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function AdminUsuarios() {
  const [usuarios,   setUsuarios]   = useState([]);
  const [cargando,   setCargando]   = useState(true);
  const [errorLista, setErrorLista] = useState('');
  const [exito,      setExito]      = useState('');

  // Modal de edicion
  const [editando,   setEditando]   = useState(null); // usuario seleccionado o null

  // Formulario de nuevo usuario
  const [form,        setForm]        = useState({ nombre: '', usuario: '', contrasena: '', rol: 'enfermeria' });
  const [erroresForm, setErroresForm] = useState({});
  const [guardando,   setGuardando]   = useState(false);
  const [errorForm,   setErrorForm]   = useState('');

  // Id del usuario autenticado (para no mostrar acciones sobre sí mismo)
  const usuarioActual = (() => {
    try { return JSON.parse(sessionStorage.getItem('vph_usuario')); }
    catch { return null; }
  })();

  async function cargarUsuarios() {
    setCargando(true);
    setErrorLista('');
    try {
      const data = await listarUsuarios();
      setUsuarios(data);
    } catch (err) {
      setErrorLista(err.message || 'No se pudo cargar la lista de usuarios');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargarUsuarios(); }, []);

  // ── Nuevo usuario ──
  function cambiarCampo(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (erroresForm[name]) setErroresForm(prev => ({ ...prev, [name]: null }));
    setExito('');
    setErrorForm('');
  }

  function validarForm() {
    const errs = {};
    if (!form.nombre.trim())         errs.nombre    = 'El nombre es obligatorio';
    if (!form.usuario.trim())        errs.usuario   = 'El nombre de usuario es obligatorio';
    if (form.contrasena.length < 6)  errs.contrasena = 'La contraseña debe tener al menos 6 caracteres';
    setErroresForm(errs);
    return !Object.keys(errs).length;
  }

  async function enviarNuevoUsuario(e) {
    e.preventDefault();
    if (!validarForm()) return;
    setGuardando(true);
    setErrorForm('');
    setExito('');
    try {
      await crearUsuario({
        nombre:     form.nombre.trim(),
        usuario:    form.usuario.trim(),
        contrasena: form.contrasena,
        rol:        form.rol
      });
      setExito(`Usuario "${form.usuario}" creado exitosamente.`);
      setForm({ nombre: '', usuario: '', contrasena: '', rol: 'enfermeria' });
      cargarUsuarios();
    } catch (err) {
      setErrorForm(err.message || 'Error al crear el usuario');
    } finally {
      setGuardando(false);
    }
  }

  // ── Eliminar usuario ──
  async function confirmarEliminar(u) {
    if (!window.confirm(
      `¿Desactivar al usuario "${u.usuario}" (${u.nombre})?\n\nEl usuario no podrá iniciar sesión. Esta acción queda registrada en auditoría.`
    )) return;
    setExito('');
    try {
      await eliminarUsuario(u.id);
      setExito(`Usuario "${u.usuario}" desactivado correctamente.`);
      cargarUsuarios();
    } catch (err) {
      setErrorLista(err.message || 'Error al desactivar el usuario');
    }
  }

  // ── Callback modal edición ──
  function onGuardado(mensaje) {
    setEditando(null);
    setExito(mensaje);
    cargarUsuarios();
  }

  // Determina si se muestran acciones para una fila
  function puedeEditar(u) {
    return u.rol !== 'admin' && u.usuario !== usuarioActual?.usuario;
  }

  return (
    <div className="contenedor">
      <h1 style={{ marginBottom: '1.5rem' }}>Administración de usuarios</h1>

      {exito && (
        <p className="mensaje-exito" style={{ marginBottom: '1rem' }}>{exito}</p>
      )}

      {/* ── Lista de usuarios ── */}
      <div className="tarjeta">
        <h2 style={{ marginBottom: '1rem' }}>Usuarios del sistema</h2>

        {cargando   && <p className="mensaje-cargando">Cargando...</p>}
        {errorLista && <p className="mensaje-error">{errorLista}</p>}

        {!cargando && !errorLista && (
          <div style={{ overflowX: 'auto' }}>
            <table className="tabla-historial">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#666' }}>
                    Sin usuarios registrados
                  </td></tr>
                ) : usuarios.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.nombre}</td>
                    <td>
                      <code style={{ background: '#f0f4f8', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
                        {u.usuario}
                      </code>
                    </td>
                    <td>
                      <span style={{
                        background: u.rol === 'admin' ? '#2C5F8A' : '#255951',
                        color: '#fff', borderRadius: 999, padding: '0.15rem 0.6rem',
                        fontSize: '0.82rem', fontWeight: 700
                      }}>
                        {u.rol === 'admin' ? 'Admin' : 'Enfermería'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: u.activo ? '#255951' : '#9B2335', fontWeight: 600 }}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>{formatearFecha(u.creado_en)}</td>
                    <td>
                      {puedeEditar(u) && u.activo ? (
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-secundario"
                            style={{ padding: '0.25rem 0.7rem', fontSize: '0.82rem' }}
                            onClick={() => setEditando(u)}
                          >
                            Editar
                          </button>
                          <button
                            style={{
                              padding: '0.25rem 0.7rem', fontSize: '0.82rem', cursor: 'pointer',
                              background: '#9B2335', color: '#fff', border: 'none',
                              borderRadius: 6, fontWeight: 600
                            }}
                            onClick={() => confirmarEliminar(u)}
                          >
                            Desactivar
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#aaa', fontSize: '0.82rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Formulario nuevo usuario ── */}
      <div className="tarjeta">
        <h2 style={{ marginBottom: '1rem' }}>Crear nuevo usuario</h2>

        <form onSubmit={enviarNuevoUsuario} noValidate>
          <div className="grid-formulario">
            <div className="grupo-campo">
              <label htmlFor="nombre">Nombre completo *</label>
              <input
                id="nombre" name="nombre" type="text"
                value={form.nombre} onChange={cambiarCampo}
                placeholder="Nombre del usuario"
              />
              {erroresForm.nombre && <span className="error-campo">{erroresForm.nombre}</span>}
            </div>

            <div className="grupo-campo">
              <label htmlFor="usuario">Nombre de usuario *</label>
              <input
                id="usuario" name="usuario" type="text"
                value={form.usuario} onChange={cambiarCampo}
                placeholder="Login (sin espacios)"
                autoComplete="off"
              />
              {erroresForm.usuario && <span className="error-campo">{erroresForm.usuario}</span>}
            </div>

            <div className="grupo-campo">
              <label htmlFor="contrasena">Contraseña *</label>
              <input
                id="contrasena" name="contrasena" type="password"
                value={form.contrasena} onChange={cambiarCampo}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
              {erroresForm.contrasena && <span className="error-campo">{erroresForm.contrasena}</span>}
            </div>

            <div className="grupo-campo">
              <label htmlFor="rol">Rol</label>
              <select id="rol" name="rol" value={form.rol} onChange={cambiarCampo}>
                {ROLES.map(r => (
                  <option key={r.valor} value={r.valor}>{r.etiqueta}</option>
                ))}
              </select>
            </div>
          </div>

          {exito     && <p className="mensaje-exito"  style={{ marginBottom: '0.75rem' }}>{exito}</p>}
          {errorForm && <p className="mensaje-error"  style={{ marginBottom: '0.75rem' }}>{errorForm}</p>}

          <button type="submit" className="btn btn-primario" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Crear usuario'}
          </button>
        </form>
      </div>

      {/* ── Modal de edición ── */}
      {editando && (
        <ModalEditar
          usuario={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={onGuardado}
        />
      )}
    </div>
  );
}
