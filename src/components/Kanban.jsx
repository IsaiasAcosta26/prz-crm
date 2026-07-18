import { useState } from 'react'
import { STATUSES } from '../lib/data'

export default function Kanban({ prospects, onEdit, onOpen }) {
  const [dragId, setDragId] = useState(null)
  const [overCol, setOverCol] = useState(null)

  function drop(status) {
    if (dragId != null) {
      const p = prospects.find((x) => x.id === dragId)
      if (p && p.statut !== status) onEdit(dragId, { statut: status })
    }
    setDragId(null)
    setOverCol(null)
  }

  return (
    <>
      <h2 className="view-title">Pipeline</h2>
      <div className="board">
        {STATUSES.map((s) => {
          const items = prospects.filter((p) => p.statut === s.value)
          return (
            <div
              key={s.value}
              className={overCol === s.value ? 'col over' : 'col'}
              onDragOver={(e) => { e.preventDefault(); setOverCol(s.value) }}
              onDragLeave={() => setOverCol((c) => (c === s.value ? null : c))}
              onDrop={() => drop(s.value)}
            >
              <div className="col-head" style={{ borderTopColor: s.color }}>
                <span>{s.label}</span>
                <span className="pill">{items.length}</span>
              </div>
              <div className="col-body">
                {items.map((p) => (
                  <div
                    key={p.id}
                    className="card"
                    draggable
                    onDragStart={() => setDragId(p.id)}
                    onClick={() => onOpen(p)}
                  >
                    <div className="card-title">{p.nom}</div>
                    <div className="card-meta">{p.note_google || 'sin nota'} · {p.score_audit}/10</div>
                  </div>
                ))}
                {items.length === 0 && <div className="col-empty">Arrastra aquí</div>}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}