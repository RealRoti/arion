# Piano di Sviluppo — Fase 1 (MVP Solido per Prove e Live)

Ogni milestone di questa fase è progettata come blocco autonomo, verificabile e associato a un commit pulito su GitHub. **Nessuna milestone viene considerata completata finché i rispettivi controlli automatici e manuali non passano.**

---

## Milestone 1.0 — Bootstrap Repository & Design System Base

- **Obiettivo:** inizializzare il repository GitHub-ready del framework Arion con toolchain rigorosa, struttura directory, centralizzazione i18n, logo SVG e token visivi.
- **Deliverable:**
  - `git init`, `.gitignore` rigoroso (esclude `.env*` eccetto `.env.example`, `dist/`, `node_modules/`, artefatti locali), `.env.example`.
  - Progetto Vite + React + TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`), Tailwind CSS, ESLint, Prettier, Vitest.
  - Struttura cartelle (`src/domain/`, `src/services/`, `src/features/`, `src/components/`, `src/i18n/it.ts`).
  - `src/components/ArionLogo.tsx` (delfino stilizzato SVG), `src/components/AppShell.tsx` (navbar inferiore a 5 tab con `Live` centrale + sidebar desktop) e `src/index.css` con i 3 temi realistici (`daylight`, `stage_dark`, `oled_black`).
  - Schermate base navigabili (`Home`, `Repertorio` + `Leggio`, `Live`, `Calendario`, `Altro` con sottopagine `Scalette`, `Guida`, `Profilo e preferenze`, `Amministrazione`, `Assistenza`, `Privacy`, `Informazioni sull'app`) con zero stringhe hardcoded.
- **Verifica:** `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` verdi; `git status` privo di file sensibili.
- **Commit suggerito:** `chore: bootstrap Arion React TypeScript PWA workspace and design tokens`

---

## Milestone 1.1 — Database Schema, RLS, Storage Policies & RBAC Core

> **Prerequisito locale prima di iniziare:** Docker e Supabase CLI installati e funzionanti (`supabase start`).

- **Obiettivo:** costruire fondamenta sicure lato database e lato dominio prima di scrivere qualsiasi schermata.
- **Deliverable:**
  - `supabase/config.toml` e template email italiano in `supabase/templates/` (Magic Link + Codice OTP a 6 cifre).
  - Migrazioni SQL in `supabase/migrations/`:
    - tabelle `instance_settings`, `allowed_emails`, `profiles`, `instruments`, `user_instruments`, `user_song_preferences`, `songs`, `song_assets`, `setlists`, `setlist_items`, `calendar_events`, `live_sessions`;
    - trigger whitelist signup su `allowed_emails`, provisioning `profiles`, blocco anti-auto-promozione e guardia anti-lockout ultimo admin;
    - policy RLS su tutte le tabelle e sui bucket Storage `song-assets` e `instance-branding`.
  - `supabase/seed.sql` con strumenti standard (voci e strumenti di base, solo dati generici), utenti demo `@arion.local` e 2 brani di esempio di pubblico dominio.
  - `src/domain/rbac/permissions.ts` (`Permission`, `Role`, `ROLE_PERMISSIONS`, `can()`).
  - `src/domain/rbac/permissions.test.ts` e suite `tests/rls/` con test positivi e negativi per `anon`, `musician`, `conductor`, `admin`.
- **Verifica:** `supabase db reset` pulito, `npm run test`, `npm run test:rls`, `npm run typecheck`, `npm run lint`.
- **Commit suggerito:** `feat: add PostgreSQL schema, RLS policies, RBAC domain and RLS test suite`

---

## Milestone 1.2 — Autenticazione Invite-Only & Pannello Admin (Istanza e Utenti)

- **Obiettivo:** consentire l'accesso sicuro (anche in PWA standalone su iPad/iPhone) e la gestione completa di istanza white-label, inviti e ruoli.
- **Deliverable:**
  - `src/services/authService.ts`, `instanceService.ts`, `usersService.ts`.
  - `src/features/auth/`: pagina di accesso con inserimento email → invio Magic Link + schermata inserimento **codice OTP a 6 cifre** (con gestione errori chiari per email non autorizzate).
  - `src/components/RequirePermission.tsx` e `AppShell.tsx` con navigazione adattiva in base ai permessi dell'utente.
  - `src/features/admin/`:
    - configurazione white-label (`group_name`, `group_subtitle`, upload logo su `instance-branding`, default notazione e tema);
    - gestione utenti e inviti (`allowed_emails`: aggiunta email, ruolo iniziale, strumenti iniziali, revoca/riattivazione; lista `profiles`: cambio ruolo, attivazione/disattivazione con protezione ultimo admin).
- **Verifica:** unit/component test su flusso OTP e controlli `RequirePermission`; verifica manuale multi-utente con Mailpit locale (invito → login OTP → modifica nome istanza → verifica blocco utente non autorizzato).
- **Commit suggerito:** `feat: implement invite-only OTP auth and admin white-label/user management`

---

## Milestone 1.3 — Catalogo Dinamico Strumenti & Profilo Musicale Utente

- **Obiettivo:** rendere gestibile l'organico (abilita/disabilita e aggiunta strumenti) e permettere a ogni musicista/corista di selezionare in un tap cosa sta suonando o cantando.
- **Deliverable:**
  - `src/services/instrumentsService.ts`.
  - Sezione catalogo strumenti nel pannello Admin: creazione, modifica, riordino, toggle `is_enabled`, configurazione `category` (`voice` | `instrument`), `default_view`, `transposition_semitones`, `supports_capo`.
  - `src/features/profile/`: gestione nome visualizzato, lista strumenti/voci associati con predefinito, notazione preferita (`italian` / `english`), tema preferito e dimensione testo.
  - Selettore rapido **Strumento attivo** nella barra superiore di `AppShell`.
- **Verifica:** test unitari e componenti sul selettore strumento e aggiornamento preferenze; verifica manuale: creazione nuovo strumento dall'Admin → associazione a utente → cambio strumento attivo 1-tap.
- **Commit suggerito:** `feat: add dynamic instruments catalog and musical profile switcher`

---

## Milestone 1.4 — Motore Musicale ChordPro, Traspositore ITA/ENG & Importatore

- **Obiettivo:** costruire e testare al 100% il cuore musicale puro dell'applicazione prima di collegarlo alla UI del repertorio.
- **Deliverable:**
  - `src/domain/chords/parser.ts`: riconoscimento accordi italiani (`Do Re Mi Fa Sol La Si`), anglosassoni (`C D E F G A B`), varianti miste dal web (`Mi-`, `Sol7+`, `Sib`, `Fa#m7`, `Re4`, `Sol/Si`, ecc.).
  - `src/domain/chords/transposer.ts`: trasposizione precisa, circolo delle quinte per enarmonia corretta (`Sib` vs `La#`), calcolo combinato tonalità brano + `transposition_semitones` strumento − `capo_frets`.
  - `src/domain/chords/chordpro.ts`: parser strutturale di sezioni (`{sov}`, `{soc}`, `{sob}`, `{c:...}`), estrazione modalità Solo Testo senza spazi rotti.
  - `src/domain/chords/importer.ts`: conversione euristica "accordi sulla riga sopra → ChordPro inline" + helper estrazione `.docx` (`mammoth`).
  - Suite completa di test unitari su decine di casi reali e misti (ITA, ENG, slash chords, bemolli/diesis, capotasto, strumenti in Sib/Mib).
- **Verifica:** `npm run test` con copertura completa di parser, traspositore, ChordPro e importer; `npm run typecheck`, `npm run lint`.
- **Commit suggerito:** `feat: add Italian/English chord parser, transposer, ChordPro and docx importer`

---

## Milestone 1.5 — Repertorio, Editor Brani & Leggio Unificato (ChordPro + PDF.js)

- **Obiettivo:** rendere completamente utilizzabile l'archivio brani sia per chi gestisce il repertorio sia per chi legge e studia sul leggio.
- **Deliverable:**
  - `src/services/songsService.ts` e `src/services/storageService.ts`.
  - `src/features/repertoire/`:
    - lista brani ricercabile (titolo, testo, autore) e filtrabile per tag/tonalità/presenza PDF;
    - editor brano (metadati + editor ChordPro + anteprima live affiancata + wizard import da `.docx`/testo incollato);
    - gestione allegati PDF (`song_assets`): upload, titolo parte, associazione a strumenti/voci, eliminazione.
  - `src/features/reader/`:
    - vista automatica coerente con lo strumento attivo (`Solo Testo` di default per voci, `Testo + Accordi` o `PDF` per strumenti), con switch rapido in testata;
    - controllo capotasto locale per brano (salvato su `user_song_preferences`), controllo scala font, layout 2 colonne su iPad landscape;
    - viewer `PDF.js` su `<canvas>` con zoom, navigazione touch ai bordi, modalita `Night Score`;
    - Screen Wake Lock e supporto tasti pedale Bluetooth (`Arrow*`, `PageUp`/`PageDown`).
- **Verifica:** test unitari/componente su viewer e switch viste; verifica manuale: import testo da `.docx`, upload PDF per strumento specifico, lettura da utente Voce (solo testo + toggle accordi) vs Chitarrista (accordi + capo) vs Organista (PDF).
- **Commit suggerito:** `feat: implement repertoire CRUD, docx import wizard and ChordPro/PDF.js reader`

---

## Milestone 1.6 — Scalette (Setlist), Calendario Musicale & Studio Autonomo

- **Obiettivo:** permettere al Maestro di preparare scalette ordinate con tonalità dedicate, pianificare prove ed esibizioni nel calendario musicale e consentire a tutti di sfogliare le scalette in sequenza.
- **Deliverable:**
  - `src/services/setlistsService.ts` e `src/services/calendarService.ts`.
  - `src/features/setlists/`:
    - elenco, creazione, modifica, duplicazione ed eliminazione scalette;
    - aggiunta brani, riordino con drag-and-drop e pulsanti touch `Su`/`Giù`, impostazione `override_key` e note per singolo item;
    - vista esecuzione autonoma della scaletta (scorrimento sequenziale brano precedente/successivo con pedale o tap e indicazione del brano successivo).
  - `src/features/calendar/`:
    - creazione/modifica/eliminazione eventi (`rehearsal`, `concert`, `service`, `other`) con collegamento diretto a una scaletta, filtri per categoria, vista `Prossimi` e vista `Mese`.
- **Verifica:** test su servizio e UI riordino/override tonalità; `npm run lint && npm run typecheck && npm run test && npm run build`.
- **Commit suggerito:** `feat: add setlists management, reordering, key overrides and standalone reader`

---

## Milestone 1.7 — Modalità Live v1 (Realtime Sync, Presenza & Segnali)

- **Obiettivo:** completare l'esperienza dal vivo sincronizzata tra Maestro e musicisti/coristi.
- **Deliverable:**
  - `src/services/liveService.ts` (persistenza `live_sessions` + canale Realtime Broadcast e Presence).
  - `src/features/live/`:
    - avvio sessione Live da scaletta o brano singolo;
    - console Maestro: avanzamento scaletta, lancio brano al volo fuori scaletta (con ritorno alla scaletta), trasposizione tonalità live, invio banner **"Prossimo brano"** (con tonalità prevista), click su sezione ChordPro o pagina PDF per sincronizzare tutti, pannello **Segnali lampo** (preset + testo rapido), indicatore **Presenza** dispositivi/strumenti/stato, azione **"Prendi il controllo"** per subentro tra Maestri/Admin;
    - vista Musicista/Corista: ricezione immediata con vista e capotasto propri, banner "Prossimo brano", toast segnalazione Maestro, rilevamento automatico scorrimento/cambio brano locale con badge e pulsante **"Torna al Live"**.
- **Verifica:** test unitari sulla state machine Live (sgancio/riaggancio, brano fuori scaletta, takeover); verifica manuale in due finestre parallele (Maestro + Musicista).
- **Commit suggerito:** `feat: implement Live mode v1 with Realtime sync, presence and conductor cues`

---

## Milestone 1.8 — PWA Completa, Cache Offline IndexedDB & Collaudo E2E

- **Obiettivo:** blindare l'affidabilità su tablet/smartphone in assenza o calo di rete e verificare l'intero flusso con test automatici end-to-end.
- **Deliverable:**
  - `src/services/offlineDb.ts` (Dexie IndexedDB per brani, scalette e Blob PDF) + servizio di sincronizzazione e pulizia cache.
  - Pulsante **"Prepara scaletta offline"** con barra di avanzamento e badge stato cache; fallback automatico su cache locale quando la rete cade; indicatore stato connessione in `AppShell`.
  - Configurazione completa `vite-plugin-pwa` (manifest, icone Arion, worker `PDF.js` precached, banner aggiornamento nuova versione, guida installazione Safari iOS).
  - Suite **Playwright E2E (`tests/e2e/`)** multi-utente su Supabase locale: login Maestro + login Musicista → preparazione scaletta → avvio Live → cambio brano, tonalità, sezione, banner prossimo, segnale lampo, sgancio/riaggancio → verifica stato offline.
- **Verifica finale Fase 1:** `npm run lint && npm run typecheck && npm run test && npm run test:rls && npm run test:e2e && npm run build`.
- **Commit suggerito:** `feat: add full PWA offline cache with Dexie and multi-user Playwright E2E suite`
