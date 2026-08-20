-- ============================================================================
-- PRZ CRM — Esquema completo de la base de datos (Supabase / PostgreSQL)
-- ============================================================================
-- Ejecutar este archivo COMPLETO en el SQL Editor de un proyecto Supabase
-- NUEVO y vacío para recrear toda la estructura desde cero.
-- Orden importante: tablas -> funciones -> RLS. No cambiar el orden.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLA organizations  (cada cliente-empresa = un "tenant")
-- ----------------------------------------------------------------------------
CREATE TABLE public.organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL,
  plan       TEXT NOT NULL DEFAULT 'basico' CHECK (plan IN ('basico','pro','enterprise')),
  features   JSONB NOT NULL DEFAULT '{}',   -- reservado para activar funciones por plan (aun sin usar)
  activo     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. TABLA profiles  (extiende auth.users con rol y datos de negocio)
-- ----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  nombre     TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin','client')),
  activo     BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crea el perfil automaticamente cuando alguien se registra en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nombre',''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. TABLA memberships  (relacion usuario <-> empresa; soporta equipos)
-- ----------------------------------------------------------------------------
CREATE TABLE public.memberships (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role    TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  PRIMARY KEY (user_id, org_id)
);
CREATE INDEX idx_memberships_org ON public.memberships(org_id);

-- ----------------------------------------------------------------------------
-- 4. TABLA prospects  (los prospectos generados por el agente)
-- ----------------------------------------------------------------------------
CREATE TABLE public.prospects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by      UUID REFERENCES public.profiles(id),
  date            DATE DEFAULT CURRENT_DATE,
  secteur         TEXT DEFAULT '',
  zone            TEXT DEFAULT 'Guadeloupe',
  nom             TEXT NOT NULL,
  telephone       TEXT DEFAULT '',
  site_web        TEXT DEFAULT '',
  note_google     TEXT DEFAULT '',
  score_audit     INTEGER DEFAULT 0 CHECK (score_audit >= 0 AND score_audit <= 10),
  manques         TEXT DEFAULT '',
  instagram       TEXT DEFAULT '',
  email           TEXT DEFAULT '',
  proposition_prz TEXT DEFAULT '',
  statut          TEXT DEFAULT 'A contacter' CHECK (statut IN (
                    'A contacter','Contacte','En discussion',
                    'Proposition envoyee','Client signe','Perdu')),
  notes           TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_prospects_org    ON public.prospects(org_id);
CREATE INDEX idx_prospects_statut ON public.prospects(statut);

-- Mantiene updated_at al dia
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------------------
-- 5. FUNCIONES DE SEGURIDAD (SECURITY DEFINER = evitan recursion en RLS)
-- ----------------------------------------------------------------------------
-- ¿el usuario actual pertenece a esta empresa?
CREATE OR REPLACE FUNCTION public.is_member(target_org UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid() AND org_id = target_org
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ¿el usuario actual es admin global?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY  (aislamiento entre clientes)
-- ----------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects     ENABLE ROW LEVEL SECURITY;

-- profiles: cada quien ve el suyo; el admin ve todos
CREATE POLICY "read_own_profile" ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- memberships: cada quien ve las suyas; el admin ve todas
CREATE POLICY "read_own_memberships" ON public.memberships FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- organizations: ves tu empresa si perteneces; el admin ve todas y puede crear/editar
CREATE POLICY "read_own_org" ON public.organizations FOR SELECT
  USING (public.is_member(id) OR public.is_admin());
CREATE POLICY "admin_insert_org" ON public.organizations FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY "admin_update_org" ON public.organizations FOR UPDATE
  USING (public.is_admin());

-- prospects: ves los de tu empresa; el admin ve/edita todos
CREATE POLICY "read_org_prospects" ON public.prospects FOR SELECT
  USING (public.is_member(org_id) OR public.is_admin());
CREATE POLICY "write_org_prospects" ON public.prospects FOR ALL
  USING (public.is_member(org_id) OR public.is_admin())
  WITH CHECK (public.is_member(org_id) OR public.is_admin());

-- ============================================================================
-- FIN DEL ESQUEMA
-- ============================================================================
-- DESPUES de correr esto, para crear el primer admin manualmente:
--   1) Crea un usuario en Authentication > Users (Add user, Auto Confirm ON)
--   2) Ejecuta (reemplazando el correo):
--        INSERT INTO public.profiles (id, email, nombre, role)
--        SELECT id, email, 'Nombre', 'admin'
--        FROM auth.users WHERE email = 'tu-correo@ejemplo.com'
--        ON CONFLICT (id) DO UPDATE SET role = 'admin';
--   3) Crea una empresa y asigna el admin como owner:
--        INSERT INTO public.organizations (nombre, plan) VALUES ('Cliente Demo','pro');
--        INSERT INTO public.memberships (user_id, org_id, role)
--        SELECT (SELECT id FROM public.profiles WHERE email='tu-correo@ejemplo.com'),
--               (SELECT id FROM public.organizations WHERE nombre='Cliente Demo'),
--               'owner';
-- ============================================================================