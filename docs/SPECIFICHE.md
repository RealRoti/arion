# SPECIFICHE FUNZIONALI E NON FUNZIONALI — Arion

> **Arion** — *Armonia e Ritmo In Ogni Nota* (*Automatic Real-time Instrument and Orchestra Notation*)

---

## 1. Visione, Identità e Modello White-Label

**Arion** è una Progressive Web App (PWA) pensata per accompagnare un coro e i suoi strumentisti dalle prove settimanali fino all'esecuzione dal vivo su leggio digitale (iPad, tablet Android, smartphone, laptop del maestro).

### Separazione Framework / Istanza (White-Label)
- **Repository pubblico (GitHub):** ospita esclusivamente il framework generico Arion (UI, dominio musicale, schema database, RLS, test), privo di qualsiasi riferimento a gruppi musicali reali.
- **Istanza del singolo coro:** ogni deployment configura la propria identità direttamente a runtime tramite la tabella `instance_settings` gestita dall'Admin:
  - `group_name`: nome del coro o ensemble mostrato in intestazione e schermata di accesso (default generico: `"Il Mio Coro"` / `"Arion"`).
  - `group_subtitle`: sottotitolo opzionale (es. motto o sezione).
  - `logo_url`: logo personalizzato opzionale caricato su Storage privato (in assenza, viene mostrato il logo ufficiale delfino di Arion).
  - `default_notation`: notazione di default dell'istanza (`italian` o `english`).
  - `default_theme`: tema di default (`stage_dark`, `oled_black`, `daylight`).

---

## 2. Contesto, Scalabilità e Utenti

- **Scala iniziale:** gruppo musicale ristretto (< 10 utenti: Admin/Maestro, coristi, strumentisti), archivio iniziale leggero (< 200 MB di PDF e spartiti).
- **Progettazione scalabile:**
  - Il catalogo strumenti e l'archivio brani non pongono limiti rigidi sul numero di utenti, voci, strumenti o brani.
  - Il layer `src/services/` astrae l'accesso a file e database, permettendo di iniziare a **0 €/mese** su Supabase Free (1 GB Storage, 500 MB Postgres) e di scalare in seguito verso un bucket esterno o verso un'istanza **self-hosted** su Docker senza riscrivere la UI.

---

## 3. Autenticazione, Ruoli e Permessi (RBAC)

### 3.1 Accesso Invite-Only (Magic Link + Codice OTP 6 cifre)
- La registrazione libera è **disabilitata**.
- L'Admin inserisce preventivamente l'email del membro nella whitelist `allowed_emails`, assegnandogli il ruolo operativo iniziale e gli eventuali strumenti/voci iniziali.
- **Flusso di login:**
  1. L'utente inserisce la propria email nella schermata di accesso.
  2. Il backend verifica la presenza in `allowed_emails` (stato attivo) e invia un'email in italiano contenente **sia** il pulsante **Magic Link** **sia** un **codice OTP a 6 cifre**.
  3. **Perché entrambi (cruciale per iOS/iPadOS):** quando un utente installa la PWA sulla schermata Home di iPad o iPhone e clicca un link dentro l'app Mail, iOS apre Safari invece della PWA standalone, isolando cookie e `localStorage`. Inserendo invece il **codice OTP a 6 cifre direttamente dentro la PWA**, la sessione resta autenticata dentro l'app installata senza intoppi. Su desktop o Android il Magic Link funziona comunque al volo.

### 3.2 Ruoli operativi
Ogni utente ha esattamente **un** ruolo operativo in `profiles.role`:
1. **`admin`** (Amministratore): gestisce configurazione white-label dell'istanza, utenti/inviti/ruoli, catalogo strumenti/voci e ha pieno accesso a repertorio, scalette e Live.
2. **`conductor`** (Maestro / Direttore): gestisce repertorio (creazione, modifica, eliminazione brani e allegati), crea e modifica scalette, avvia e dirige le sessioni Live (e può riprendere il controllo da un altro Maestro).
3. **`musician`** (Musicista / Corista): consulta il repertorio, visualizza e traspone brani secondo il proprio strumento/voce e capotasto personale, consulta le scalette in studio autonomo, partecipa alle sessioni Live.

### 3.3 Matrice dei Permessi (`can(permission)`)
Il codice applicativo non controlla **mai** `user.role === '...'`; verifica sempre i permessi granulari tramite `can(permissions, permission)`.

| Permesso | Descrizione | `admin` | `conductor` | `musician` |
|---|---|:---:|:---:|:---:|
| `instance:manage` | Modifica nome coro, logo e impostazioni globali | ✅ | ❌ | ❌ |
| `users:manage` | Gestione whitelist `allowed_emails`, ruoli e attivazione/disattivazione utenti | ✅ | ❌ | ❌ |
| `instruments:manage` | Creazione, modifica, riordino e abilita/disabilita strumenti e voci | ✅ | ❌ | ❌ |
| `songs:read` | Lettura brani del repertorio e download allegati | ✅ | ✅ | ✅ |
| `songs:create` | Inserimento nuovi brani e importazione da `.docx`/testo | ✅ | ✅ | ❌ |
| `songs:update` | Modifica metadati e contenuto ChordPro dei brani | ✅ | ✅ | ❌ |
| `songs:delete` | Eliminazione brani dal repertorio | ✅ | ✅ | ❌ |
| `assets:upload` | Caricamento allegati (PDF in Fase 1; MIDI/MusicXML in Fasi 2–3) | ✅ | ✅ | ❌ |
| `assets:delete` | Eliminazione allegati di un brano | ✅ | ✅ | ❌ |
| `setlists:read` | Consultazione scalette e lettura autonoma in sequenza | ✅ | ✅ | ✅ |
| `setlists:manage` | Creazione, modifica, ordinamento, duplicazione ed eliminazione scalette | ✅ | ✅ | ❌ |
| `live:host` | Avvio, conduzione, cambio brano/sezione/tonalità, segnali e chiusura Live | ✅ | ✅ | ❌ |
| `live:takeover` | Subentro nella conduzione di una sessione Live già attiva | ✅ | ✅ | ❌ |
| `live:join` | Partecipazione al Live, ricezione sync, sgancio/riaggancio locale | ✅ | ✅ | ✅ |
| `profile:manage_own` | Gestione propri strumenti/voci, notazione preferita, tema e capotasto | ✅ | ✅ | ✅ |

**Vincolo di sicurezza anti-lockout:** non è possibile disattivare né retrocedere l'ultimo utente `admin` attivo dell'istanza.

---

## 4. Catalogo Strumenti & Voci e Profilo Musicale

### 4.1 Catalogo dinamico e scalabile (`instruments`)
- L'Admin può **aggiungere**, **modificare**, **riordinare** e soprattutto **abilitare/disabilitare** (`is_enabled`) voci e strumenti in qualsiasi momento, così ogni coro vede solo il proprio organico reale e può espanderlo nel tempo.
- La disabilitazione nasconde lo strumento dai nuovi selettori senza distruggere associazioni storiche sui brani o sui profili.
- **Attributi di ogni voce/strumento:**
  - `name`: nome leggibile in italiano (es. `Soprano`, `Contralto`, `Tenore`, `Basso`, `Voce`, `Chitarra`, `Tastiera / Organo`, `Violino`, `Flauto`, `Clarinetto in Sib`, `Sax Contralto in Mib`).
  - `slug`: identificatore stabile (es. `soprano`, `guitar`, `organ`, `clarinet-bb`).
  - `category`: `voice` | `instrument`.
  - `default_view`: vista predefinita all'apertura di un brano (`lyrics_only`, `chords`, `pdf`).
    - Per tutte le voci (`category = 'voice'`), `default_view` è **`lyrics_only`** (solo testo pulito, con pulsante 1-tap per attivare gli accordi all'occorrenza).
  - `transposition_semitones`: spostamento in semitoni per strumenti traspositori (`0` per strumenti in Do/voci; `+2` per strumenti in Sib come Clarinetto/Tromba che leggono un tono sopra il suono reale; `-3` / `+9` per strumenti in Mib).
  - `supports_capo`: booleano (es. `true` per Chitarra/Ukulele) per abilitare il controllo capotasto rapido in leggio.
  - `is_enabled`: booleano per visibilità e selezione.
  - `sort_order`: ordine di visualizzazione.

### 4.2 Profilo musicale dell'utente
- Ogni utente può avere **uno o più strumenti/voci** associati (`user_instruments`), con uno marcato come predefinito (`is_primary`).
- Dalla barra superiore dell'app, tramite un **selettore rapido 1-tap**, l'utente sceglie con quale strumento/voce sta suonando o cantando in quel momento: cambiando strumento attivo, l'interfaccia aggiorna istantaneamente vista predefinita (`Solo Testo` / `Testo + Accordi` / `PDF`), trasposizione strumento e PDF preferito.
- Preferenze personali salvate su `profiles` / `user_song_preferences`:
  - `preferred_notation`: `italian` (`Do Re Mi Fa Sol La Si`) o `english` (`C D E F G A B`), applicata al volo su tutti gli accordi indipendentemente dalla notazione di inserimento;
  - `preferred_theme`: `stage_dark` | `oled_black` | `daylight`;
  - `font_scale`: scala testo regolabile sul leggio;
  - `capo_frets` per singolo brano (`user_song_preferences`): capotasto locale del musicista.

---

## 5. Repertorio, Formato ChordPro, Trasposizione e Allegati

### 5.1 Scheda Brano (`songs`)
Ogni brano comprende:
- `title` (obbligatorio), `subtitle` (opzionale, es. incipit o riferimento liturgico/raccolta);
- `author` (autore/compositore, opzionale);
- `original_key` (tonalità originale normalizzata, es. `Do`, `Lam`, `Fa#`, `Sib`);
- `tempo_bpm` (opzionale) e `time_signature` (es. `4/4`, `3/4`, `6/8`, opzionale);
- `tags` (array di etichette per filtraggio rapido, es. `Ingresso`, `Comunione`, `Natalizio`, `Veloce`);
- `chordpro_content` (testo strutturato con accordi inline in formato ChordPro);
- `conductor_notes` (note pubbliche visibili al gruppo, es. *"Intro solo organo 4 battute"*).

### 5.2 Formato canonico ChordPro e Sezioni
I testi con accordi vengono archiviati in formato **ChordPro** standard, leggibile e compatto:
- Accordi inline tra parentesi quadre prima della sillaba esatta: `[Sol]Ecco il [Re/Fa#]canto che [Mim]sale`.
- Direttive di struttura supportate:
  - `{title: ...}` / `{t: ...}`, `{key: ...}`
  - Sezioni con etichetta per navigazione e sync Live: `{start_of_verse: Strofa 1}` / `{sov: ...}` ... `{end_of_verse}` / `{eov}`, `{start_of_chorus: Ritornello}` / `{soc}` ... `{eoc}`, `{start_of_bridge: Ponte}` / `{sob}` ... `{eob}`, `{comment: ...}` / `{c: ...}`.
- In modalità **Solo Testo**, gli accordi vengono completamente rimossi e gli spazi/sillabe ricomposti in modo pulito senza buchi tipografici.

### 5.3 Motore di Parsing e Trasposizione (ITA + ENG)
Poiché i brani provengono da fonti eterogenee del web, il modulo `src/domain/chords/` deve riconoscere in ingresso convenzioni miste e normalizzarle in una rappresentazione interna indipendente dalla notazione:
- **Radici italiane:** `Do`, `Re`, `Mi`, `Fa`, `Sol`, `La`, `Si` (case-insensitive in import, es. `DO`, `SIb`, `sol`, `Fa#`), con alterazioni `#` / `b`.
- **Radici anglosassoni:** `C`, `D`, `E`, `F`, `G`, `A`, `B` con `#` / `b`.
- **Qualità ed estensioni comuni:** `m`, `-` (minore), `maj7`, `7+` (settima maggiore italiana), `7`, `m7`, `-7`, `dim`, `aug`, `sus4`, `4`, `sus2`, `2`, `6`, `9`, `add9`, `m7b5`, `7/5-`.
- **Accordi con basso rivoltato (slash chords):** es. `Sol/Si`, `C/E`, `Fa/La`, `Rem7/Do` (vengono trasposti sia l'accordo sia il basso).
- **Enarmonia musicale corretta:** in base alla tonalità di destinazione (circolo delle quinte), il traspositore sceglie automaticamente i diesis o i bemolli corretti (es. in `Fa` o `Sib` usa `Sib` e `Mib`, non `La#` e `Re#`).
- **Formula di visualizzazione effettiva sul leggio:**
  $$\text{semitoni\_totali} = \text{offset}(\text{tonalità\_attiva} - \text{tonalità\_originale}) + \text{strumento.transposition\_semitones} - \text{capotasto\_locale}$$
  Il tutto reso nella `preferred_notation` dell'utente (`italian` o `english`), con indicazione chiara in testata quando la vista è trasposta o con capotasto attivo (es. `Tonalità: Fa • Capo 1 (leggi in Mi)`).

### 5.4 Importazione guidata da `.docx` e testo copiato
Per agevolare l'uniformazione dell'archivio esistente, l'editor brani include un **Wizard di Importazione** interamente client-side:
1. Caricamento file **`.docx`** (estrazione testo nel browser tramite `mammoth`) oppure **incolla testo libero**.
2. Algoritmo euristico "accordi sulla riga sopra → ChordPro inline" che riconosce righe composte prevalentemente da sigle musicali (italiane o inglesi) e allinea ogni accordo alla colonna corrispondente sulla riga di testo sottostante.
3. **Anteprima affiancata in tempo reale** dove il Maestro può verificare l'esito, correggere eventuali spaziature/tonalità e salvare direttamente nel formato canonico ChordPro.
*(Nota operativa: i vecchi file binari `.doc` pre-2007 non sono supportati nativamente dal browser; l'interfaccia informa chiaramente l'utente invitandolo a convertirli in `.docx` o a copiare e incollare il testo).*

### 5.5 Allegati polimorfici (`song_assets`) e Viewer PDF
- Ogni brano può avere zero, uno o più allegati tipizzati:
  - `asset_type`: `'pdf'` in Fase 1 (schema già predisposto per `'midi'` in Fase 2 e `'musicxml'` in Fase 3).
  - `title`: nome leggibile della parte (es. `Partitura Organo`, `Parte Violino`, `Spartito Coro 4 voci`).
  - `instrument_ids`: array opzionale di strumenti/voci a cui l'allegato è destinato (se vuoto, è disponibile a tutti come spartito generale).
  - `metadata`: JSONB estensibile (in Fase 1 `page_count`, `file_size`; in Fasi 2–3 marker temporali / mapping pagine-sezioni).
- **Viewer PDF integrato (`PDF.js` su `<canvas>`):**
  - Compatibile al 100% con PWA su iPad/iOS.
  - Controlli: zoom/adatta larghezza, salto diretto a pagina, tap sui bordi destro/sinistro per voltare pagina, supporto tasti pedale Bluetooth (`ArrowRight`/`ArrowLeft`/`PageDown`/`PageUp`/`Space`), toggle **Night Score** (attenuazione/inversione morbida per scansioni bianche al buio).

---

## 6. Scalette (Setlist)

- Il Maestro e l'Admin creano e gestiscono scalette (`setlists`) con titolo, data prevista opzionale e descrizione/note generali.
- Ogni voce di scaletta (`setlist_items`) contiene:
  - `song_id` e `position` (ordinamento tramite drag-and-drop e pulsanti touch `Su`/`Giù` comodi su tablet);
  - `override_key` opzionale (es. il brano è in `Sol`, ma in questa messa lo eseguiamo in `Fa`);
  - `notes` opzionali specifiche dell'esecuzione (es. *"Solo 2 strofe + ritornello finale"*).
- Funzione **Duplica scaletta** per riutilizzare rapidamente schemi ricorrenti.
- **Uso autonomo:** fuori dalla modalità Live, qualsiasi musicista o corista può aprire una scaletta e scorrere i brani in sequenza in modalità leggio personale.

---

## 7. Modalità Live (v1 — Fase 1)

La modalità Live consente al gruppo di suonare e provare in sincronia in tempo reale.

### 7.1 Regole di conduzione
- Esiste una sessione Live attiva per istanza (`live_sessions`), con **un solo Maestro attivo** alla volta (`conductor_id`).
- Un altro `conductor` o `admin` può subentrare esplicitamente tramite l'azione **"Prendi il controllo"** (`live:takeover`), ricevendo conferma esplicita per evitare cambi accidentali.

### 7.2 Funzionalità Live v1 incluse in Fase 1
1. **Avvio da Scaletta o Brano singolo:** il Maestro può aprire il Live partendo da una scaletta oppure direttamente da un brano del repertorio.
2. **Cambio brano sincronizzato & Tonalità Live:** tutti i dispositivi agganciati aprono istantaneamente il brano attivo nella vista coerente col proprio strumento/voce e con la tonalità impostata dal Maestro (più eventuale trasposizione strumento e capotasto personale).
3. **Lancio di un brano al volo fuori scaletta:** durante una sessione su scaletta, il Maestro può cercare e lanciare un brano estemporaneo; il contesto della scaletta resta preservato e con un tap si riprende dal punto in cui ci si era fermati.
4. **Banner "Prossimo brano":** quando il Maestro seleziona o preannuncia il brano successivo in scaletta, sui dispositivi appare un banner chiaro e non invasivo: **`Prossimo brano: [Titolo]`** con indicazione della tonalità prevista (e del capotasto personale se impostato), fino al passaggio effettivo al brano.
5. **Sincronizzazione di sezione/strofa o pagina PDF:**
   - Sui brani ChordPro, il Maestro può toccare una sezione (`Strofa 2`, `Ritornello`) per evidenziarla e far scorrere lì tutti i dispositivi sincronizzati.
   - Sugli allegati PDF, il Maestro può sincronizzare il numero di pagina corrente (`active_page`).
6. **Sgancia / Riaggancia ("Torna al Live"):** se un musicista scorre manualmente altrove o apre un altro brano per controllare un passaggio, passa in stato `detached` e vede un pulsante persistente ben visibile **"Torna al Live"** per riallinearsi subito a brano, tonalità e sezione del Maestro.
7. **Segnali lampo del Maestro:** bottoni rapidi one-tap per inviare un breve avviso a scomparsa automatica sullo schermo dei musicisti (es. *"Ripetiamo il Ritornello"*, *"Senza intro"*, *"Rallentando"*, *"Attenzione alla tonalità"*, oppure testo breve libero).
8. **Indicatore Presenza per il Maestro:** pannello/badge discreto nella barra del Maestro che mostra quanti e quali utenti sono connessi in quel momento, con il rispettivo strumento attivo e stato (`Sincronizzato` / `Sganciato`).

### 7.3 Ergonomia da Leggio (iPad, Smartphone, Desktop)
- **Screen Wake Lock:** mantiene lo schermo acceso durante la lettura di brani, scalette e sessioni Live (con riacquisizione automatica al ritorno sull'app).
- **Tre temi ottimizzati:** *Palco Notturno* (`stage_dark`, default), *Nero OLED* (`oled_black`) e *Giorno* (`daylight`), progettati per elevato contrasto e zero abbagliamento in chiesa o sala prove.
- **Layout adattivo:** 1 colonna ampia su smartphone portrait; opzione **2 colonne** su iPad/tablet in landscape per ridurre o azzerare lo scroll nei testi medi.
- **Supporto pedali Bluetooth gira-pagina:** ascolto nativo degli eventi tastiera standard (`PageDown`, `PageUp`, `ArrowDown`, `ArrowUp`, `ArrowRight`, `ArrowLeft`) su lettore ChordPro, scaletta e PDF.

---

## 8. PWA, Offline e Requisiti Non Funzionali

- **Installabilità PWA:** Web App Manifest completo, icone delfino Arion adattive (inclusa `apple-touch-icon` per iPadOS/iOS), Service Worker Workbox per caching dell'app shell e guida in-app per installare su Safari iOS ("Condividi → Aggiungi alla schermata Home").
- **Cache locale IndexedDB (`Dexie.js`):**
  - Cache automatica dei brani e delle scalette aperte di recente e dei relativi allegati PDF.
  - Pulsante esplicito **"Prepara scaletta offline"** su ogni scaletta (e pre-caricamento all'apertura): scarica in locale tutti i testi e i PDF della scaletta prima della prova/messa, riducendo il consumo di banda/egress e garantendo apertura istantanea anche in caso di cali momentanei di segnale.
  - Stato connessione visibile (`Online`, `Live Connesso`, `Offline — Da cache locale`).
- **Prestazioni:** cambio brano in Live < 300 ms quando i dati/PDF sono già in cache; ricerca nel repertorio istantanea lato client/cache.
- **Accessibilità:** target touch minimi `44x44px` sul leggio, contrasto minimo WCAG AA (AAA su testi/accordi in modalità Palco).

---

## 9. Sintesi Evoluzione Futura (Fasi Successive)

Il modello dati della Fase 1 predispone già le estensioni successive senza appesantire il rilascio iniziale (dettagli completi in [`docs/fasi/roadmap.md`](file:///Users/roti/Documents/Dev/arion/docs/fasi/roadmap.md)):
- **Fase 2:** note personali private sul brano, gestione avanzata spazio offline, importazione & player **MIDI** nel browser (studio per voce/traccia e controllo velocità, marker sync in Live).
- **Fase 3:** importazione e rendering **MusicXML** nel browser con estrazione automatica delle parti, trasposizione partitura e cursore sincronizzato.
- **Traccia Self-Hosting:** migrazione guidata dell'intero backend su Docker Compose self-hosted.
