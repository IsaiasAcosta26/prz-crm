import { useEffect, useState } from 'react'
import { STATUSES, statusMeta, parseManques, parseProposition } from '../lib/data'

export default function ProspectDrawer({ prospect, onClose, onSave }) {
  const [statut, setStatut] = useState(prospect.statut)
  const [notes, setNotes] = useState(prospect.notes || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setStatut(prospect.statut)
    setNotes(prospect.notes || '')
  }, [prospect.id])

  const manques = parseManques(prospect.manques)
  const prop = parseProposition(prospect.proposition_prz)
  const meta = statusMeta(statut)
  const dirty = statut !== prospect.statut || (notes || '') !== (prospect.notes || '')

  async function guardar() {
    setSaving(true)
    await onSave(prospect.id, { statut, notes })
    setSaving(false)
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <h3>{prospect.nom}</h3>
            <span className="muted">{prospect.secteur} · {prospect.zone}</span>
          </div>
          <button className="btn ghost" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          <div className="kv">
            <Field label="Teléfono" value={prospect.telephone} />
            <Field label="Email" value={prospect.email} />
            <Field label="Sitio web" value={prospect.site_web} link />
            <Field label="Instagram" value={prospect.instagram} link />
            <Field label="Nota Google" value={prospect.note_google} />
            <Field label="Score auditoría" value={`${prospect.score_audit}/10`} />
          </div>

          <label className="lbl">Estado</label>
          <select
            className="field"
            style={{ color: meta.color, borderColor: meta.color }}
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <label className="lbl">Carencias detectadas</label>
          {manques.resumen && <p className="para">{manques.resumen}</p>}
          {manques.items.length > 0 ? (
            <ul className="bullets">
              {manques.items.map((it, i) => (
                <li key={i}><b>{it.titulo}</b>{it.desc && <> — {it.desc}</>}</li>
              ))}
            </ul>
          ) : (!manques.resumen && <p className="muted">Sin información.</p>)}

          <label className="lbl">Propuesta PRZ</label>
          {prop.ofertas.length > 0 ? (
            <div className="chips">
              {prop.ofertas.map((o, i) => <span className="chip" key={i}>{o}</span>)}
            </div>
          ) : (
            <p className="muted">Sin propuesta.</p>
          )}
          {prop.posicionamiento && <p className="para">{prop.posicionamiento}</p>}

          <label className="lbl">Notas internas</label>
          <textarea
            className="field area"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Añade una nota…"
          />
        </div>

        <div className="drawer-foot">
          <button className="btn primary" onClick={guardar} disabled={!dirty || saving}>
            {saving ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Guardado'}
          </button>
        </div>
      </aside>
    </div>
  )
}

function Field({ label, value, link }) {
  const href = value && value.startsWith('http') ? value : 'https://' + value
  return (
    <div className="kv-item">
      <span className="kv-label">{label}</span>
      {value ? (
        link ? (
          <a className="kv-value link" href={href} target="_blank" rel="noreferrer">{value}</a>
        ) : (
          <span className="kv-value">{value}</span>
        )
      ) : (
        <span className="kv-value muted">—</span>
      )}
    </div>
  )
}