# PRZ CRM

![React](https://img.shields.io/badge/Frontend-React%20+%20Vite-61DAFB?logo=react&logoColor=white)
![Supabase](https://img.shields.io/badge/Backend-Supabase%20(Postgres)-3ECF8E?logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)
![Estado](https://img.shields.io/badge/Estado-Producci%C3%B3n%20(demo)-orange)

Plataforma **CRM multi-cliente** para **PRZ Services**. Centraliza los prospectos
que genera un agente de prospección automático (n8n + Claude) y los entrega a cada
cliente en su propia cuenta, con login, filtros, tablero Kanban y búsqueda en vivo.

> **URL en producción:** https://prz-crm-kpvp.vercel.app
> **Repositorio:** https://github.com/IsaiasAcosta26/prz-crm (public)

---

## Tabla de contenido

1. [Qué es y la idea central](#qué-es-y-la-idea-central)
2. [Cómo funciona (arquitectura)](#cómo-funciona-arquitectura)
3. [Stack tecnológico](#stack-tecnológico)
4. [Estructura del proyecto](#estructura-del-proyecto)
5. [Requisitos previos](#requisitos-previos)
6. [Instalación y ejecución local](#instalación-y-ejecución-local)
7. [Variables de entorno](#variables-de-entorno)
8. [Base de datos](#base-de-datos)
9. [Funciones serverless (/api)](#funciones-serverless-api)
10. [Integración con el agente de prospección](#integración-con-el-agente-de-prospección)
11. [Roles y multi-tenancy](#roles-y-multi-tenancy)
12. [Despliegue](#despliegue)
13. [Solución de problemas](#solución-de-problemas)
14. [Herramientas y accesos](#herramientas-y-accesos)

---

## Qué es y la idea central

Es **UNA sola aplicación para todos los clientes**, no una app por cliente
(modelo SaaS multi-tenant, como Netflix: una plataforma, cada quien entra con su
cuenta y ve solo lo suyo).

- Cada **cliente-empresa** es una *organización* (`org_id`).
- Cada prospecto pertenece a una organización.
- **Row Level Security (RLS)** de PostgreSQL garantiza que un cliente solo vea
  los prospectos de su organización. El aislamiento lo hace la base de datos, no
  el código de pantalla.
- Un **admin** (PRZ / los dueños) ve y gestiona todo.

**Por qué así:** una sola base de código se mejora una vez y le llega a todos los
clientes. Una app por cliente sería inmantenible.

---

## Cómo funciona (arquitectura)

```
  ┌──────────────────────┐        POST secteur, zone, org_id
  │  Agente de Jose (n8n) │  <───────────────────────────────┐
  │  SerpAPI + scraping   │                                  │
  │  + Claude (auditoría) │  ───────────►  array JSON         │
  └──────────────────────┘   (13 campos por prospecto)       │
                                                              │
                    (2)                                       │ (1)
  ┌───────────────────────────────────────────────┐          │
  │  Funciones serverless  /api  (Vercel, Node)    │──────────┘
  │  - prospection.js  → llama al webhook de Jose  │
  │  - create-user.js  → crea usuarios (admin)     │
  └───────────────────────────────────────────────┘
                    │  (3) inserta con org_id
                    ▼
  ┌───────────────────────────────────────────────┐
  │  Supabase (PostgreSQL + Auth + RLS)            │
  │  organizations · profiles · memberships ·      │
  │  prospects                                     │
  └───────────────────────────────────────────────┘
                    ▲
                    │  (4) lee/escribe (filtrado por RLS)
  ┌───────────────────────────────────────────────┐
  │  Frontend React (Vite) — Vercel                │
  │  Login · Panel · Prospectos · Kanban ·         │
  │  Buscar · Empresas · Usuarios                  │
  └───────────────────────────────────────────────┘
```

**Flujo de una búsqueda:**
1. El admin elige cliente + sector + zona y pulsa Buscar.
2. El frontend llama a `/api/prospection` (mismo origen → sin CORS).
3. La función reenvía al webhook de n8n de Jose y espera la respuesta (30–90 s).
4. Devuelve el array; el frontend mapea los campos, pega el `org_id` y (según el
   modo elegido) revisa o inserta directo en Supabase.

---

## Stack tecnológico

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend | React 18 + Vite | CSS propio (sin framework de UI) |
| Base de datos + Auth | Supabase (PostgreSQL) | RLS para multi-tenancy |
| API/servidor | Vercel Serverless Functions (Node) | carpeta `/api` |
| Hosting / CI-CD | Vercel (plan Hobby, Fluid Compute) | deploy automático al hacer push |
| Versionado | GitHub (repo privado) | rama `main` |
| Agente externo | n8n (servidor de Jose, Hostinger) | motor de prospección |

---

## Estructura del proyecto

```
prz-crm/
├── api/                      # Funciones serverless (solo corren en Vercel)
│   ├── prospection.js        # Proxy al webhook del agente n8n de Jose
│   └── create-user.js        # Alta de usuarios (admin, usa service key)
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── Buscar.jsx         # Buscador conectado al agente (2 modos)
│   │   ├── Empresas.jsx       # Alta/listado de clientes-empresa + org_id
│   │   ├── Kanban.jsx         # Tablero por estado con drag & drop
│   │   ├── ProspectDrawer.jsx # Ficha lateral de detalle + edición
│   │   ├── ProspectsTable.jsx # Tabla con filtros y cambio de estado en linea
│   │   └── Usuarios.jsx       # Alta de usuarios y asignacion a empresa
│   ├── lib/
│   │   └── data.js            # Estados, helpers de parseo, mapeo de datos
│   ├── App.jsx               # Auth gate + navegacion + Dashboard + Login
│   ├── index.css             # Sistema de diseño (tema oscuro)
│   ├── main.jsx              # Punto de entrada (importa index.css)
│   └── supabase.js           # Inicializacion del cliente Supabase
├── .env                      # Llaves locales (NO se sube — ver .gitignore)
├── .env.example             # Plantilla de variables
├── .gitignore
├── schema.sql               # Esquema COMPLETO de la base de datos
├── package.json
├── vite.config.js
├── README.md
└── HANDOFF.md               # Documento de traspaso (leer para tomar el proyecto)
```

> Nota: `src/App.css` es de la plantilla original y ya no se usa (puede borrarse).

---

## Requisitos previos

- **Node.js 18+** (probado con 22.x)
- Cuenta en **Supabase**, **Vercel** y **GitHub**
- Editor (VS Code recomendado)

---

## Instalación y ejecución local

```bash
git clone https://github.com/IsaiasAcosta26/prz-crm.git
cd prz-crm
npm install
cp .env.example .env      # y rellena tus valores reales
npm run dev               # abre http://localhost:5173
```

> **IMPORTANTE:** las funciones de `/api` **NO corren en local** con `npm run dev`
> (Vite no las sirve). El **login y la lectura de datos sí funcionan** en local,
> pero **Buscar** y **crear usuarios** solo funcionan en el sitio desplegado en
> Vercel. Para probar `/api` en local se necesitaría `vercel dev`.

---

## Variables de entorno

| Variable | Dónde | Pública | Descripción |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Local (.env) y Vercel | Sí | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Local (.env) y Vercel | Sí | Llave *publishable* (protegida por RLS) |
| `SUPABASE_URL` | Solo Vercel | Sí | URL del proyecto (para las funciones /api) |
| `SUPABASE_SERVICE_KEY` | Solo Vercel | **NO — SECRETA** | Llave `service_role`. Todopoderosa. Solo servidor. |

Reglas:
- Las `VITE_*` se **envían al navegador**: solo pon ahí datos públicos.
- `SUPABASE_SERVICE_KEY` **jamás** lleva prefijo `VITE_` ni va al frontend ni a Git.
- En Vercel se configuran en **Settings → Environment Variables**. Tras cambiarlas,
  hacer **Redeploy**.

---

## Base de datos

Todo el esquema está en **`schema.sql`** (tablas, triggers, funciones y políticas RLS).
Para recrear la base en un proyecto Supabase nuevo: pegar `schema.sql` completo en el
**SQL Editor** y ejecutarlo. Al final del archivo hay los pasos para crear el primer admin.

**Tablas:**
- `organizations` — clientes-empresa (tenant). Campos: `plan` y `features` (este último
  reservado para activar funciones por plan; aún sin usar).
- `profiles` — extiende `auth.users` con `role` (`admin` / `client`). Se crea solo por trigger.
- `memberships` — relación usuario ↔ empresa (soporta clientes con varias personas).
- `prospects` — los prospectos, siempre atados a un `org_id`.

**Seguridad:** funciones `is_member(org_id)` e `is_admin()` (ambas `SECURITY DEFINER`
para evitar recursión en RLS) + políticas por tabla.

---

## Funciones serverless (/api)

Carpeta `api/` en la raíz. Vercel las detecta y despliega como funciones Node.

### `api/prospection.js`
Proxy entre el frontend y el agente de Jose. Resuelve el **CORS** (el frontend la
llama en el mismo origen) y aguanta la **espera larga** (30–90 s) gracias a
**Fluid Compute** (`maxDuration: 120`). Recibe `{ secteur, zone, org_id }`, llama al
webhook de n8n y devuelve `{ prospects: [...] }`.

### `api/create-user.js`
Crea un usuario y lo asigna a una empresa. Usa `SUPABASE_SERVICE_KEY` (por eso corre
en servidor). **Protegida:** valida con el token de sesión que quien llama sea `admin`
antes de crear nada. Recibe `{ email, password, nombre, org_id, role }`.

---

## Integración con el agente de prospección

El motor de búsqueda es un workflow de **n8n** propiedad de Jose (PRZ). No vive en
este repo; este proyecto solo lo **consume** vía webhook.

- **Endpoint:** `POST https://n8n.srv1573958.hstgr.cloud/webhook/prospection-api`
- **Body:** `{ "secteur": "...", "zone": "...", "org_id": "..." }`
  (el agente usa `secteur` y `zone`; `org_id` lo usa solo esta plataforma).
- **Respuesta:** siempre un **array JSON** (o `[]` si no hay resultados), con 13 campos
  por prospecto.
- **Duración:** 30–90 s (SerpAPI + scraping secuencial + Claude por prospecto).

**Mapeo de campos (agente → base de datos)** — se hace en `src/lib/data.js` (`mapProspect`):

| Campo del agente | Campo en la base | Transformación |
|---|---|---|
| `score` (ej. `"7/10"`) | `score_audit` (entero) | se extrae el número |
| `proposition` | `proposition_prz` | renombrado |
| resto (11 campos) | igual nombre | directo |

Para disparar el agente desde otra web basta con hacer el POST al webhook. Cambiar el
webhook implica actualizar la constante `WEBHOOK` en `api/prospection.js`.

---

## Roles y multi-tenancy

| Rol | Qué ve | Pestañas |
|---|---|---|
| `admin` | Todos los clientes y todos los prospectos | Panel, Prospectos, Kanban, **Buscar, Empresas, Usuarios** |
| `client` | Solo los prospectos de su(s) empresa(s) | Panel, Prospectos, Kanban |

El rol vive en `profiles.role`. Para hacer admin a alguien: ver el final de `schema.sql`.

---

## Despliegue

Deploy **automático**: cada `git push` a `main` dispara un build en Vercel.

```bash
git add .
git commit -m "descripcion del cambio"
git push
```

Vercel construye y publica en 1–2 min. Ver estado en **Vercel → Deployments**.

**Puntos clave del entorno Vercel:**
- Plan **Hobby (gratis)**. **Fluid Compute** debe estar **ON** (Settings → Functions)
  para que las funciones aguanten hasta 300 s.
- Las 4 variables de entorno deben estar configuradas (ver sección Variables).
- Tras cambiar variables, hacer **Redeploy**.

---

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| Build de Vercel falla con `UNRESOLVED_IMPORT` | Nombre de archivo con mayúsculas distintas (Windows no distingue, Linux sí) | Renombrar el archivo para que **coincida exacto** con el `import`. En Git usar `git mv` en dos pasos (nombre_temp → nombre_final). |
| `Buscar` da `404` / `Unexpected end of JSON input` | Estás en `localhost` (las `/api` no corren en local) | Probar en la URL de Vercel. |
| La web no muestra una pestaña/cambio nuevo | Caché del navegador | **Ctrl + Shift + R** (recarga forzada). |
| `infinite recursion detected in policy for relation "profiles"` | Política RLS que se auto-referencia | Usar las funciones `is_admin()`/`is_member()` (`SECURITY DEFINER`) como en `schema.sql`. |
| Tabla de prospectos vacía tras login | Usuario sin membership o sin rol admin | Asignar membership / rol (ver `schema.sql`). |
| Crear usuario falla con error de auth/servicio | `SUPABASE_SERVICE_KEY` ausente o inválida | Verificar la variable en Vercel; probar con la llave `service_role` (legacy). |
| El proyecto Supabase "desaparece"/da error tras días | Free tier se **pausa** a los 7 días sin uso | Reactivar en el panel; ver pendiente "anti-pausa" en HANDOFF. |

---

## Herramientas y accesos

| Herramienta | Para qué | Nota de acceso |
|---|---|---|
| **Supabase** | Base de datos, Auth, RLS, llaves | Requiere ser miembro del proyecto |
| **Vercel** | Deploy, variables de entorno, funciones | Requiere acceso al proyecto |
| **GitHub** | Código y versionado (repo privado) | Requiere ser colaborador |
| **n8n (Jose)** | Agente de prospección (externo) | Lo administra Jose; coordinar cambios de webhook con él |
| **Node.js / VS Code / Git** | Entorno de desarrollo local | Instalación propia del dev |

> El detalle del **traspaso de accesos y credenciales** está en **`HANDOFF.md`**.