# Mundial 2026 — Bracket & Predictor

Aplicación web para seguir el bracket de eliminatorias del Mundial 2026, predecir ganadores y competir en un ranking global con amigos.

## Características

- **Bracket visual** de las eliminatorias (R32 → Cuartos → Semis → Final)
- **Predicciones** con clic en cada partido antes de que comience
- **Ranking global** en tiempo real vía Supabase Realtime
- **Persistencia híbrida**: usa Supabase si está configurado, o localStorage como fallback
- **Auto-refresh** cada 90 segundos si hay partidos en vivo
- **Datos reales** de football-data.org (con demo sin necesidad de internet)

## Estructura de archivos

```
mundial2026/
├── index.html          ← entrada principal
├── css/
│   └── styles.css      ← todos los estilos
├── js/
│   ├── config.js       ← API keys y constantes (¡edita aquí!)
│   ├── api.js          ← llamadas a football-data.org
│   ├── supabase.js     ← conexión y operaciones con Supabase
│   ├── bracket.js      ← render del bracket y llaves
│   ├── predictions.js  ← tablas de predicciones y ranking
│   └── app.js          ← inicialización y controlador general
└── README.md
```

---

## 1. Configurar Supabase (ranking global)

> **Opcional.** Sin Supabase la app funciona igual pero el ranking es local.

### 1.1 Crear cuenta y proyecto

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta gratuita.
2. Crea un nuevo proyecto (región más cercana a tus usuarios, p. ej. *South America - São Paulo*).
3. Espera ~2 minutos a que el proyecto esté listo.

### 1.2 Crear las tablas

En tu proyecto de Supabase ve a **SQL Editor** y ejecuta:

```sql
-- Tabla de predicciones
CREATE TABLE predictions (
  id               uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name        text    NOT NULL,
  match_id         integer NOT NULL,
  predicted_winner text    NOT NULL,
  created_at       timestamp DEFAULT now(),
  UNIQUE(user_name, match_id)
);

-- Tabla de usuarios
CREATE TABLE users (
  user_name  text PRIMARY KEY,
  created_at timestamp DEFAULT now()
);
```

### 1.3 Configurar permisos (Row Level Security)

Ejecuta esto también en el SQL Editor para que el anon key pueda leer y escribir:

```sql
-- Habilitar RLS
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users       ENABLE ROW LEVEL SECURITY;

-- Políticas para predicciones
CREATE POLICY "lectura_publica"  ON predictions FOR SELECT USING (true);
CREATE POLICY "insercion_libre"  ON predictions FOR INSERT WITH CHECK (true);
CREATE POLICY "actualizacion"    ON predictions FOR UPDATE USING (true);

-- Políticas para usuarios
CREATE POLICY "lectura_usuarios" ON users FOR SELECT USING (true);
CREATE POLICY "insercion_usuarios" ON users FOR INSERT WITH CHECK (true);
```

### 1.4 Activar Realtime

Para que el ranking se actualice en tiempo real:

1. Ve a **Database → Replication** en el panel de Supabase.
2. Busca la tabla `predictions` y activa el toggle de **Realtime**.

### 1.5 Obtener las credenciales

1. Ve a **Project Settings → API**.
2. Copia:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`

### 1.6 Pegar las credenciales en config.js

Abre `js/config.js` y edita:

```js
const CONFIG = {
  API_KEY:          'fd01075a76f44d0d954557f521a3f9cd',
  API_BASE:         'https://api.football-data.org/v4',
  SUPABASE_URL:     'https://xxxxxxxxxxxx.supabase.co',   // ← aquí
  SUPABASE_ANON_KEY:'eyJhbGciOiJIUzI1NiIsInR5cCI6...',  // ← aquí
  ...
};
```

---

## 2. API de football-data.org

La API key ya está incluida en `config.js`:

```
fd01075a76f44d0d954557f521a3f9cd
```

El plan gratuito permite **10 solicitudes por minuto**. La app implementa un cache de 60 segundos para no superarlo. Si quieres usar tu propia key (o tienes un plan de pago), reemplaza el valor de `API_KEY` en `config.js`.

---

## 3. Publicar en GitHub Pages

### 3.1 Crear el repositorio en GitHub

Primero crea el repositorio vacío en [github.com/new](https://github.com/new):
- **Repository name:** `mundial2026` (o el nombre que prefieras)
- **Visibility:** Public (requerido para GitHub Pages gratuito)
- **NO** marques "Add a README file"

### 3.2 Conectar y subir el código

Ejecuta estos comandos en tu terminal, **dentro de la carpeta del proyecto**:

```bash
# El repositorio ya fue inicializado con git init
# Solo necesitas agregar el remote y hacer push:

git remote add origin https://github.com/TU_USUARIO/mundial2026.git
git branch -M main
git push -u origin main
```

> Reemplaza `TU_USUARIO` con tu nombre de usuario en GitHub.

### 3.3 Activar GitHub Pages

1. Ve a tu repositorio en GitHub.
2. Abre **Settings → Pages**.
3. En **Source**, selecciona **Deploy from a branch**.
4. Branch: **main**, carpeta: **/ (root)**.
5. Haz clic en **Save**.

En ~1 minuto tu app estará disponible en:
```
https://TU_USUARIO.github.io/mundial2026/
```

---

## 4. Deploy en Netlify (alternativa)

Netlify es más rápido para actualizaciones y ofrece HTTPS automático.

### Opción A — Arrastrar y soltar (sin cuenta GitHub)

1. Ve a [app.netlify.com/drop](https://app.netlify.com/drop).
2. Arrastra la carpeta **completa** del proyecto al área indicada.
3. Netlify genera una URL automáticamente (ej. `https://amazing-knuth-123.netlify.app`).

### Opción B — Conectar con GitHub (despliegue continuo)

1. Ve a [app.netlify.com](https://app.netlify.com) y crea una cuenta.
2. Clic en **Add new site → Import an existing project**.
3. Elige **GitHub** y selecciona el repositorio `mundial2026`.
4. Configuración de build:
   - **Build command:** *(dejar vacío)*
   - **Publish directory:** `.` *(punto — raíz del proyecto)*
5. Clic en **Deploy site**.

Cada `git push` a `main` actualizará el sitio automáticamente.

---

## 5. Uso de la app

1. **Abre** `index.html` en el navegador (o accede a la URL publicada).
2. **Ingresa tu nombre** en la parte superior y haz clic en **Entrar**.
3. En el **Bracket**, haz clic en cualquier partido para predecir el ganador.
4. Consulta **Mis Predicciones** para ver tu historial.
5. El **Ranking** muestra todos los participantes ordenados por aciertos.

---

## 6. Funcionamiento sin Supabase

Si `SUPABASE_URL` y `SUPABASE_ANON_KEY` están vacíos en `config.js`:

- Las predicciones se guardan en **localStorage** del navegador.
- El ranking solo muestra usuarios del mismo navegador/dispositivo.
- Todo lo demás funciona igual.

Para compartir predicciones con amigos sin Supabase, todos deberían acceder desde el **mismo dispositivo y navegador** (no recomendado para grupos grandes).
