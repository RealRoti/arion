# Roadmap Evolutiva — Fasi Successive e Self-Hosting

Questo documento traccia le evoluzioni pianificate dopo il completamento e l'uso sul campo della **Fase 1**. Lo schema del database e i layer applicativi della Fase 1 sono già predisposti per accoglierle senza rotture retroattive.

---

## Fase 2 — Studio Personale, Offline Avanzato & MIDI

### 2.1 Note personali e gestione avanzata cache offline

- Esposizione della colonna già predisposta `user_song_preferences.personal_notes` per consentire a ciascun musicista/corista di salvare appunti privati su un brano (respirazione, dinamica, diteggiatura) invisibili agli altri.
- Cruscotto spazio offline: riepilogo MB occupati in IndexedDB, pre-cache selettiva per tag o intero repertorio, rimozione selettiva dei PDF più vecchi.

### 2.2 Importazione e Studio MIDI nel browser

- Caricamento di allegati `.mid` in `song_assets` (`asset_type = 'midi'`) tramite lo stesso modello polimorfico della Fase 1.
- Player MIDI interamente client-side (`@tonejs/midi` + Web Audio API + SoundFont compatto) con:
  - **mixer per traccia/voce** (es. un Soprano alza la propria linea e attenua o mette in mute le altre);
  - **controllo velocità (tempo stretch)** senza alterare l'intonazione (es. 70%–100%) e loop A–B su una battuta/sezione per studiare a casa.

### 2.3 Sincronizzazione Live guidata da MIDI (opzionale)

- Mapping in `song_assets.metadata.sync_markers` tra timestamp/battute MIDI e sezioni ChordPro o pagine PDF.
- Avanzamento automatico sincronizzato durante l'esecuzione Live quando il Maestro avvia la traccia o il click di riferimento.
- _(Nota tecnica iOS: su Safari iOS la Web MIDI API per collegare tastiere hardware via cavo ha forti limitazioni di piattaforma; tutta la riproduzione audio di file `.mid` e il clock di sincronizzazione Web Audio funzionano comunque regolarmente su iPad e iPhone)._

---

## Fase 3 — MusicXML Interattivo

- Caricamento di partiture `.xml` e `.mxl` compresse in `song_assets` (`asset_type = 'musicxml'`).
- Rendering vettoriale e responsive dello spartito direttamente nel browser (tramite librerie come `OpenSheetMusicDisplay` o `Verovio`), senza dipendere da PDF statici.
- **Estrazione automatica della parte** filtrata sullo strumento/voce attiva dell'utente (`instruments.slug` / mapping parte MusicXML).
- **Trasposizione istantanea dello spartito** (inclusi strumenti traspositori e cambio tonalità comandato dal Maestro in Live).
- **Cursore sincronizzato** durante lo studio con audio sintetizzato o durante l'esecuzione Live.

---

## Traccia Infrastrutturale — Migrazione a Self-Hosting

Quando il gruppo desidera rendersi indipendente dai limiti del piano gratuito cloud (pausa dopo 7 giorni di inattività, tetto 1 GB Storage) o avere il controllo completo sui propri dati:

1. **Stack target:** **Supabase Self-Hosted** tramite Docker Compose ufficiale su VPS, mini-PC o NAS dedicato, dietro reverse proxy con certificato HTTPS valido (obbligatorio per il funzionamento dei Service Worker PWA e dello Screen Wake Lock).
2. **Migrazione trasparente:**
   - Applicazione delle identiche migrazioni SQL di `supabase/migrations/` (tabelle, trigger, RBAC, policy RLS e Storage restano invariati).
   - Ripristino del dump dati da cloud (o importazione archivio) e copia dei bucket `song-assets` e `instance-branding`.
   - Aggiornamento delle sole variabili d'ambiente frontend (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) e deploy del bundle statico PWA.
3. **Continuità operativa:** configurazione di backup automatici giornalieri (dump Postgres + snapshot volume Storage) e rotazione delle chiavi di servizio.
