// Crea un usuario y lo asigna a una empresa. Corre en el servidor con la
// llave secreta (nunca en el navegador). Solo un admin puede usarlo.
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })
  if (!url || !serviceKey) return res.status(500).json({ error: 'Faltan variables de entorno del servidor' })

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. Verificar que quien llama es un admin (con su token de sesión)
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No autenticado' })

  const { data: caller, error: callerErr } = await admin.auth.getUser(token)
  if (callerErr || !caller?.user) return res.status(401).json({ error: 'Sesión inválida' })

  const { data: perfil } = await admin.from('profiles').select('role').eq('id', caller.user.id).single()
  if (perfil?.role !== 'admin') return res.status(403).json({ error: 'Solo un admin puede crear usuarios' })

  // 2. Leer y validar datos
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
  const { email, password, nombre, org_id, role } = body
  if (!email || !password || !org_id) {
    return res.status(400).json({ error: 'Faltan email, contraseña o empresa' })
  }

  // 3. Crear el usuario en Auth (ya confirmado, sin email de verificación)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre: nombre || '' },
  })
  if (createErr) return res.status(400).json({ error: createErr.message })

  const newId = created.user.id

  // 4. Asegurar el perfil con el rol correcto
  await admin.from('profiles').upsert({
    id: newId,
    email,
    nombre: nombre || '',
    role: role === 'admin' ? 'admin' : 'client',
  })

  // 5. Asignarlo a la empresa
  const { error: memErr } = await admin.from('memberships').insert({
    user_id: newId,
    org_id,
    role: 'member',
  })
  if (memErr) return res.status(400).json({ error: 'Usuario creado, pero falló la asignación: ' + memErr.message })

  return res.status(200).json({ ok: true, user_id: newId })
}