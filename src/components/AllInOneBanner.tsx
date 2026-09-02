import { memo } from 'react';
import { Radio } from 'lucide-react';

interface AllInOneBannerProps {
  isListening: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  lastLatencyMs?: number;
}

export const AllInOneBanner = memo(function AllInOneBanner({
  isListening,
  isConnecting,
  isSpeaking,
  lastLatencyMs,
}: AllInOneBannerProps) {
  return (
    <section lang="ko" aria-labelledby="sound-first-title" className="sound-first-banner w-full bg-gradient-to-r from-emerald-950/70 via-slate-900/90 to-teal-950/70 border border-emerald-500/40 rounded-2xl p-3 sm:p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl space-y-3">
      {/* Glow Effect */}
      <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-emerald-500/10 via-teal-500/5 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-emerald-500/20 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div id="sound-first-title" className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/90 border border-emerald-500/50 font-mono font-bold text-emerald-300">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>소리먼저 · Gemini Live</span>
          </div>

          <span className="text-[11px] text-emerald-200/80 hidden sm:inline">
            음성을 바로 번역 음성으로 스트리밍하고 대화를 스크립트에 기록합니다
          </span>
        </div>

        {/* Latency */}
        <div className="flex items-center gap-2 font-mono">
          {isConnecting && (
            <span aria-hidden="true" className="text-amber-300 text-[11px] animate-pulse">
              연결 중...
            </span>
          )}
          <span className="text-slate-400 text-[11px]">입력→첫 번역 출력:</span>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-900 border border-emerald-500/40 text-xs font-bold text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{lastLatencyMs && lastLatencyMs > 0 ? `${lastLatencyMs} ms` : '실시간 동기화'}</span>
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
            <p className="text-[10px] text-emerald-400 font-semibold uppercase">음성 입력</p>
            <p className="font-medium text-slate-100 truncate">16kHz PCM 스트림</p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="p-2.5 rounded-xl border bg-slate-900/80 border-slate-800 text-slate-300 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center text-[11px]">
            2
          </div>
          <div className="truncate">
            <p className="text-[10px] text-teal-400 font-semibold uppercase">AI 실시간 번역</p>
            <p className="font-medium text-slate-100 truncate">Live 음성 번역</p>
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
            <p className="text-[10px] text-violet-400 font-semibold uppercase">즉시 음성 출력</p>
            <p className="font-medium text-slate-100 truncate">24kHz 번역 음성</p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="p-2.5 rounded-xl border bg-slate-900/80 border-slate-800 text-slate-300 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-pink-500/20 text-pink-300 font-bold flex items-center justify-center text-[11px]">
            4
          </div>
          <div className="truncate">
            <p className="text-[10px] text-pink-400 font-semibold uppercase">스크립트 기록</p>
            <p className="font-medium text-slate-100 truncate">텍스트·메타데이터 저장</p>
          </div>
        </div>
      </div>
    </section>
  );
});
