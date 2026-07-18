// Intermediario: la web llama aquí, y aquí llamamos al agente de Jose.
// Resuelve el CORS (mismo origen) y aguanta la espera larga (Fluid Compute).
export const config = { maxDuration: 120 }

const WEBHOOK = 'https://n8n.srv1573958.hstgr.cloud/webhook/prospection-api'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const { secteur, zone, org_id } = body

    if (!secteur || !zone) {
      return res.status(400).json({ error: 'Faltan el sector o la zona' })
    }

    const r = await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secteur, zone, org_id }),
    })

    if (!r.ok) {
      return res.status(502).json({ error: 'El agente respondió con error ' + r.status })
    }

    const data = await r.json()
    const prospects = Array.isArray(data) ? data : (data ? [data] : [])
    return res.status(200).json({ prospects })
  } catch (e) {
    return res.status(500).json({ error: 'No se pudo contactar al agente: ' + (e?.message || 'desconocido') })
  }
}