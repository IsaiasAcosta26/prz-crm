import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const PLANES = [
  { value: 'basico',     label: 'Básico',     color: '#64748B' },
  { value: 'pro',        label: 'Pro',        color: '#F97316' },
  { value: 'enterprise', label: 'Enterprise', color: '#8B5CF6' },
]
const planMeta = (v) => PLANES.find((p) => p.value === v) || PLANES[0]

export default function Empresas({ prospects }) {
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [plan, setPlan] = useState('basico')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [copiado, setCopiado] = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })
    setOrgs(data || [])
    setLoading(false)
  }

  async function crear() {
    if (!nombre.trim()) { setError('Escribe un nombre'); return }
    setGuardando(true)
    setError('')
    const { error } = await supabase.from('organizations').insert({ nombre: nombre.trim(), plan })
    setGuardando(false)
    if (error) { setError('No se pudo crear: ' + error.message); return }
    setNombre('')
    setPlan('basico')
    setCreando(false)
    cargar()
  }

  async function cambiarPlan(id, nuevoPlan) {
    await supabase.from('organizations').update({ plan: nuevoPlan }).eq('id', id)
    setOrgs((prev) => prev.map((o) => (o.id === id ? { ...o, plan: nuevoPlan } : o)))
  }

  function copiar(id) {
    navigator.clipboard?.writeText(id)
    setCopiado(id)
    setTimeout(() => setCopiado((c) => (c === id ? null : c)), 1500)
  }

  const contar = (orgId) => prospects.filter((p) => p.org_id === orgId).length

  return (
    <>
      <div className="view-head">
        <h2 className="view-title" style={{ margin: 0 }}>Empresas (clientes)</h2>
        <button className="btn primary" onClick={() => setCreando((v) => !v)}>
          {creando ? 'Cancelar' : '+ Nueva empresa'}
        </button>
      </div>

      {creando && (
        <div className="create-box">
          <div className="create-row">
            <div style={{ flex: 1 }}>
              <label className="lbl">Nombre del cliente</label>
              <input
                className="field"
                placeholder="Ej: FitCenter 971"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && crear()}
              />
            </div>
            <div style={{ width: 160 }}>
              <label className="lbl">Plan</label>
              <select className="field" value={plan} onChange={(e) => setPlan(e.target.value)}>
                {PLANES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn primary" onClick={crear} disabled={guardando} style={{ marginTop: 14 }}>
            {guardando ? 'Creando…' : 'Crear empresa'}
          </button>
        </div>
      )}

      {loading ? (
        <p className="muted">Cargando empresas…</p>
      ) : (
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Plan</th>
                <th>Prospectos</th>
                <th>ID de cliente (org_id)</th>
                <th>Alta</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => {
                const meta = planMeta(o.plan)
                return (
                  <tr key={o.id}>
                    <td className="strong">{o.nombre}</td>
                    <td>
                      <select
                        className="status-select"
                        style={{ color: meta.color, borderColor: meta.color }}
                        value={o.plan}
                        onChange={(e) => cambiarPlan(o.id, e.target.value)}
                      >
                        {PLANES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </td>
                    <td>{contar(o.id)}</td>
                    <td>
                      <code className="orgid">{o.id}</code>
                      <button className="btn tiny" style={{ marginLeft: 8 }} onClick={() => copiar(o.id)}>
                        {copiado === o.id ? '¡Copiado!' : 'Copiar'}
                      </button>
                    </td>
                    <td className="muted">{(o.created_at || '').slice(0, 10)}</td>
                  </tr>
                )
              })}
              {orgs.length === 0 && (
                <tr><td colSpan="5" className="muted" style={{ padding: 24 }}>Aún no hay empresas. Crea la primera.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}