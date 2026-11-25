export interface GuideArticle {
  readonly id: string;
  readonly category: string;
  readonly title: string;
  readonly summary: string;
  readonly keywords: readonly string[];
  readonly steps: readonly string[];
  readonly tip?: string;
}

export interface PrivacyPolicySection {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly bullets?: readonly string[];
}

export interface DevStage {
  readonly phase: string;
  readonly status: string;
  readonly isTarget?: boolean;
  readonly details: readonly string[];
}

export interface OpenSourceLicense {
  readonly name: string;
  readonly license: string;
  readonly copyright: string;
  readonly purpose: string;
}

export const it = {
  app: {
    name: 'Arion',
    subtitle: 'Armonia e Ritmo In Ogni Nota',
    technicalAcronym: 'Automatic Real-time Instrument and Orchestra Notation',
    logoLabel: 'Logo Arion',
    defaultGroupName: 'Il Mio Coro',
    defaultActiveInstrument: 'Voce / Corista',
    defaultDisplayName: 'Musicista',
    versionLabel: (version: string) => `v${version}`,
  },
  nav: {
    home: 'Home',
    repertoire: 'Repertorio',
    live: 'Live',
    calendar: 'Calendario',
    more: 'Altro',
    setlists: 'Scalette',
    guide: "Guida all'uso",
    settings: 'Profilo e preferenze',
    admin: 'Amministrazione',
    adminControlPanel: 'Pannello di controllo',
    support: 'Assistenza tecnica e feedback',
    privacy: 'Privacy e integrità dei dati',
    devInfo: "Informazioni sull'app",
    back: 'Indietro',
    primaryNavLabel: 'Navigazione principale',
  },
  themes: {
    selectorLabel: 'Tema visivo',
    daylight: 'Chiaro',
    stageDark: 'Palco Notturno',
    oledBlack: 'Nero OLED',
    stageToggleToDark: 'Palco Notturno',
    stageToggleToLight: 'Tema Chiaro',
  },
  textSizes: {
    sectionTitle: 'Dimensione testo',
    compact: 'Compatto',
    extended: 'Esteso',
    hint: 'Adatta la grandezza dei testi e dei pulsanti alle esigenze del tuo leggio.',
  },
  notations: {
    sectionTitle: 'Notazione accordi',
    italian: 'Italiana (Do Re Mi)',
    english: 'Internazionale (C D E)',
  },
  home: {
    greeting: (hour: number, name: string) => {
      if (hour >= 5 && hour < 13) return `Buongiorno, ${name}`;
      if (hour >= 13 && hour < 18) return `Buon pomeriggio, ${name}`;
      return `Buonasera, ${name}`;
    },
    nextEventKicker: 'Prossimo appuntamento',
    nextEventSampleTitle: 'Prova settimanale di repertorio',
    nextEventSampleWhen: 'Gio 20:45 · Sala prove',
    openCalendarAction: 'Apri calendario',
    liveSectionTitle: 'Sessione Live',
    liveIdleTitle: 'Nessuna sessione dal vivo attiva',
    liveIdleSubtitle:
      'Quando il Maestro avvia il Live, i dispositivi si sincronizzano automaticamente.',
    liveOpenButton: 'Apri console Live',
    quickAccessTitle: 'Accesso rapido',
    quickRepertoireTitle: 'Repertorio',
    quickRepertoireDesc: 'Cerca brani, testi con accordi e allegati PDF',
    quickSetlistsTitle: 'Scalette',
    quickSetlistsDesc: 'Sfoglia le sequenze preparate per prove e concerti',
    recentSongsTitle: 'Brani recenti',
    viewAllRepertoire: 'Vedi tutto',
  },
  repertoire: {
    title: 'Repertorio',
    searchPlaceholder: 'Cerca per titolo, parola o autore...',
    clearSearchLabel: 'Pulisci ricerca',
    filterAll: 'Tutti',
    setlistsShortcut: 'Scalette',
    emptyTitle: 'Nessun brano trovato',
    emptySubtitle: 'Prova a cambiare parola chiave o filtro di categoria.',
    openSongLabel: (title: string) => `Apri ${title} sul leggio`,
    songsCount: (count: number) => (count === 1 ? '1 brano' : `${count} brani`),
    demoNotice:
      'Brani dimostrativi locali: il catalogo completo sincronizzato verrà collegato con il database nella Milestone 1.5.',
  },
  reader: {
    backToRepertoire: 'Repertorio',
    modeLyricsOnly: 'Solo Testo',
    modeChords: 'Testo + Accordi',
    fontDecreaseLabel: 'Riduci dimensione testo',
    fontIncreaseLabel: 'Aumenta dimensione testo',
    fontDecreaseShort: 'A-',
    fontIncreaseShort: 'A+',
    fontScaleLabel: 'Scala testo',
    keyPrefix: 'Tonalità:',
    tempoPrefix: 'Tempo:',
    authorLabel: 'Autore:',
    notFoundTitle: 'Brano non trovato',
    notFoundSubtitle: 'Il brano richiesto non è presente in elenco.',
  },
  live: {
    title: 'Modalità Live',
    statusBadgeIdle: 'In attesa',
    idleHeading: 'Pronto per la sincronizzazione dal vivo',
    idleDescription:
      'In modalità Live il Maestro seleziona il brano attivo, imposta la tonalità e invia i cambi sezione o il banner del brano successivo a tutti i leggii connessi.',
    activeInstrumentLabel: 'Strumento attivo',
    syncHint:
      'La sincronizzazione Realtime (Broadcast e Presence) sarà collegata nella Milestone 1.7.',
    goToRepertoire: 'Sfoglia Repertorio',
    goToSetlists: 'Apri Scalette',
  },
  calendar: {
    title: 'Calendario',
    viewUpcoming: 'Prossimi',
    viewMonth: 'Mese',
    filterLabel: 'Filtro appuntamenti',
    filterAll: 'Tutti',
    filterRehearsal: 'Prove',
    filterConcert: 'Esibizioni',
    filterService: 'Servizi',
    prevMonthLabel: 'Mese precedente',
    nextMonthLabel: 'Mese successivo',
    todayButton: 'Oggi',
    emptyDay: 'Nessun appuntamento in questa giornata.',
    emptyUpcoming: 'Nessun appuntamento programmato con il filtro selezionato.',
    openSetlistLink: 'Apri scaletta collegata',
    months: [
      'Gennaio',
      'Febbraio',
      'Marzo',
      'Aprile',
      'Maggio',
      'Giugno',
      'Luglio',
      'Agosto',
      'Settembre',
      'Ottobre',
      'Novembre',
      'Dicembre',
    ],
    weekdaysShort: ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'],
    categories: {
      rehearsal: 'Prova',
      concert: 'Esibizione',
      service: 'Servizio',
      other: 'Altro',
    },
    demoNotice:
      'Agenda dimostrativa locale: la gestione completa e persistente degli eventi verrà collegata nella Milestone 1.6.',
  },
  setlists: {
    title: 'Scalette',
    subtitle: 'Sequenze ordinate per prove, concerti e servizi.',
    backToMore: 'Altro',
    songsCount: (count: number) => (count === 1 ? '1 brano' : `${count} brani`),
    openFirstSong: 'Apri primo brano',
    demoNotice:
      'Le scalette personalizzate, il riordino e gli override di tonalità saranno collegati al database nella Milestone 1.6.',
  },
  more: {
    title: 'Altro',
    toolsSectionTitle: 'Strumenti e preferenze',
    adminSectionTitle: 'Amministrazione',
    supportSectionTitle: 'Supporto e informazioni',
    creditsLine1: 'Arion — Armonia e Ritmo In Ogni Nota',
    creditsLine2: 'Automatic Real-time Instrument and Orchestra Notation',
  },
  settings: {
    title: 'Profilo e preferenze',
    backToMore: 'Altro',
    profileSectionTitle: 'Profilo musicale',
    groupLabel: 'Gruppo',
    instrumentLabel: 'Strumento / Voce attiva',
    emailLabel: 'Email',
    roleLabel: 'Ruolo operativo',
    displayNameLabel: 'Nome mostrato',
    saveProfileButton: 'Salva nome',
    savingProfileButton: 'Salvataggio...',
    profileSavedMessage: 'Nome aggiornato.',
    signOutButton: 'Esci',
    accountNote:
      'La gestione multi-strumento e il selettore rapido dalla barra arriveranno nella Milestone 1.3.',
    themeHint:
      'Scegli Chiaro per l’uso quotidiano oppure Palco Notturno / Nero OLED per ambienti poco illuminati.',
    privacyButton: "Leggi l'informativa sulla privacy",
  },
  auth: {
    badge: 'Accesso su invito',
    loginTitle: 'Accedi ad Arion',
    loginSubtitle:
      'Inserisci la tua email autorizzata per ricevere il link di accesso e il codice a 6 cifre.',
    emailLabel: 'Indirizzo email',
    emailPlaceholder: 'nome@esempio.it',
    sendCodeButton: 'Invia codice di accesso',
    sendingCodeButton: 'Invio in corso...',
    otpStepTitle: 'Inserisci il codice a 6 cifre',
    otpStepSubtitle: (email: string) =>
      `Abbiamo inviato un’email a ${email}. Puoi cliccare il Magic Link oppure digitare qui sotto il codice a 6 cifre (consigliato su iPad e iPhone installati in Home).`,
    otpLabel: 'Codice di verifica (6 cifre)',
    otpPlaceholder: '123456',
    verifyOtpButton: 'Verifica e accedi',
    verifyingOtpButton: 'Verifica in corso...',
    resendCodeButton: 'Invia di nuovo il codice',
    changeEmailButton: 'Usa un’altra email',
    codeResentInfo: 'Nuovo codice inviato. Controlla la tua casella email.',
    unconfiguredTitle: 'Backend locale non configurato',
    unconfiguredBody:
      'Imposta VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nel file locale .env.local per attivare l’accesso.',
    inactiveTitle: 'Account temporaneamente disattivato',
    inactiveBody:
      'Il tuo profilo risulta disattivato. Contatta l’amministratore del gruppo per riattivare l’accesso.',
    signOutButton: 'Esci',
    errors: {
      notAuthorized:
        'Questa email non è autorizzata ad accedere. Chiedi all’amministratore di aggiungerla agli inviti.',
      invalidOtp: 'Codice non valido o scaduto. Controlla le 6 cifre o richiedi un nuovo invio.',
      rateLimited: 'Hai inviato troppe richieste ravvicinate. Attendi qualche istante e riprova.',
      generic: 'Impossibile completare l’accesso. Riprova tra poco.',
    },
  },
  forbidden: {
    title: 'Accesso non consentito',
    body: 'Non disponi dei permessi necessari per aprire questa sezione.',
    backHome: 'Torna alla Home',
  },
  guide: {
    title: "Guida all'uso",
    subtitle: 'Indicazioni pratiche per usare Arion alle prove e dal vivo.',
    searchPlaceholder: 'Cerca nella guida (es. accordi, live, iPad)...',
    clearSearch: 'Cancella ricerca',
    categoryAll: 'Tutte',
    resultsCount: (count: number) => (count === 1 ? '1 argomento' : `${count} argomenti`),
    emptyTitle: 'Nessun risultato',
    emptySubtitle: 'Prova con una parola diversa o azzera i filtri.',
    stepsHeading: 'Come fare',
    tipHeading: 'Suggerimento',
    articles: [
      {
        id: 'reader-views',
        category: 'Leggio',
        title: 'Alternare Solo Testo e Testo + Accordi',
        summary: 'Adatta il brano sul leggio al tuo ruolo musicale con un solo tocco.',
        keywords: ['leggio', 'testo', 'accordi', 'corista', 'chitarra'],
        steps: [
          'Apri un brano da Home, Repertorio o Scalette.',
          'Tocca il pulsante "Testo + Accordi" o "Solo Testo" nella barra superiore del brano.',
          'Usa A- e A+ per regolare la dimensione del testo sul tuo schermo.',
        ],
        tip: 'In ambienti poco illuminati puoi passare al tema Palco Notturno direttamente dalla barra del leggio.',
      },
      {
        id: 'live-sync',
        category: 'Live',
        title: 'Partecipare a una sessione Live',
        summary: 'Segui automaticamente i brani e la tonalità scelti dal Maestro.',
        keywords: ['live', 'maestro', 'sincronizzazione', 'prossimo brano'],
        steps: [
          'Tocca il pulsante centrale Live nella barra inferiore.',
          'Quando il Maestro avvia la sessione, il leggio si allinea al brano attivo.',
          'Se scorri manualmente per conto tuo, potrai riagganciarti in un tocco.',
        ],
      },
      {
        id: 'calendar-setlists',
        category: 'Calendario',
        title: 'Consultare prove, esibizioni e scalette',
        summary: 'Controlla date, orari e repertorio previsto per ciascun appuntamento.',
        keywords: ['calendario', 'prove', 'concerti', 'scaletta', 'mese'],
        steps: [
          'Apri Calendario dalla barra inferiore per vedere la lista "Prossimi" o la griglia "Mese".',
          'Filtra per Prove, Esibizioni o Servizi.',
          'Apri la scaletta collegata per studiare in sequenza i brani previsti.',
        ],
      },
      {
        id: 'pwa-install',
        category: 'Dispositivi',
        title: 'Installare Arion su iPad, iPhone e Android',
        summary: 'Aggiungi l’app alla schermata Home per usarla a schermo intero sul leggio.',
        keywords: ['pwa', 'ipad', 'iphone', 'safari', 'android', 'installare'],
        steps: [
          'Su iPad o iPhone apri Arion con Safari e tocca il pulsante Condividi.',
          'Scegli "Aggiungi alla schermata Home" e conferma.',
          'Su Android o desktop Chrome usa la voce "Installa app" dal menu del browser.',
        ],
        tip: 'Una volta installata, Arion si apre senza barre del browser, lasciando più spazio allo spartito.',
      },
    ] satisfies readonly GuideArticle[],
  },
  support: {
    title: 'Assistenza tecnica e feedback',
    badge: 'Supporto tecnico',
    description:
      'Hai riscontrato un problema sul leggio, un errore di impaginazione o vuoi proporre un miglioramento? Invia una segnalazione indicando cosa stavi facendo.',
    emailButton: 'Invia segnalazione via email',
    noEmailConfigured:
      'Nessun indirizzo email tecnico configurato in questa istanza: contatta direttamente l’amministratore del tuo gruppo.',
    diagnosticsHeading: 'Dettagli tecnici da includere',
    emailSubject: 'Segnalazione Arion',
    emailBodyIntro: 'Descrivi qui il problema riscontrato o il suggerimento:',
    emailDeviceLabel: 'Dettagli dispositivo',
    urgentNote:
      'Durante una prova o un servizio dal vivo, avvisa direttamente il Maestro o l’amministratore del gruppo.',
  },
  privacy: {
    title: 'Privacy e integrità dei dati',
    badge: 'Modello White-Label e Sicurezza',
    subtitle: 'Come Arion protegge i dati del gruppo, gli spartiti e le preferenze personali.',
    lastUpdated: 'Documento tecnico del framework Arion',
    summaryTitle: 'In sintesi',
    summaryBullets: [
      'Il codice sorgente pubblico non contiene dati privati di alcun coro, persona o spartito.',
      'L’accesso alle istanze configurate è esclusivamente su invito dell’Amministratore.',
      'Le preferenze di lettura (tema, dimensione testo, notazione) restano salvate localmente sul dispositivo.',
    ],
    highlights: [
      {
        label: 'Accesso',
        value: 'Solo su invito',
        detail: 'Nessuna registrazione pubblica aperta; verifica permessi lato database.',
      },
      {
        label: 'Tracciamento',
        value: 'Assente',
        detail: 'Nessuna pubblicità, cookie di profilazione o analytics di terze parti.',
      },
      {
        label: 'Dati locali',
        value: 'Sotto controllo',
        detail: 'Preferenze e cache leggio archiviate nel browser del dispositivo.',
      },
    ],
    sections: [
      {
        id: 'architecture',
        title: '1. Separazione tra framework e dati del gruppo',
        paragraphs: [
          'Arion nasce come framework white-label riutilizzabile: tutte le informazioni specifiche di un coro (nome, logo, membri autorizzati, repertorio e allegati) risiedono esclusivamente nel database e nello storage privato della singola istanza.',
        ],
      },
      {
        id: 'security',
        title: '2. Sicurezza applicata sul backend',
        paragraphs: [
          'Le autorizzazioni per consultare, modificare o condurre sessioni Live sono verificate dal database tramite Row Level Security (RLS), in modo che nessun dispositivo possa alterare i propri privilegi.',
        ],
      },
      {
        id: 'local-storage',
        title: '3. Archiviazione sul dispositivo',
        paragraphs: [
          'Per garantire continuità sul leggio anche con segnale debole, Arion salva nel browser le preferenze di visualizzazione e, nelle milestone dedicate, una copia locale dei brani e dei PDF delle scalette.',
        ],
      },
    ] satisfies readonly PrivacyPolicySection[],
    actionsTitle: 'Azioni rapide',
    openSettingsButton: 'Vai a Profilo e preferenze',
    openSupportButton: 'Contatta il supporto',
  },
  devInfo: {
    title: "Informazioni sull'app",
    kicker: 'Scheda del progetto',
    abstractParagraphs: [
      'Arion (Armonia e Ritmo In Ogni Nota — Automatic Real-time Instrument and Orchestra Notation) è una Progressive Web App progettata per gestire repertorio, trasposizione accordi, scalette, calendario e sincronizzazione dal vivo per cori ed ensemble musicali.',
      'Ogni componente musicale dell’organico — coristi, chitarristi, organisti, pianisti e strumentisti a fiato o ad arco — visualizza il brano nella modalità più adatta al proprio strumento.',
      'L’applicazione è pensata per funzionare in modo fluido su iPad, tablet Android, smartphone e desktop, senza dipendenze da servizi di tracciamento esterni.',
    ],
    openGuideButton: "Apri Guida all'uso",
    openPrivacyButton: 'Privacy e integrità dei dati',
    techTitle: 'Architettura tecnica e sicurezza',
    techSubtitle: 'Stack frontend PWA, motore accordi, backend PostgreSQL RLS e offline',
    techItems: [
      'Frontend PWA in React 19, TypeScript strict, Vite + Workbox e Tailwind CSS v4 con caratteri di sistema offline.',
      'Architettura a strati: logica musicale pura in src/domain/, adapter infrastrutturali disaccoppiati in src/services/ e moduli UI per dominio.',
      'Backend previsto su PostgreSQL + Supabase (Auth Magic Link + OTP 6 cifre, Row Level Security su tabelle e Storage, Realtime Broadcast + Presence), pronto per migrazione self-hosted su Docker.',
      'Rendering PDF affidabile su iPad/iOS via PDF.js su canvas e cache offline locale tramite IndexedDB (Dexie).',
    ],
    stagesTitle: 'Fasi di sviluppo',
    stagesSubtitle: 'Percorso incrementale dalla Fase 1 alla Fase 3',
    stages: [
      {
        phase: 'Fase 1 — MVP Prove, Repertorio e Live v1',
        status: 'In corso (Milestone 1.0)',
        details: [
          'Shell PWA a 5 tab, temi Carta / Palco Notturno / Nero OLED e accessibilità da leggio.',
          'Database PostgreSQL con RLS, Auth invite-only OTP, catalogo strumenti dinamico, motore ChordPro ITA/ENG, PDF.js, Scalette, Calendario e Live Realtime.',
        ],
      },
      {
        phase: 'Fase 2 — Studio Personale, Offline Avanzato & MIDI',
        status: 'Pianificata',
        details: [
          'Note personali private per brano, gestione quota cache offline e player MIDI browser-side per studiare la propria voce.',
        ],
      },
      {
        phase: 'Fase 3 — MusicXML Interattivo & Self-Hosting',
        status: 'Pianificata',
        isTarget: true,
        details: [
          'Rendering spartiti MusicXML nel browser con estrazione parti e guida operativa per il self-hosting completo su Docker.',
        ],
      },
    ] satisfies readonly DevStage[],
    changelogTitle: 'Changelog',
    changelogSubtitle: 'Cronologia delle milestone rilasciate',
    changelogVersionTitle: 'Versione 0.1.0 — Base UI, navigazione a 5 tab e Design System',
    changelogItems: [
      'Struttura repository white-label con documentazione di specifica e piano a fasi.',
      'Design system realistico con temi Chiaro, Palco Notturno e Nero OLED e scala testo Compatto/Esteso.',
      'Navigazione mobile/tablet a 5 destinazioni (Home, Repertorio, Live centrale, Calendario, Altro) e sidebar desktop.',
      'Schermate base navigabili con anteprima Leggio, Calendario mensile, Scalette e sottopagine di supporto.',
    ],
    licensesTitle: 'Componenti e licenze open source',
    licensesSubtitle: 'Librerie software utilizzate nel progetto',
    licenses: [
      {
        name: 'React & React DOM (v19)',
        license: 'MIT License',
        copyright: 'Meta Platforms, Inc. and affiliates',
        purpose: 'Libreria per l’interfaccia utente a componenti',
      },
      {
        name: 'React Router (v7)',
        license: 'MIT License',
        copyright: 'Remix Software Inc.',
        purpose: 'Navigazione tra le schermate dell’applicazione',
      },
      {
        name: 'TypeScript (strict mode)',
        license: 'Apache License 2.0',
        copyright: 'Microsoft Corporation',
        purpose: 'Controllo rigoroso dei tipi nel codice',
      },
      {
        name: 'Vite & Vite Plugin PWA / Workbox',
        license: 'MIT License',
        copyright: 'Evan You, Google LLC & Vite Contributors',
        purpose: 'Build dell’applicazione e supporto Service Worker PWA',
      },
      {
        name: 'Tailwind CSS (v4)',
        license: 'MIT License',
        copyright: 'Tailwind Labs, Inc.',
        purpose: 'Stile e impaginazione responsive',
      },
      {
        name: 'Lucide React',
        license: 'ISC License',
        copyright: 'Lucide Contributors',
        purpose: 'Icone vettoriali dell’interfaccia',
      },
    ] satisfies readonly OpenSourceLicense[],
  },
  admin: {
    title: 'Pannello di controllo',
    subtitle: 'Configurazione istanza, utenti autorizzati e catalogo strumenti.',
    backToMore: 'Altro',
    backToPanel: 'Pannello di controllo',
    statusLabel: 'Stato sistema',
    statusReady: 'Database collegato',
    summaryMetrics: (usersCount: number, invitesCount: number) =>
      `${usersCount} utenti attivi · ${invitesCount} inviti attivi`,
    openSection: 'Apri sezione',
    comingSoon: 'In arrivo',
    cards: [
      {
        id: 'instance',
        title: 'Identità istanza',
        description: 'Nome del coro, sottotitolo e logo personalizzato white-label.',
        milestone: 'Attivo',
      },
      {
        id: 'users',
        title: 'Utenti e inviti',
        description: 'Whitelist email autorizzate, ruoli operativi e stato account.',
        milestone: 'Attivo',
      },
      {
        id: 'instruments',
        title: 'Catalogo strumenti e voci',
        description: 'Abilita, disabilita e configura trasposizioni per voci e strumenti.',
        milestone: 'Milestone 1.3',
      },
    ],
  },
  adminInstance: {
    title: 'Identità istanza',
    subtitle: 'Personalizza nome, sottotitolo, tema predefinito e logo del gruppo.',
    groupNameLabel: 'Nome del gruppo / coro',
    groupNamePlaceholder: 'Es. Il Mio Coro',
    groupSubtitleLabel: 'Sottotitolo (opzionale)',
    groupSubtitlePlaceholder: 'Es. Gruppo vocale e strumentale',
    defaultThemeLabel: 'Tema predefinito nuovi utenti',
    defaultNotationLabel: 'Notazione accordi predefinita',
    saveButton: 'Salva identità',
    savingButton: 'Salvataggio...',
    savedMessage: 'Impostazioni dell’istanza salvate.',
    logoSectionTitle: 'Logo personalizzato',
    logoHint:
      'Formati supportati: PNG, JPG, WebP o SVG (max 5 MB). Se assente, viene mostrato il delfino Arion.',
    uploadLogoButton: 'Carica nuovo logo',
    uploadingLogoButton: 'Caricamento...',
    removeLogoButton: 'Ripristina logo Arion',
    logoSavedMessage: 'Logo aggiornato.',
    logoRemovedMessage: 'Logo personalizzato rimosso.',
    errors: {
      invalidType: 'Formato non supportato. Scegli un’immagine PNG, JPG, WebP o SVG.',
      fileTooLarge: 'L’immagine supera il limite di 5 MB.',
      generic: 'Errore durante il salvataggio delle impostazioni.',
    },
  },
  adminUsers: {
    title: 'Utenti e inviti',
    subtitle: 'Solo le email presenti in elenco possono accedere ad Arion.',
    inviteSectionTitle: 'Aggiungi email autorizzata',
    emailLabel: 'Email',
    emailPlaceholder: 'nome@esempio.it',
    displayNameLabel: 'Nome mostrato (opzionale)',
    displayNamePlaceholder: 'Es. Mario Rossi',
    roleLabel: 'Ruolo operativo',
    addInviteButton: 'Autorizza email',
    addingInviteButton: 'Salvataggio...',
    inviteAddedMessage: 'Email aggiunta agli inviti autorizzati.',
    invitesListTitle: 'Email autorizzate (whitelist)',
    emptyInvites: 'Nessuna email autorizzata presente.',
    statusActive: 'Attivo',
    statusRevoked: 'Revocato',
    statusDisabled: 'Disattivato',
    revokeButton: 'Revoca',
    reactivateButton: 'Riattiva',
    deleteInviteButton: 'Elimina',
    usersListTitle: 'Utenti registrati',
    emptyUsers: 'Nessun utente ha ancora completato il primo accesso.',
    deactivateButton: 'Disattiva',
    errors: {
      duplicateEmail: 'Questa email è già presente negli inviti autorizzati.',
      lastAdmin: 'Operazione bloccata: deve rimanere almeno un Amministratore attivo nell’istanza.',
      generic: 'Errore durante l’aggiornamento utenti.',
    },
  },
  roles: {
    admin: 'Amministratore',
    conductor: 'Maestro',
    musician: 'Musicista / Corista',
  },
  common: {
    loading: 'Caricamento in corso...',
    save: 'Salva',
    cancel: 'Annulla',
    confirm: 'Conferma',
    close: 'Chiudi',
    back: 'Indietro',
    edit: 'Modifica',
    delete: 'Elimina',
    search: 'Cerca',
  },
  errors: {
    generic: 'Si è verificato un errore imprevisto. Riprova.',
    unauthorized: 'Accesso non autorizzato per questa operazione.',
    offline: 'Connessione assente: lettura dalla cache locale.',
  },
} as const;
