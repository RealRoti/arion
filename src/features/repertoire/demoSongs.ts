export interface DemoChordSegment {
  readonly chord: string | null;
  readonly lyric: string;
}

export interface DemoSongSection {
  readonly label: string;
  readonly lines: readonly (readonly DemoChordSegment[])[];
}

export interface DemoSong {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly key: string;
  readonly tempo: string;
  readonly tags: readonly string[];
  readonly sections: readonly DemoSongSection[];
}

export interface DemoSetlist {
  readonly id: string;
  readonly title: string;
  readonly dateLabel: string;
  readonly songIds: readonly string[];
}

export interface DemoCalendarEvent {
  readonly id: string;
  readonly title: string;
  readonly category: 'rehearsal' | 'concert' | 'service' | 'other';
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly location: string;
  readonly setlistId?: string;
}

export const DEMO_SONGS: readonly DemoSong[] = [
  {
    id: 'canto-di-prova',
    title: 'Canto di Prova',
    author: 'Tradizionale',
    key: 'Do',
    tempo: '4/4',
    tags: ['Ingresso', 'Assemblea'],
    sections: [
      {
        label: 'Strofa 1',
        lines: [
          [
            { chord: 'Do', lyric: 'Canta con gioia, ' },
            { chord: 'Sol/Si', lyric: 'apri la tua ' },
            { chord: 'Lam', lyric: 'voce,' },
          ],
          [
            { chord: 'Fa', lyric: 'ogni nota in' },
            { chord: 'Sol', lyric: 'sieme trova ' },
            { chord: 'Do', lyric: 'armonia.' },
          ],
        ],
      },
      {
        label: 'Ritornello',
        lines: [
          [
            { chord: 'Fa', lyric: 'Sali in alto ' },
            { chord: 'Sol', lyric: 'su quest’onda ' },
            { chord: 'Do', lyric: 'chiara,' },
          ],
          [
            { chord: 'Rem', lyric: 'ritmo e ' },
            { chord: 'Sol', lyric: 'canto in ogni ' },
            { chord: 'Do', lyric: 'nota.' },
          ],
        ],
      },
    ],
  },
  {
    id: 'inno-del-mattino',
    title: 'Inno del Mattino',
    author: 'Pubblico dominio',
    key: 'Sol',
    tempo: '3/4',
    tags: ['Assemblea'],
    sections: [
      {
        label: 'Strofa 1',
        lines: [
          [
            { chord: 'Sol', lyric: 'Sorge la luce ' },
            { chord: 'Re/Fa#', lyric: 'sopra il sen' },
            { chord: 'Mim', lyric: 'tiero,' },
          ],
          [
            { chord: 'Do', lyric: 'scorre la ' },
            { chord: 'Re', lyric: 'voce lieve nel ' },
            { chord: 'Sol', lyric: 'coro.' },
          ],
        ],
      },
    ],
  },
];

export const DEMO_SETLISTS: readonly DemoSetlist[] = [
  {
    id: 'prova-settimanale',
    title: 'Scaletta Prova Settimanale',
    dateLabel: 'Giovedì • 20:45',
    songIds: ['canto-di-prova', 'inno-del-mattino'],
  },
];

export function buildDemoCalendarEvents(baseDate = new Date()): readonly DemoCalendarEvent[] {
  const toIso = (offsetDays: number) => {
    const d = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate() + offsetDays,
    );
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return [
    {
      id: 'evt-rehearsal-1',
      title: 'Prova settimanale di repertorio',
      category: 'rehearsal',
      date: toIso(2),
      startTime: '20:45',
      endTime: '22:15',
      location: 'Sala prove',
      setlistId: 'prova-settimanale',
    },
    {
      id: 'evt-concert-1',
      title: 'Rassegna corale di primavera',
      category: 'concert',
      date: toIso(7),
      startTime: '18:00',
      endTime: '19:30',
      location: 'Auditorium',
      setlistId: 'prova-settimanale',
    },
  ];
}
