# Deploying Madarek on Dokploy

Target: `https://madarek.wlidmohamed.co`, built from `https://github.com/lolotam/Madarek` (branch `main`) with the repository `Dockerfile`.

## What the image is

- Next.js standalone server on Node 24 (`node server.js`, port **3000**), running as the non-root `node` user.
- All state lives in **`/app/.data`**: the SQLite database (`learning.sqlite`) and generated audio (`audio/`). **Mount a persistent volume there**, or every redeploy starts empty.
- The admin and audio command-line tools are in the image (`scripts/`), so they can run from the container terminal.
- A Docker `HEALTHCHECK` calls `GET /api/session`.
- Run **one replica only**. SQLite on a volume doesn't support several containers writing at once.

## 1. DNS

Create an **A record** `madarek` → your Dokploy server's public IP in the `wlidmohamed.co` DNS zone. If the zone is on Cloudflare, either use "DNS only" (grey cloud) so Let's Encrypt can issue the certificate, or keep it proxied with SSL mode **Full (strict)** after the certificate exists.

## 2. Create the application

In Dokploy: **Projects → Create Project** (e.g. `madarek`) → **Create Service → Application**.

**General → Provider**:

- GitHub (with the Dokploy GitHub App connected to `lolotam`), repository `Madarek`, branch `main`. Or the Git provider with `https://github.com/lolotam/Madarek.git`, branch `main`; the repo is public.
- **Build Type: Dockerfile**, Dockerfile path `Dockerfile`, context `.`.

## 3. Environment

**Environment** tab:

```env
APP_ORIGIN=https://madarek.wlidmohamed.co
SETTINGS_ENCRYPTION_KEY=<paste a new random value>
```

Generate the key once on any machine with Node and keep it somewhere safe. Changing it later makes the API key saved in the admin dashboard unreadable.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Use a **new** value for production; don't reuse the local `.env.local` one.

Optional. You can instead set these later in `/admin` → إعدادات الخدمات, which stores the key encrypted and takes precedence:

```env
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
ELEVENLABS_MAX_CHARACTERS=10000
```

Leave `DATABASE_PATH`, `AUDIO_LIBRARY_PATH`, `NARRATION_DIR`, `PORT` and `HOSTNAME` unset; the image already sets them.

## 4. Persistent volume

**Advanced → Mounts → Add Mount**:

- Type: **Volume** (named Docker volume), name e.g. `madarek-data`
- Mount path: **`/app/.data`**

Use a named volume, not a bind mount to a host folder. On first use a named volume inherits the image's `node` ownership. A host folder is owned by root, and the app can't write to it unless you `chown 1000:1000` it.

## 5. Domain

**Domains → Add Domain**:

- Host: `madarek.wlidmohamed.co`
- Path: `/`
- Container port: **3000**
- HTTPS: on, certificate: **Let's Encrypt**

## 6. Deploy

Press **Deploy** and follow the build log. The build runs `npm ci` and `next build` inside Docker; nothing needs to be built locally. When it's running:

- `https://madarek.wlidmohamed.co` shows the home page.
- `https://madarek.wlidmohamed.co/api/session` returns `{"user":null}`.

## 7. First admin account (production)

The production database starts empty; local accounts are **not** copied.

1. Open `https://madarek.wlidmohamed.co/login?mode=register`, register the admin email, and **remove the child row** before submitting.
2. In Dokploy open the application's **Terminal** (Docker container shell) and run:

   ```sh
   node scripts/create-admin.mjs dr.vet.waleedtam@gmail.com
   ```

3. Sign in again; `/admin` and `/admin/audio` are now available.

## 8. Audio narration (when ready)

From the container terminal, after setting the key, voice and character cap (in `/admin` or the Environment tab):

```sh
node scripts/audio.mjs plan
node scripts/audio.mjs generate
```

Then listen and approve each clip in `/admin/audio`. Generated audio is stored on the volume in `/app/.data/audio`.

## 9. Backups

Back up the `madarek-data` volume: both the database and the approved audio. Losing the audio means paying to regenerate it and reviewing it again. Dokploy's volume backups, or a scheduled `docker run --rm -v madarek-data:/data -v $PWD:/backup busybox tar czf /backup/madarek-data.tgz -C /data .`, both work. Copy SQLite while the app is idle, or use `sqlite3 .backup`, for a consistent snapshot.

## Updating

Push to `main` and redeploy, or enable **Autodeploy** in Dokploy. The volume keeps accounts, progress and audio across deploys. Schema changes migrate in place on startup.

## Before opening sign-up to the public

The README lists what isn't done yet for a public launch: a privacy policy and consent, data-deletion procedure, and password recovery by email. Sign-up is open and needs no email verification by design. Consider sharing the URL only with families you invite until those are in place.
