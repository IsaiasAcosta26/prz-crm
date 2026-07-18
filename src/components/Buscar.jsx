import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { mapProspect, statusMeta } from '../lib/data'

export default function Buscar({ prospects, onDataChanged }) {
  const [orgs, setOrgs] = useState([])
  const [orgId, setOrgId] = useState('')
  const [secteur, setSecteur] = useState('')
  const [zone, setZone] = useState('')
  const [revision, setRevision] = useState(true)      // modo revisión ON por defecto
  const [estado, setEstado] = useState('form')         // form | loading | review | done | error
  const [resultados, setResultados] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    supabase.from('organizations').select('id,nombre').order('nombre')
      .then(({ data }) => setOrgs(data || []))
  }, [])

  // ¿ya existe (por teléfono o web) en la empresa elegida?
  function esDuplicado(p) {
    return prospects.some(
      (x) =>
        x.org_id === orgId &&
        ((p.telephone && x.telephone === p.telephone) ||
          (p.site_web && x.site_web === p.site_web))
    )
  }

  async function buscar() {
    setMensaje('')
    if (!orgId) { setMensaje('Elige un cliente'); return }
    if (!secteur.trim() || !zone.trim()) { setMensaje('Escribe sector y zona'); return }

    setEstado('loading')
    try {
      const resp = await fetch('/api/prospection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secteur, zone, org_id: orgId }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Error del servidor')

      const mapeados = (data.prospects || []).map((raw) => {
        const p = mapProspect(raw, orgId)
        return { ...p, _keep: true, _dup: esDuplicado(p) }
      })

      if (mapeados.length === 0) {
        setEstado('done')
        setMensaje('El agente no encontró prospectos para esa búsqueda.')
        return
      }

      if (revision) {
        // marca duplicados como no seleccionados por defecto
        setResultados(mapeados.map((p) => ({ ...p, _keep: !p._dup })))
        setEstado('review')
      } else {
        await insertar(mapeados)
      }
    } catch (e) {
      setEstado('error')
      setMensaje(e.message || 'Fallo la búsqueda')
    }
  }

  async function insertar(lista) {
    const rows = lista.map(({ _keep, _dup, ...row }) => row)
    if (rows.length === 0) { setMensaje('No hay prospectos seleccionados'); return }
    setGuardando(true)
    const { error } = await supabase.from('prospects').insert(rows)
    setGuardando(false)
    if (error) { setEstado('error'); setMensaje('No se pudo guardar: ' + error.message); return }
    onDataChanged?.()
    setEstado('done')
    setMensaje(`${rows.length} prospecto(s) añadido(s) al cliente.`)
  }

  function reiniciar() {
    setEstado('form'); setResultados([]); setMensaje('')
    setSecteur(''); setZone('')
  }

  const nombreOrg = orgs.find((o) => o.id === orgId)?.nombre || ''
  const seleccionados = resultados.filter((r) => r._keep).length

  return (
    <>
      <h2 className="view-title">Buscar prospectos</h2>

      {/* -------- Formulario -------- */}
      {(estado === 'form' || estado === 'loading') && (
        <div className="create-box" style={{ maxWidth: 680 }}>
          <label className="lbl">Cliente destino</label>
          <select className="field" value={orgId} onChange={(e) => setOrgId(e.target.value)} disabled={estado === 'loading'}>
            <option value="">— Elige la empresa —</option>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>

          <div className="create-row" style={{ marginTop: 4 }}>
            <div style={{ flex: 1 }}>
              <label className="lbl">Sector</label>
              <input className="field" placeholder="Ej: Salles de sport" value={secteur} onChange={(e) => setSecteur(e.target.value)} disabled={estado === 'loading'} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="lbl">Zona</label>
              <input className="field" placeholder="Ej: Baie-Mahault, Guadeloupe" value={zone} onChange={(e) => setZone(e.target.value)} disabled={estado === 'loading'} />
            </div>
          </div>

          <label className="check">
            <input type="checkbox" checked={revision} onChange={(e) => setRevision(e.target.checked)} disabled={estado === 'loading'} />
            <span><b>Revisión profesional</b> — revisar los resultados antes de guardar. {revision ? '' : '(Desactivado: se guardan automáticamente)'}</span>
          </label>

          {mensaje && estado === 'form' && <p className="error">{mensaje}</p>}

          {estado === 'loading' ? (
            <div className="loading-box">
              <span className="spinner" />
              <div>
                <b>Buscando…</b>
                <p className="muted" style={{ margin: '2px 0 0' }}>El agente está trabajando. Puede tardar hasta 2 minutos, no cierres la página.</p>
              </div>
            </div>
          ) : (
            <button className="btn primary" onClick={buscar} style={{ marginTop: 16 }}>Buscar prospectos</button>
          )}
        </div>
      )}

      {/* -------- Revisión -------- */}
      {estado === 'review' && (
        <>
          <div className="review-head">
            <span><b>{resultados.length}</b> encontrados para <b>{nombreOrg}</b> · <b>{seleccionados}</b> seleccionados</span>
            <div>
              <button className="btn ghost" onClick={reiniciar}>Cancelar</button>
              <button className="btn primary" style={{ marginLeft: 8 }} onClick={() => insertar(resultados.filter((r) => r._keep))} disabled={guardando || seleccionados === 0}>
                {guardando ? 'Guardando…' : `Guardar ${seleccionados}`}
              </button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr><th></th><th>Empresa</th><th>Teléfono</th><th>Nota Google</th><th>Score</th><th></th></tr>
              </thead>
              <tbody>
                {resultados.map((p, i) => {
                  const meta = statusMeta(p.statut)
                  return (
                    <tr key={i} style={{ opacity: p._keep ? 1 : 0.45 }}>
                      <td><input type="checkbox" checked={p._keep} onChange={(e) => {
                        const copia = [...resultados]; copia[i] = { ...p, _keep: e.target.checked }; setResultados(copia)
                      }} /></td>
                      <td className="strong">{p.nom}</td>
                      <td>{p.telephone || '—'}</td>
                      <td>{p.note_google || '—'}</td>
                      <td>{p.score_audit}/10</td>
                      <td>{p._dup && <span className="dup-tag">Duplicado</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* -------- Resultado final -------- */}
      {(estado === 'done' || estado === 'error') && (
        <div className="create-box" style={{ maxWidth: 680 }}>
          <p className={estado === 'error' ? 'error' : ''} style={{ fontSize: 15 }}>{mensaje}</p>
          <button className="btn primary" onClick={reiniciar}>Nueva búsqueda</button>
        </div>
      )}
    </>
  )
}