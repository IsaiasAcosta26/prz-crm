import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Usuarios() {
  const [orgs, setOrgs] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [orgId, setOrgId] = useState('')
  const [creando, setCreando] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const [{ data: perfiles }, { data: mems }, { data: os }] = await Promise.all([
      supabase.from('profiles').select('id,email,nombre,role'),
      supabase.from('memberships').select('user_id,org_id'),
      supabase.from('organizations').select('id,nombre').order('nombre'),
    ])
    const orgName = Object.fromEntries((os || []).map((o) => [o.id, o.nombre]))
    const memByUser = {}
    ;(mems || []).forEach((m) => {
      memByUser[m.user_id] = memByUser[m.user_id] || []
      memByUser[m.user_id].push(orgName[m.org_id] || '—')
    })
    setUsuarios((perfiles || []).map((p) => ({ ...p, empresas: memByUser[p.id] || [] })))
    setOrgs(os || [])
    setLoading(false)
  }

  async function crear() {
    setError(''); setMsg('')
    if (!email.trim() || !password.trim() || !orgId) { setError('Completa email, contraseña y empresa'); return }
    if (password.length < 6) { setError('La contraseña debe tener mínimo 6 caracteres'); return }

    setCreando(true)
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const resp = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ email: email.trim(), password, nombre: nombre.trim(), org_id: orgId, role: 'client' }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Error del servidor')
      setMsg(`Usuario ${email.trim()} creado y asignado.`)
      setEmail(''); setPassword(''); setNombre(''); setOrgId('')
      cargar()
    } catch (e) {
      setError(e.message)
    } finally {
      setCreando(false)
    }
  }

  return (
    <>
      <h2 className="view-title">Usuarios</h2>

      <div className="create-box" style={{ maxWidth: 680 }}>
        <h3 className="section-title" style={{ margin: '0 0 8px' }}>Crear acceso para un cliente</h3>
        <div className="create-row">
          <div style={{ flex: 1 }}>
            <label className="lbl">Email del cliente</label>
            <input className="field" placeholder="cliente@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="lbl">Nombre</label>
            <input className="field" placeholder="Nombre del cliente" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
        </div>
        <div className="create-row" style={{ marginTop: 4 }}>
          <div style={{ flex: 1 }}>
            <label className="lbl">Contraseña temporal</label>
            <input className="field" placeholder="mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="lbl">Empresa</label>
            <select className="field" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              <option value="">— Elige la empresa —</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        {msg && <p style={{ color: '#22C55E', fontSize: 14 }}>{msg}</p>}
        <button className="btn primary" onClick={crear} disabled={creando} style={{ marginTop: 16 }}>
          {creando ? 'Creando…' : 'Crear usuario'}
        </button>
      </div>

      {loading ? (
        <p className="muted">Cargando usuarios…</p>
      ) : (
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr><th>Email</th><th>Nombre</th><th>Rol</th><th>Empresa(s)</th></tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td className="strong">{u.email}</td>
                  <td>{u.nombre || '—'}</td>
                  <td>{u.role === 'admin' ? <span className="badge-admin">ADMIN</span> : 'Cliente'}</td>
                  <td>{u.empresas.length ? u.empresas.join(', ') : <span className="muted">Sin empresa</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}