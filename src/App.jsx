import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { STATUSES, deriveKPIs } from './lib/data'
import ProspectsTable from './components/ProspectsTable'
import Kanban from './components/Kanban'
import ProspectDrawer from './components/ProspectDrawer'
import Empresas from './components/Empresas'

// ===================== Puerta de entrada =====================
export default function App() {
  const [session, setSession] = useState(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setBooting(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (booting) return <div className="center-screen">Cargando…</div>
  return session ? <Workspace session={session} /> : <Login />
}

// ===================== Login =====================
function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function entrar() {
    setError('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Correo o contraseña incorrectos')
    setBusy(false)
  }

  return (
    <div className="center-screen">
      <div className="login-card">
        <div className="brand big">PRZ <span>CRM</span></div>
        <p className="muted">Entra a tu panel</p>
        <input
          className="field"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="field"
          placeholder="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && entrar()}
        />
        {error && <p className="error">{error}</p>}
        <button className="btn primary block" onClick={entrar} disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}

// ===================== Área de trabajo (tras login) =====================
function Workspace({ session }) {
  const [profile, setProfile] = useState(null)
  const [prospects, setProspects] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('dashboard')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', session.user.id).single()
      .then(({ data }) => setProfile(data))
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('prospects')
      .select('*')
      .order('score_audit', { ascending: false })
    setProspects(data || [])
    setLoading(false)
  }

  async function updateProspect(id, patch) {
    const { error } = await supabase.from('prospects').update(patch).eq('id', id)
    if (error) {
      alert('No se pudo guardar: ' + error.message)
      return
    }
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    setSelected((cur) => (cur && cur.id === id ? { ...cur, ...patch } : cur))
  }

  const views = {
    dashboard: <Dashboard prospects={prospects} />,
    tabla: <ProspectsTable prospects={prospects} onEdit={updateProspect} onOpen={setSelected} />,
    kanban: <Kanban prospects={prospects} onEdit={updateProspect} onOpen={setSelected} />,
    empresas: <Empresas prospects={prospects} />,
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">PRZ <span>CRM</span></div>
        <nav className="tabs">
          <button className={view === 'dashboard' ? 'tab active' : 'tab'} onClick={() => setView('dashboard')}>Panel</button>
          <button className={view === 'tabla' ? 'tab active' : 'tab'} onClick={() => setView('tabla')}>Prospectos</button>
          <button className={view === 'kanban' ? 'tab active' : 'tab'} onClick={() => setView('kanban')}>Kanban</button>
          {profile?.role === 'admin' && (
            <button className={view === 'empresas' ? 'tab active' : 'tab'} onClick={() => setView('empresas')}>Empresas</button>
          )}
        </nav>
        <div className="user">
          <span className="email">
            {session.user.email}
            {profile?.role === 'admin' && <b className="badge-admin">ADMIN</b>}
          </span>
          <button className="btn ghost" onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
      </header>

      <main className="content">
        {loading ? <p className="muted">Cargando prospectos…</p> : views[view]}
      </main>

      {selected && (
        <ProspectDrawer
          prospect={selected}
          onClose={() => setSelected(null)}
          onSave={updateProspect}
        />
      )}
    </div>
  )
}

// ===================== Panel / KPIs =====================
function Dashboard({ prospects }) {
  const k = deriveKPIs(prospects)
  const cards = [
    { label: 'Prospectos totales', value: k.total },
    { label: 'Por contactar', value: k.porContactar },
    { label: 'En proceso', value: k.enProceso },
    { label: 'Clientes ganados', value: k.ganados },
    { label: 'Score promedio', value: k.scorePromedio + '/10' },
  ]
  return (
    <>
      <h2 className="view-title">Panel general</h2>
      <div className="kpi-grid">
        {cards.map((c) => (
          <div className="kpi" key={c.label}>
            <div className="kpi-value">{c.value}</div>
            <div className="kpi-label">{c.label}</div>
          </div>
        ))}
      </div>

      <h3 className="section-title">Distribución por estado</h3>
      <div className="dist">
        {STATUSES.map((s) => {
          const n = prospects.filter((p) => p.statut === s.value).length
          const pct = prospects.length ? (n / prospects.length) * 100 : 0
          return (
            <div className="dist-row" key={s.value}>
              <span className="dot" style={{ background: s.color }} />
              <span className="dist-label">{s.label}</span>
              <span className="dist-bar"><i style={{ width: pct + '%', background: s.color }} /></span>
              <span className="dist-count">{n}</span>
            </div>
          )
        })}
      </div>
    </>
  )
}