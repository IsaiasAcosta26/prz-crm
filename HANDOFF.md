# Documento de traspaso — PRZ CRM

Este documento es para la persona que **toma el proyecto**. Resume el estado exacto
en que se entrega, qué accesos hace falta transferir, qué está pendiente y los
detalles que no se ven en el código. Léelo completo antes de tocar nada.

Para lo técnico (arquitectura, instalación, base de datos), ver **README.md**.

---

## 1. Estado en que se entrega

**Funcionando en producción** (https://prz-crm-kpvp.vercel.app):

- [x] Login con correo/contraseña (Supabase Auth).
- [x] Multi-tenant real: cada cliente ve solo lo suyo (RLS por `org_id`).
- [x] Panel con KPIs y distribución por estado.
- [x] Prospectos: tabla con buscador, filtros (zona/estado) y cambio de estado en línea.
- [x] Kanban con arrastrar y soltar (guarda el nuevo estado).
- [x] Ficha de detalle (carencias y propuesta parseadas) + notas internas editables.
- [x] Empresas: alta/listado de clientes, cambio de plan, copiar `org_id`.
- [x] Buscar: conectado al agente de Jose; 2 modos (revisión / automático); detecta duplicados.
- [x] Usuarios: alta de usuarios y asignación a empresa (función servidor protegida por rol admin).
- [x] Deploy automático (GitHub → Vercel).

**La base es sólida y el flujo central (agente → plataforma → cliente) está cerrado.**

---

## 2. Accesos a transferir (CHECKLIST)

El que entrega debe dar acceso al que recibe en:

- [ ] **GitHub** — invitar como colaborador al repo `IsaiasAcosta26/prz-crm` (Settings → Collaborators).
- [ ] **Supabase** — invitar al proyecto (Organization → Members). Sin esto no puede ver la base ni las llaves.
- [ ] **Vercel** — invitar al proyecto/equipo. Sin esto no puede ver logs, variables ni deploys.
- [ ] **Credenciales / llaves** (entregar por canal seguro, NO por chat ni en el repo):
  - [ ] `VITE_SUPABASE_ANON_KEY` (publishable) — poco sensible.
  - [ ] `SUPABASE_SERVICE_KEY` (service_role) — **SECRETA Y CRÍTICA**.
  - [ ] Contraseña de la base de datos de Supabase (la que se guardó al crear el proyecto).
- [ ] **Contacto de Jose** (dueño del agente n8n) — imprescindible para cualquier cambio del webhook.
- [ ] **Cuentas admin existentes** (ver punto 5): decidir si se conservan, se cambian o se revocan.

> Recomendación de seguridad: al cerrar el traspaso, **rotar la `service_role` key** de
> Supabase (regenerarla) para que quien deja el proyecto ya no tenga acceso de escritura total.

---

## 3. Datos de configuración (no secretos)

| Dato | Valor |
|---|---|
| URL producción | https://prz-crm-kpvp.vercel.app |
| Repo | https://github.com/IsaiasAcosta26/prz-crm (privado) |
| Proyecto Supabase (ID) | `sjzafsmdzdlztxobjqfc` |
| Supabase URL | https://sjzafsmdzdlztxobjqfc.supabase.co |
| Región Supabase | us-west-2 (Oregón) |
| Webhook agente (n8n/Jose) | `POST https://n8n.srv1573958.hstgr.cloud/webhook/prospection-api` |
| org_id de "Cliente Demo" | `2d6ff717-8939-4cde-9e1a-2f0d9e300971` |

---

## 4. Datos de prueba

- Empresa **"Cliente Demo"** con **10 prospectos reales** (agencias de viaje de Guadalupe),
  cargados manualmente para el demo.
- Empresa **"Prueba 2"** (vacía o con lo que se haya buscado).
- El agente de Jose busca en **Guadalupe**; para probar usar zonas de allá
  (ej. sector `Restaurants`, zona `Pointe-à-Pitre, Guadeloupe`).

---

## 5. Cuentas admin actuales

| Correo | Rol | Quién |
|---|---|---|
| acostalorensoi@gmail.com | admin | Desarrollador saliente (Isaías) |
| jose.prz@outlook.fr | admin | Jose (PRZ, socio/dueño del agente) |

> Al tomar el proyecto: crear tu propio usuario admin y decidir qué hacer con estos
> (la de Isaías probablemente se revoca; la de Jose se conserva).

---

## 6. Pendientes (roadmap sugerido, por prioridad)

**Alta**
- [ ] **Anti-pausa de Supabase.** El free tier se pausa a los 7 días sin uso. Montar un
      **GitHub Action** programado (cron cada ~3 días) que haga un ping a la base para
      mantenerla despierta. Crítico si hay clientes usando la web.
- [ ] **Backups.** El free tier **no tiene copias de seguridad**. Antes de meter clientes
      reales, subir a **Supabase Pro (~$25/mes)** para backups diarios automáticos.

**Media**
- [ ] **Planes que activen funciones.** Ya existen los campos `organizations.plan` y
      `organizations.features`, pero no se usan. Implementar que el plan controle qué
      pestañas/funciones ve cada cliente (ej. Kanban/export solo en Pro).
- [ ] **Exportar a CSV/Excel** los prospectos de un cliente.
- [ ] **Crear/editar/borrar prospectos a mano** (hoy solo entran por el agente o carga SQL).
- [ ] **Búsqueda para clientes** (que un `client` pueda buscar para su propia empresa, no solo el admin).

**Baja (pulido)**
- [ ] **Responsive móvil** (tabla y Kanban aprietan en pantallas chicas).
- [ ] **Branding por cliente** (logo y color por empresa al entrar).
- [ ] **Paginación / orden** cuando haya cientos de prospectos (hoy carga todo de golpe).
- [ ] Reemplazar los `alert()` por notificaciones más cuidadas.

---

## 7. Problemas conocidos y consideraciones de seguridad

- **El webhook del agente no tiene autenticación.** Cualquiera que conozca la URL puede
  disparar el agente (posible abuso/costo de SerpAPI/Claude). Endurecer con un token
  compartido entre esta plataforma y n8n (coordinar con Jose).
- **Búsquedas largas (30–90 s) sostenidas por espera síncrona.** Funciona con Fluid
  Compute, pero si el volumen crece conviene pasar a un patrón asíncrono (la búsqueda
  corre en segundo plano y el resultado aparece cuando termina).
- **Sensibilidad a mayúsculas en nombres de archivo** (Windows vs Linux/Vercel): al crear
  componentes, el nombre del archivo debe coincidir EXACTO con el `import`, o el build de
  Vercel falla. Ver README → Solución de problemas.
- **Las funciones `/api` no corren en local.** Probar Buscar y crear-usuario siempre en Vercel.

---

## 8. Cómo trabajar el día a día

1. `npm install` (primera vez), `npm run dev` para desarrollo local.
2. Cambios en base de datos → SQL Editor de Supabase (documentar en `schema.sql`).
3. `git push` a `main` → Vercel despliega solo.
4. Variables nuevas → configurarlas en Vercel y **Redeploy**.
5. Cambios en el agente/webhook → coordinar con **Jose**.

---

## 9. Contactos

| Rol | Persona | Para qué |
|---|---|---|
| Dueño del negocio / agente n8n | **Jose (PRZ)** — jose.prz@outlook.fr | Todo lo del agente de prospección y el webhook |
| Desarrollador saliente | Isaías Acosta | Dudas de traspaso (periodo acordado) |

---

_Fin del documento de traspaso._