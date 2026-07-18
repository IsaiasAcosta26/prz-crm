import { useMemo, useState } from 'react'
import { STATUSES, statusMeta } from '../lib/data'

export default function ProspectsTable({ prospects, onEdit, onOpen }) {
  const [q, setQ] = useState('')
  const [zona, setZona] = useState('')
  const [estado, setEstado] = useState('')

  const zonas = useMemo(
    () => [...new Set(prospects.map((p) => p.zone).filter(Boolean))],
    [prospects]
  )

  const filtrados = prospects.filter((p) => {
    const texto = (p.nom + ' ' + p.telephone + ' ' + p.email).toLowerCase()
    if (q && !texto.includes(q.toLowerCase())) return false
    if (zona && p.zone !== zona) return false
    if (estado && p.statut !== estado) return false
    return true
  })

  return (
    <>
      <h2 className="view-title">Prospectos</h2>
      <div className="filters">
        <input
          className="field"
          placeholder="Buscar nombre, teléfono, email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="field" value={zona} onChange={(e) => setZona(e.target.value)}>
          <option value="">Todas las zonas</option>
          {zonas.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>
        <select className="field" value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <span className="muted count">{filtrados.length} de {prospects.length}</span>
      </div>

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Teléfono</th>
              <th>Nota Google</th>
              <th>Score</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => {
              const meta = statusMeta(p.statut)
              return (
                <tr key={p.id}>
                  <td className="strong link" onClick={() => onOpen(p)}>{p.nom}</td>
                  <td>{p.telephone || '—'}</td>
                  <td>{p.note_google || '—'}</td>
                  <td>{p.score_audit}/10</td>
                  <td>
                    <select
                      className="status-select"
                      style={{ color: meta.color, borderColor: meta.color }}
                      value={p.statut}
                      onChange={(e) => onEdit(p.id, { statut: e.target.value })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td><button className="btn tiny" onClick={() => onOpen(p)}>Ver</button></td>
                </tr>
              )
            })}
            {filtrados.length === 0 && (
              <tr><td colSpan="6" className="muted" style={{ padding: 24 }}>Sin resultados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}