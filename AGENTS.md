# AGENTS.md — Contratto Ingegneristico di Arion

Questo documento è la fonte di verità operativa per chiunque (sviluppatore umano o agente AI) contribuisca al repository **Arion**. Ogni modifica al codice o all'infrastruttura deve rispettare le regole descritte qui sotto.

---

## 1. Identità del progetto

- **Nome:** **Arion**
- **Sottotitolo / Acronimo (italiano):** _Armonia e Ritmo In Ogni Nota_
- **Acronimo tecnico (inglese):** _Automatic Real-time Instrument and Orchestra Notation_
- **Icona / Logo:** delfino stilizzato e moderno integrato con il mondo musicale (SVG proprietario del framework).
- **Natura del progetto:** Web App / **PWA** (Progressive Web App) installabile su iPad/tablet, smartphone iOS/Android e desktop, progettata come **framework open-core white-label** per gestire repertorio, spartiti, scalette ed esecuzioni dal vivo di cori ed ensemble musicali.

---

## 2. Regola assoluta di Privacy & White-Label

Questo repository GitHub contiene **esclusivamente il framework generico e riutilizzabile**. Ogni singolo gruppo musicale che installa Arion lo personalizza a runtime tramite database e variabili d'ambiente locali.

**Divieti inderogabili (zero eccezioni):**

1. **Mai** inserire nel codice sorgente, nella documentazione, nei file di test, nei seed SQL o nei messaggi di commit nomi reali di cori, parrocchie, associazioni, località, indirizzi email personali o URL di istanze private.
2. **Mai** committare spartiti reali coperti da copyright o materiali privati di un gruppo specifico: i brani e gli allegati di esempio per test e sviluppo devono essere esclusivamente brani fittizi di pubblico dominio o placeholder neutrali.
3. **Mai** committare file di configurazione locale o segreti (`.env`, `.env.local`, `.env.*.local`, `supabase/.env`, `supabase/.env.local`).
4. Nei test, negli esempi e in `supabase/seed.sql` utilizzare **solo** segnaposto generici come `"Il Mio Coro"`, `"Coro Demo"`, `admin@arion.local`, `maestro@arion.local`, `musicista@arion.local`.
5. Ogni personalizzazione dell'istanza reale (nome del coro, sottotitolo, logo personalizzato, catalogo strumenti abilitati, utenti autorizzati) vive esclusivamente nel database (`instance_settings`, `allowed_emails`, `instruments`) e nello Storage privato dell'istanza stessa.

---

## 3. Metodo Documentation-First & Approccio Incrementale

1. **Leggere prima di agire:** prima di implementare qualsiasi funzionalità, leggere `AGENTS.md`, `docs/SPECIFICHE.md`, `docs/STRUTTURA-APP.md` e il piano della fase corrente (`docs/fasi/fase-N.md`).
2. **Piano prima del codice:** non avviare sviluppi non coperti dai documenti di fase; eventuali variazioni architetturali vanno prima discusse, approvate e riflesse nella documentazione.
3. **Sviluppo per milestone atomiche:** procedere un blocco logico alla volta, verificando test e build al termine di ogni milestone prima di passare alla successiva.
4. **Allineamento continuo:** ogni modifica a schema DB, permessi, struttura directory o flussi critici deve mantenere sincronizzati `docs/SPECIFICHE.md` e `docs/STRUTTURA-APP.md`.

---

## 4. Convenzioni linguistiche

- **Interfaccia utente (100% Italiano):**
  - Ogni testo visibile all'utente (etichette, pulsanti, titoli, messaggi di errore, notifiche toast, placeholder, email template, guida installazione PWA) deve essere in italiano naturale e coerente.
  - **Zero stringhe UI hardcoded** nei componenti React o nei servizi: tutte le stringhe vanno centralizzate in `src/i18n/it.ts` (organizzate per sezione logica).
- **Codice e infrastruttura (100% Inglese):**
  - Nomi di file, directory, variabili, funzioni, tipi TypeScript, interfacce, permessi RBAC, tabelle e colonne SQL, bucket Storage, commenti tecnici, docstring e messaggi di commit devono essere in inglese.

---

## 5. Sicurezza & RBAC

La sicurezza non è un dettaglio di presentazione: **l'autorizzazione effettiva vive nel backend (PostgreSQL RLS e Storage Policies)**, mai soltanto nella UI.

1. **RLS obbligatoria (Default-Deny):** ogni tabella nello schema `public` e ogni bucket su Storage deve avere Row Level Security abilitata e policy esplicite per `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
2. **Accesso Invite-Only:** la registrazione pubblica aperta è disabilitata. L'accesso è consentito solo alle email presenti in `allowed_emails`.
3. **Divieto di auto-promozione:** un utente non può mai modificare il proprio campo `role` o `is_active` su `profiles`, né inserire o modificare record in `allowed_emails` senza permesso amministrativo verificato lato DB.
4. **Protezione anti-lockout:** le policy o i trigger lato DB devono impedire la rimozione o la retrocessione dell'ultimo utente `admin` attivo.
5. **Controllo permessi centralizzato nel codice:**
   - È vietato scrivere controlli sparsi basati su nomi di ruolo hardcoded (es. `if (user.role === 'conductor')`).
   - Usare sempre l'helper centralizzato `can(permissions, permission)` (e wrapper UI equivalenti come `<RequirePermission>`), derivato da `ROLE_PERMISSIONS` in `src/domain/rbac/`.
   - `ROLE_PERMISSIONS` sul frontend deve rispecchiare fedelmente le policy RLS sul backend.
6. **Test RLS automatici obbligatori:** ogni nuova tabella, colonna sensibile o modifica a una policy SQL deve essere accompagnata da test automatici positivi (accesso consentito a chi ha il permesso) e negativi (accesso negato a chi non ce l'ha o tenta escalation) in `tests/rls/`.

---

## 6. Qualità del codice & Disaccoppiamento

1. **TypeScript rigoroso:** `tsconfig` con `"strict": true` e `"noUncheckedIndexedAccess": true`. È vietato introdurre `any` ingiustificati o disabilitare regole ESLint senza commento motivato.
2. **Architettura a strati e disaccoppiamento backend (Self-Hosting Ready):**
   - `src/domain/`: logica di dominio pura e priva di dipendenze da React o Supabase (es. RBAC, parser/traspositore ChordPro, calcoli offline). Facilmente testabile con Vitest.
   - `src/services/`: interfacce e adapter verso backend, auth, storage e realtime (`@supabase/supabase-js`, `Dexie`). I componenti UI non devono mai importare direttamente il client Supabase grezzo per query di business: passano sempre dai servizi, così da facilitare test, refactoring e futura migrazione self-hosted.
   - `src/features/`: moduli funzionali UI per dominio (`auth`, `admin`, `profile`, `repertoire`, `reader`, `setlists`, `live`, `offline`).
3. **Resilienza PWA su iPad/iOS:**
   - I PDF vanno renderizzati esclusivamente tramite `PDF.js` su `<canvas>` (mai `<iframe>` o `<embed>` nativi).
   - Il login supporta sia Magic Link sia **codice OTP a 6 cifre** inserito in-app per evitare la perdita di sessione nelle PWA standalone su iOS/iPadOS.
4. **Verifiche obbligatorie prima di ogni commit:**
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test`
   - `npm run build`
   - `npm run test:rls` (obbligatorio ogni volta che si creano o modificano file in `supabase/migrations/`)

---

## 7. Workflow Git & Repository

1. **Storia pulita e reversibile:** usare commit atomici per ogni milestone o fix logico, seguendo **Conventional Commits** in inglese:
   - `docs:` documentazione e specifiche
   - `feat:` nuova funzionalità
   - `fix:` correzione bug
   - `refactor:` ristrutturazione senza cambio funzionale
   - `test:` aggiunta o aggiornamento test (unit, RLS, E2E)
   - `chore:` configurazione, dipendenze, tooling
2. **Controllo pre-commit anti-leak:** prima di eseguire `git add` e `git commit`, verificare sempre `git status` e `git diff --staged` per accertarsi che:
   - non siano presenti file `.env*` locali (eccetto `.env.example`);
   - non sia presente alcun dato privato di cori reali, email personali o chiavi API.
3. **Ripristino sicuro:** ogni milestone completata e verificata corrisponde a un commit (o tag) funzionante, così da poter tornare indietro con `git revert` o `git reset` in qualsiasi momento senza rompere la build.
