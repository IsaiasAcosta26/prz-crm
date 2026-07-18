// ---- Estados del prospecto (valor guardado en la BD = francés; label = español) ----
export const STATUSES = [
  { value: 'A contacter',         label: 'Por contactar',     color: '#64748B' },
  { value: 'Contacte',            label: 'Contactado',        color: '#3B82F6' },
  { value: 'En discussion',       label: 'En conversación',   color: '#F59E0B' },
  { value: 'Proposition envoyee', label: 'Propuesta enviada', color: '#8B5CF6' },
  { value: 'Client signe',        label: 'Cliente ganado',    color: '#22C55E' },
  { value: 'Perdu',               label: 'Perdido',           color: '#EF4444' },
]

export const statusMeta = (value) =>
  STATUSES.find((s) => s.value === value) || { value, label: value, color: '#64748B' }

// "resumen\nItem: desc | Item: desc" -> { resumen, items:[{titulo,desc}] }
export function parseManques(text) {
  if (!text || !text.trim()) return { resumen: '', items: [] }
  const [primera, ...resto] = text.split('\n')
  const items = (resto.join('\n') || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((chunk) => {
      const i = chunk.indexOf(':')
      return i === -1
        ? { titulo: chunk, desc: '' }
        : { titulo: chunk.slice(0, i).trim(), desc: chunk.slice(i + 1).trim() }
    })
  return { resumen: primera.trim(), items }
}

// "Oferta (razon) | Oferta (razon)\nposicionamiento" -> { ofertas:[...], posicionamiento }
export function parseProposition(text) {
  if (!text || !text.trim()) return { ofertas: [], posicionamiento: '' }
  const [primera, ...resto] = text.split('\n')
  const ofertas = primera.split('|').map((s) => s.trim()).filter(Boolean)
  return { ofertas, posicionamiento: resto.join(' ').trim() }
}

export function deriveKPIs(prospects) {
  const total = prospects.length
  const by = (v) => prospects.filter((p) => p.statut === v).length
  const scores = prospects.map((p) => p.score_audit || 0)
  return {
    total,
    porContactar: by('A contacter'),
    enProceso: by('Contacte') + by('En discussion') + by('Proposition envoyee'),
    ganados: by('Client signe'),
    scorePromedio: total ? (scores.reduce((a, b) => a + b, 0) / total).toFixed(1) : '0',
  }
}