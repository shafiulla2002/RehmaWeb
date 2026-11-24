'use client';

import { useState } from 'react';

interface Props {
  lyrics: string;
  chords?: string;
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_MAP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
};

function transposeChord(chord: string, semitones: number): string {
  return chord.replace(/([A-G][#b]?)/g, (match) => {
    const normalized = FLAT_MAP[match] || match;
    const idx = NOTES.indexOf(normalized);
    if (idx === -1) return match;
    const newIdx = (idx + semitones + 120) % 12;
    return NOTES[newIdx];
  });
}

function transposeText(text: string, semitones: number): string {
  if (semitones === 0) return text;
  // Transpose bracketed chords e.g. [C], [Am], [G/B]
  let result = text.replace(/\[([A-G][#b]?[^\]]*)\]/g, (_, c) => `[${transposeChord(c, semitones)}]`);
  // Also transpose standalone chords if not in brackets
  if (!text.includes('[')) {
    result = result.replace(
      /\b([A-G][#b]?(?:m|maj7|min|dim|aug|sus[24]?|[245679]|add9)?(?:\/[A-G][#b]?)?)\b/g,
      (match) => transposeChord(match, semitones)
    );
  }
  return result;
}

export function SongLyricsViewer({ lyrics, chords }: Props) {
  const [view, setView] = useState<'lyrics' | 'chords'>('lyrics');
  const [fontSize, setFontSize] = useState(16);
  const [semitones, setSemitones] = useState(0);

  const displayedContent = view === 'lyrics' ? lyrics : (chords ? transposeText(chords, semitones) : lyrics);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-gray-100 flex-wrap">
        <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
          <button
            type="button"
            onClick={() => setView('lyrics')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              view === 'lyrics'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Lyrics
          </button>
          {chords && (
            <button
              type="button"
              onClick={() => setView('chords')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                view === 'chords'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Chords &amp; Sheet
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Key Transposition Control (Feature 19) */}
          {view === 'chords' && (
            <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md border border-gray-200 text-xs text-gray-700">
              <span className="text-[11px] font-semibold text-gray-500 mr-1">Key:</span>
              <button
                type="button"
                onClick={() => setSemitones((prev) => prev - 1)}
                className="w-5 h-5 rounded bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center font-bold text-gray-700"
                title="Transpose down 1 semitone"
              >
                -
              </button>
              <span className="font-mono font-bold min-w-[28px] text-center text-blue-700">
                {semitones > 0 ? `+${semitones}` : semitones}
              </span>
              <button
                type="button"
                onClick={() => setSemitones((prev) => prev + 1)}
                className="w-5 h-5 rounded bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center font-bold text-gray-700"
                title="Transpose up 1 semitone"
              >
                +
              </button>
              {semitones !== 0 && (
                <button
                  type="button"
                  onClick={() => setSemitones(0)}
                  className="text-[10px] text-gray-400 hover:text-gray-600 ml-1 underline"
                >
                  Reset
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
            <span className="text-[11px]">A-</span>
            <input
              type="range"
              min={12}
              max={28}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-16 accent-blue-600 cursor-pointer"
            />
            <span className="text-sm font-bold">A+</span>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      <pre
        className="whitespace-pre-wrap font-sans leading-relaxed text-gray-800 transition-all overflow-x-auto"
        style={{ fontSize: `${fontSize}px` }}
      >
        {displayedContent}
      </pre>
    </div>
  );
}
