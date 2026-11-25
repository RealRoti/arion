import JSZip from 'jszip';
import { describe, expect, it as vitestIt } from 'vitest';
import {
  importSongFromMusicXmlArrayBuffer,
  MusicXmlImportError,
  parseMusicXmlToChordPro,
} from '@/domain/chords/musicXmlImporter';

const SAMPLE_FINALE_MUSICXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work>
    <work-title>Canto di Prova Finale</work-title>
  </work>
  <identification>
    <creator type="composer">Autore Demo</creator>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Voce</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <key>
          <fifths>1</fifths>
          <mode>major</mode>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
      </attributes>
      <direction>
        <sound tempo="84"/>
      </direction>
      <harmony>
        <root>
          <root-step>G</root-step>
        </root>
        <kind>major</kind>
      </harmony>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>1</duration>
        <lyric number="1">
          <syllabic>single</syllabic>
          <text>Ec</text>
        </lyric>
        <lyric number="2">
          <syllabic>single</syllabic>
          <text>O</text>
        </lyric>
      </note>
      <note>
        <pitch><step>A</step><octave>4</octave></pitch>
        <duration>1</duration>
        <lyric number="1">
          <syllabic>single</syllabic>
          <text>co</text>
        </lyric>
        <lyric number="2">
          <syllabic>single</syllabic>
          <text>ra</text>
        </lyric>
      </note>
      <harmony>
        <root>
          <root-step>D</root-step>
        </root>
        <kind>major</kind>
        <bass>
          <bass-step>F</bass-step>
          <bass-alter>1</bass-alter>
        </bass>
      </harmony>
      <note>
        <pitch><step>B</step><octave>4</octave></pitch>
        <duration>1</duration>
        <lyric number="1">
          <syllabic>begin</syllabic>
          <text>can</text>
        </lyric>
        <lyric number="2">
          <syllabic>begin</syllabic>
          <text>gio</text>
        </lyric>
      </note>
      <note>
        <pitch><step>A</step><octave>4</octave></pitch>
        <duration>1</duration>
        <lyric number="1">
          <syllabic>end</syllabic>
          <text>to</text>
        </lyric>
        <lyric number="2">
          <syllabic>end</syllabic>
          <text>ia</text>
        </lyric>
      </note>
    </measure>
    <measure number="2">
      <print new-system="yes"/>
      <harmony>
        <root>
          <root-step>E</root-step>
        </root>
        <kind>minor-seventh</kind>
      </harmony>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>2</duration>
        <lyric number="1">
          <syllabic>single</syllabic>
          <text>nuo</text>
        </lyric>
      </note>
      <harmony>
        <root>
          <root-step>C</root-step>
        </root>
        <kind>major</kind>
        <degree>
          <degree-value>9</degree-value>
          <degree-alter>0</degree-alter>
          <degree-type>add</degree-type>
        </degree>
      </harmony>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>2</duration>
        <lyric number="1">
          <syllabic>single</syllabic>
          <text>vo</text>
        </lyric>
      </note>
    </measure>
  </part>
</score-partwise>`;

describe('MusicXML & Finale .musx importer', () => {
  vitestIt('parses Finale-style MusicXML with metadata, harmonies and multi-verse lyrics', () => {
    const result = parseMusicXmlToChordPro(SAMPLE_FINALE_MUSICXML, {
      targetNotation: 'italian',
    });

    expect(result.detectedTitle).toBe('Canto di Prova Finale');
    expect(result.detectedAuthor).toBe('Autore Demo');
    expect(result.detectedKey).toBe('Sol');
    expect(result.detectedTimeSignature).toBe('4/4');
    expect(result.detectedTempoBpm).toBe(84);
    expect(result.warnings).toEqual([]);
    expect(result.detectedChordLines).toBeGreaterThanOrEqual(2);
    expect(result.chordpro).toContain('{title: Canto di Prova Finale}');
    expect(result.chordpro).toContain('{key: Sol}');
    expect(result.chordpro).toContain('{start_of_verse: Strofa 1}');
    expect(result.chordpro).toContain('[Sol]Ec co [Re/Fa#]canto');
    expect(result.chordpro).toContain('[Mim7]nuo [Doadd9]vo');
    expect(result.chordpro).toContain('{start_of_verse: Strofa 2}');
    expect(result.chordpro).toContain('[Sol]O ra [Re/Fa#]gioia');
  });

  vitestIt('extracts compressed .mxl archives via META-INF/container.xml', async () => {
    const zip = new JSZip();
    zip.file(
      'META-INF/container.xml',
      '<?xml version="1.0" encoding="UTF-8"?><container><rootfiles><rootfile full-path="score.musicxml"/></rootfiles></container>',
    );
    zip.file('score.musicxml', SAMPLE_FINALE_MUSICXML);

    const mxlBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    const result = await importSongFromMusicXmlArrayBuffer(mxlBuffer, 'brano.mxl', {
      targetNotation: 'english',
    });

    expect(result.detectedTitle).toBe('Canto di Prova Finale');
    expect(result.detectedKey).toBe('G');
    expect(result.chordpro).toContain('[G]Ec co [D/F#]canto');
  });

  vitestIt('rejects Finale .musx files with FINALE_MUSX_UNSUPPORTED error', async () => {
    const dummyBuffer = new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer;

    await expect(
      importSongFromMusicXmlArrayBuffer(dummyBuffer, 'partitura.musx'),
    ).rejects.toMatchObject({
      code: 'FINALE_MUSX_UNSUPPORTED',
    } satisfies Partial<MusicXmlImportError>);

    // Also detects a renamed Finale ZIP containing score.dat
    const finaleZip = new JSZip();
    finaleZip.file('score.dat', 'binary-enigma-payload');
    const renamedBuffer = await finaleZip.generateAsync({ type: 'arraybuffer' });

    await expect(
      importSongFromMusicXmlArrayBuffer(renamedBuffer, 'partitura.mxl'),
    ).rejects.toMatchObject({
      code: 'FINALE_MUSX_UNSUPPORTED',
    } satisfies Partial<MusicXmlImportError>);
  });

  vitestIt('rejects malformed or non-MusicXML files cleanly', () => {
    expect(() => parseMusicXmlToChordPro('<html><body>not musicxml</body></html>')).toThrowError(
      MusicXmlImportError,
    );
    expect(() => parseMusicXmlToChordPro('<not-closed')).toThrowError(MusicXmlImportError);
  });
});
