import { memo } from 'react';
import { Radio } from 'lucide-react';
import { getUiStrings } from '../constants/translations';

interface AllInOneBannerProps {
  isListening: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  lastLatencyMs?: number;
  uiLanguageCode: string;
}

export const AllInOneBanner = memo(function AllInOneBanner({
  isListening,
  isConnecting,
  isSpeaking,
  lastLatencyMs,
  uiLanguageCode,
}: AllInOneBannerProps) {
  const t = getUiStrings(uiLanguageCode);

  return (
    <section lang={t.locale} aria-labelledby="sound-first-title" className="sound-first-banner w-full bg-gradient-to-r from-emerald-950/70 via-slate-900/90 to-teal-950/70 border border-emerald-500/40 rounded-2xl p-3 sm:p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl space-y-3">
      {/* Glow Effect */}
      <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-emerald-500/10 via-teal-500/5 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-emerald-500/20 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div id="sound-first-title" className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/90 border border-emerald-500/50 font-mono font-bold text-emerald-300">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>{t.modes.audioFirst} · Gemini Live</span>
          </div>

          <span className="text-[11px] text-emerald-200/80 hidden sm:inline">
            {t.audio.description}
          </span>
        </div>

        {/* Latency */}
        <div className="flex items-center gap-2 font-mono">
          {isConnecting && (
            <span aria-hidden="true" className="text-amber-300 text-[11px] animate-pulse">
              {t.common.connecting}
            </span>
          )}
          <span className="text-slate-400 text-[11px]">{t.audio.latencyLabel}</span>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-900 border border-emerald-500/40 text-xs font-bold text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{lastLatencyMs && lastLatencyMs > 0 ? `${lastLatencyMs} ms` : t.audio.liveSync}</span>
          </div>
        </div>
      </div>

      {/* Sequential Flow Diagram */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
        {/* Step 1 */}
        <div className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
          isListening ? 'bg-emerald-900/40 border-emerald-400 text-white animate-pulse' : 'bg-slate-900/80 border-slate-800 text-slate-300'
        }`}>
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-[11px]">
            1
          </div>
          <div className="truncate">
            <p className="text-[10px] text-emerald-400 font-semibold uppercase">{t.audio.voiceInput}</p>
            <p className="font-medium text-slate-100 truncate">{t.audio.pcmStream}</p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="p-2.5 rounded-xl border bg-slate-900/80 border-slate-800 text-slate-300 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center text-[11px]">
            2
          </div>
          <div className="truncate">
            <p className="text-[10px] text-teal-400 font-semibold uppercase">{t.audio.liveTranslation}</p>
            <p className="font-medium text-slate-100 truncate">{t.audio.speechTranslation}</p>
          </div>
        </div>

        {/* Step 3 */}
        <div className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
          isSpeaking ? 'bg-violet-900/40 border-violet-400 text-white animate-bounce' : 'bg-slate-900/80 border-slate-800 text-slate-300'
        }`}>
          <div className="w-6 h-6 rounded-lg bg-violet-500/20 text-violet-300 font-bold flex items-center justify-center text-[11px]">
            3
          </div>
          <div className="truncate">
            <p className="text-[10px] text-violet-400 font-semibold uppercase">{t.audio.instantOutput}</p>
            <p className="font-medium text-slate-100 truncate">{t.audio.translatedAudio}</p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="p-2.5 rounded-xl border bg-slate-900/80 border-slate-800 text-slate-300 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-pink-500/20 text-pink-300 font-bold flex items-center justify-center text-[11px]">
            4
          </div>
          <div className="truncate">
            <p className="text-[10px] text-pink-400 font-semibold uppercase">{t.audio.transcriptLog}</p>
            <p className="font-medium text-slate-100 truncate">{t.audio.textMetadata}</p>
          </div>
        </div>
      </div>
    </section>
  );
});
