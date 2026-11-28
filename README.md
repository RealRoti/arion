# Arion

Una semplice progressive Web App (PWA) open-core white-label per la gestione di repertorio, spartiti, scalette, calendario musicale ed esecuzioni dal vivo sincronizzate per band, cori, ensemble musicali...

## Principi chiave

- Qesto repository contiene esclusivamente il **framework generico** e riutilizzabile. Nome del gruppo, logo, utenti, catalogo strumenti e repertorio vivono esclusivamente nel database e nello storage privato della singola istanza.
- La logica musicale e di dominio pura (`src/domain/`) è separata dai layer di servizio (`src/services/`) e dai moduli UI (`src/features/`). Il backend si appoggia a primitive standard PostgreSQL + Auth + Storage + Realtime tramite `@supabase/supabase-js`: è possibile partire su Supabase Free e migrare in futuro verso un'istanza **Supabase Self-Hosted** via Docker Compose senza riscrivere l'applicazione.
- La PWA è **cross-platform** (iPadOS, iOS, Android, Desktop) ed ottimizzata per ogni ambiente, essendo costruita con React 19, TypeScript, Tailwind CSS v4 e `vite-plugin-pwa`, utilizza font di sistema offline senza dipendenze da CDN esterni e renderizza i PDF su `<canvas>` tramite `PDF.js` (evitando `<iframe>` o `<embed>` problematici su iOS/iPadOS).
- **Zero tracciamento e interfaccia in italiano:** nessuna pubblicità, nessun cookie di profilazione né analytics di terze parti; tutte le stringhe dell'interfaccia utente sono centralizzate in `src/i18n/it.ts`.

## Features

1. **Gestione Admin e Maestro (`admin` / `conductor`):** l'Admin gestisce identità white-label (nome, sottotitolo, logo, email supporto), whitelist inviti, ruoli e catalogo strumenti/voci; il Maestro (e l'Admin) gestisce repertorio, allegati PDF, scalette (con riordino, duplicazione e override di tonalità), calendario e sessioni Live.
2. **Profilo multi-strumento e vista personalizzata 1-tap:** a ogni utente possono essere assegnati più strumenti o voci (`Soprano`, `Chitarra`, `Organo`, `Clarinetto in Sib`, ecc.) con cambio rapido 1-tap che adatta subito vista predefinita (`Solo Testo`, `Testo + Accordi`, `Spartito PDF`), trasposizione strumentale e partitura associata.
3. **Editor ChordPro, traspositore e importatore universale:** editor con anteprima live, parser/traspositore ITA/ENG sul circolo delle quinte (con capotasto locale per singolo brano) e wizard client-side per convertire in ChordPro testi incollati, `.docx`, `.pdf` (anche a 2 colonne), MusicXML (`.musicxml`/`.mxl`) e PDF scansionati o immagini tramite OCR nel browser.
4. **Leggio digitale unificato con Screen Wake Lock:** switch immediato tra `Solo Testo`, `Testo + Accordi` e `Spartito PDF` (`PDF.js` su `<canvas>` con schermo intero), layout a 2 colonne su tablet, scala font (`A-`/`A+`), capotasto e mantenimento dello schermo attivo durante l'esecuzione.
5. **Supporto nativo ai pedali Bluetooth:** navigazione tra pagine PDF e brani in scaletta tramite i comandi standard dei pedali gira-pagina (`Arrow*`, `PageUp`/`PageDown`, `Space`).
6. **Modalità notturna su UI e spartiti PDF:** tre temi ad alto contrasto (**Chiaro**, **Palco Notturno**, **Nero OLED**) con toggle rapido sul leggio e modalità **Night Score** sui PDF.
7. **Calendario musicale e scalette:** pianificazione di prove, esibizioni e servizi con vista _Prossimi_ e _Mese_, collegamento diretto alle scalette e lettura autonoma in sequenza.
8. **Modalità Live con Realtime Sync:** sincronizzazione in tempo reale di brano attivo, tonalità Live, sezione ChordPro o pagina PDF, lancio di brani fuori scaletta, banner _"Prossimo brano"_, segnali lampo flottanti, lista presenza dei dispositivi e sgancio/riaggancio autonomo (`Torna al Live`).

## Deploy di un'istanza

Per attivare una nuova istanza privata per il proprio coro o gruppo musicale servono due componenti: un progetto **Supabase** (backend) e un hosting statico HTTPS per la **PWA** (es. Vercel, Cloudflare Pages o Netlify).

### 1. Configurare il backend Supabase

1. Crea un nuovo progetto su [Supabase](https://supabase.com/) (il piano Free è sufficiente per iniziare).
2. Applica in ordine cronologico tutte le migrazioni SQL presenti in `supabase/migrations/`:
   - **Con Supabase CLI** (installata nelle dipendenze di sviluppo):

     ```bash
     npm install
     npx supabase login
     npx supabase link --project-ref <PROJECT_REF>
     npm run db:push:remote
     ```

   - **Oppure manualmente** dal Dashboard Supabase → **SQL Editor**, eseguendo in sequenza tutti i file `.sql` in `supabase/migrations/` (dal `20261125000100_*` fino all'ultima migrazione).
   - _Nota:_ **non** eseguire `supabase/seed.sql` sull'istanza reale, perché contiene solo account e brani dimostrativi per lo sviluppo locale.

3. Configura **Authentication** nel Dashboard Supabase:
   - **Sign In / Providers → Email:** mantieni attivo il provider Email e gli OTP a **6 cifre** (durata consigliata `600` secondi). Lascia abilitata la creazione di nuovi utenti da signup/OTP: il trigger `on_auth_user_check_allowed_email` su `auth.users` blocca automaticamente qualsiasi email che non sia attiva in `public.allowed_emails`, consentendo l'accesso al primo login solo agli utenti invitati.
   - **URL Configuration:** imposta **Site URL** sull'URL pubblico della tua PWA (es. `https://<tuo-dominio>`) e aggiungi `https://<tuo-dominio>/**` nelle **Redirect URLs**.
   - **Email Templates → Magic Link:** sostituisci il template con il contenuto di [`supabase/templates/magic_link.html`](supabase/templates/magic_link.html) (mostra sia il **codice a 6 cifre** per la PWA su iPad/iPhone sia il pulsante **Magic Link**) e imposta come oggetto ad esempio `Accedi ad Arion - Codice di accesso`.
   - _(Consigliato per uso continuativo)_: il mailer integrato del piano gratuito Supabase ha un limite orario molto basso; per evitare blocchi durante gli accessi simultanei alle prove è consigliato configurare un **Custom SMTP** nelle impostazioni Auth di Supabase.

### 2. Creare il primo Amministratore (Bootstrap)

Poiché l'accesso è **invite-only** e all'avvio la tabella `public.allowed_emails` è vuota, inserisci la prima email amministratore dal **SQL Editor** di Supabase:

```sql
insert into public.allowed_emails (email, role, display_name, is_active)
values ('admin@esempio.org', 'admin', 'Amministratore', true);
```

Al primo accesso con quell'email verrà creato automaticamente il profilo `admin` in `public.profiles`. Tutti gli inviti successivi e la personalizzazione del gruppo si gestiranno direttamente dall'app in **Altro → Amministrazione**.

### 3. Build e Deploy del frontend PWA

Recupera da Supabase (**Project Settings → API**) l'URL del progetto e la chiave pubblica `anon`:

- `VITE_SUPABASE_URL` — es. `https://<project-ref>.supabase.co`
- `VITE_SUPABASE_ANON_KEY` — chiave pubblica `anon` del progetto
- `VITE_SUPPORT_EMAIL` _(opzionale)_ — email di fallback per la pagina di assistenza tecnica (configurabile anche dal pannello Admin in-app)

#### Deploy su Vercel, Cloudflare Pages o Netlify

1. Collega il repository GitHub al servizio di hosting scelto.
2. Imposta:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Environment Variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (e opzionalmente `VITE_SUPPORT_EMAIL`).
3. Il routing SPA client-side è già configurato in `vercel.json` (Vercel) e `public/_redirects` (Cloudflare Pages / Netlify).
4. Verifica che l'istanza sia servita in **HTTPS** (automatico su Vercel, Cloudflare Pages e Netlify): è obbligatorio per installare la PWA, attivare il Service Worker e usare lo Screen Wake Lock.

#### Deploy su hosting statico generico / self-hosted

```bash
cp .env.example .env.local
# Compila .env.local con VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run build
```

Pubblica il contenuto della cartella `dist/` dietro un web server HTTPS configurando il fallback di tutte le rotte su `/index.html`.

### 4. Prima configurazione dell'istanza e installazione sui dispositivi

1. Apri l'URL dell'istanza deployata ed effettua il login con l'email amministratore inserita al passo 2.
2. Vai in **Altro → Amministrazione**:
   - **Identità istanza:** imposta nome del coro, sottotitolo, eventuale email di supporto, tema/notazione di default e carica il logo personalizzato.
   - **Catalogo strumenti e voci:** abilita o disabilita gli strumenti dell'organico o aggiungine di nuovi.
   - **Utenti e inviti:** aggiungi le email di maestri, coristi e strumentisti assegnando ruolo e strumenti iniziali.
3. **Installazione sui leggii:**
   - **iPad / iPhone (Safari):** apri l'URL → tocca **Condividi** → **Aggiungi alla schermata Home**. Al login usa il **codice a 6 cifre** direttamente dentro l'app installata.
   - **Android / Desktop (Chrome/Edge):** usa la voce **Installa app** dal menu del browser.

## Sviluppo locale e verifiche

Prerequisiti per lo sviluppo completo con database e test RLS: **Node.js**, **Docker** (Docker Desktop / OrbStack / Colima) e **Supabase CLI**.

```bash
cp .env.example .env.local
npm install
npm run db:start        # Avvia Postgres, Auth, Storage, Realtime e Mailpit (http://127.0.0.1:54324)
npm run db:reset        # Applica migrazioni e carica dati demo da supabase/seed.sql
npm run dev             # Avvia il server Vite su http://127.0.0.1:5173
```

Nel file `.env.local` imposta `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` mostrati da `npx supabase status`. Gli utenti demo precaricati in locale da `supabase/seed.sql` sono `admin@arion.local`, `maestro@arion.local` e `musicista@arion.local` (i codici OTP e i Magic Link vengono intercettati localmente su Mailpit alla porta `54324`).

### Comandi principali

```bash
npm run lint          # ESLint su codice e test
npm run typecheck     # Controllo TypeScript strict
npm run test          # Unit e component test (Vitest)
npm run test:rls      # Suite sicurezza PostgreSQL RLS e Auth OTP (richiede Supabase locale avviato)
npm run build         # Verifica compilazione e bundle produzione in dist/
npm run format:check  # Controllo formattazione Prettier
```
