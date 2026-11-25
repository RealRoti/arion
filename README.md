# Arion

**Armonia e Ritmo In Ogni Nota** (_Automatic Real-time Instrument and Orchestra Notation_)

PWA open-core white-label per la gestione di repertorio, spartiti, scalette ed esecuzioni dal vivo di cori ed ensemble musicali.

## Principi chiave

- **White-Label & Privacy:** il repository contiene esclusivamente il framework generico e riutilizzabile. Nome del gruppo, logo personalizzato, utenti autorizzati e catalogo strumenti abilitati vivono nel database dell'istanza.
- **Documentation-First:** le specifiche e il piano di sviluppo si trovano nella cartella `docs/`.
- **Sicurezza backend:** Row Level Security (RLS) su PostgreSQL, accesso invite-only con Magic Link + codice OTP a 6 cifre (compatibile con PWA standalone su iPad/iOS) e permessi centralizzati.
- **Leggio digitale:** supporto ChordPro con trasposizione ITA/ENG, rendering PDF via `PDF.js` su `<canvas>`, cache offline con IndexedDB e temi ad alto contrasto (_Deep Marine Stage_).

## Documentazione

- [AGENTS.md](AGENTS.md) — Contratto ingegneristico, convenzioni e regole di sicurezza
- [docs/SPECIFICHE.md](docs/SPECIFICHE.md) — Specifiche funzionali e non funzionali
- [docs/STRUTTURA-APP.md](docs/STRUTTURA-APP.md) — Architettura tecnica, schema DB, RLS e Design System
- [docs/fasi/fase-1.md](docs/fasi/fase-1.md) — Piano operativo a milestone della Fase 1
- [docs/fasi/roadmap.md](docs/fasi/roadmap.md) — Roadmap Fasi 2–3 (MIDI, MusicXML) e Self-Hosting

## Comandi di sviluppo

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```
