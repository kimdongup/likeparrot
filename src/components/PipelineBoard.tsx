import { memo, useMemo } from 'react';
import { Activity, Cpu, Volume2, ArrowRight, Mic, Sliders } from 'lucide-react';
import type {
  PipelineStatus,
  PipelineSelections,
  Stage1Option,
  Stage2Option,
  Stage3Option,
} from '../types';
import { getPipelineCombinationGuide } from '../services/pipelineGuide';

interface PipelineBoardProps {
  pipeline: PipelineStatus;
  selections: PipelineSelections;
  onSelectionChange: (selections: PipelineSelections) => void;
  isListening: boolean;
  isSpeaking: boolean;
}

export const PipelineBoard = memo(function PipelineBoard({
  pipeline,
  selections,
  onSelectionChange,
  isListening,
  isSpeaking,
}: PipelineBoardProps) {
  const combinationGuide = useMemo(
    () => getPipelineCombinationGuide(selections),
    [selections]
  );

  const handleStage1Change = (val: Stage1Option) => {
    onSelectionChange({ ...selections, stage1: val });
  };

  const handleStage2Change = (val: Stage2Option) => {
    onSelectionChange({ ...selections, stage2: val });
  };

  const handleStage3Change = (val: Stage3Option) => {
    onSelectionChange({ ...selections, stage3: val });
  };

  const engineColor = useMemo(() => {
    switch (pipeline.engineType) {
      case 'chrome_nano':
        return 'from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-300';
      case 'gemini_stream':
        return 'from-indigo-500/20 to-purple-500/10 border-indigo-500/40 text-indigo-300';
      case 'network_fallback':
        return 'from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-300';
      default:
        return 'from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-300';
    }
  }, [pipeline.engineType]);

  return (
    <div lang="ko" className="pipeline-board w-full bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl space-y-3.5 [[data-theme=light]_&]:bg-white [[data-theme=light]_&]:border-slate-200">
      {/* Background Cyber Grid Glow */}
      <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-500/5 via-pink-500/5 to-transparent pointer-events-none" />

      {/* Header bar of Ticker */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700/80 font-mono font-semibold text-slate-200">
            <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>글먼저 · 파이프라인</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded-md">
            <Sliders className="w-3 h-3 text-pink-400" />
            <span>입력 · 번역 · 읽기 방식을 조합하세요</span>
          </div>
        </div>

        {/* Latency Indicator */}
        <div className="flex items-center gap-2 font-mono">
          <span className="text-slate-400 text-[11px]">STT 확정→번역 완료:</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-xs font-bold text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{pipeline.latencyMs > 0 ? `${pipeline.latencyMs} ms` : '준비 완료'}</span>
          </div>
        </div>
      </div>

      {/* Pipeline 3-Stage Cards with Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative">
        {/* Stage 1: Input (STT) */}
        <div
          className={`flex flex-col gap-2 p-3.5 rounded-xl border transition-all ${
            isListening
              ? 'bg-rose-950/30 border-rose-500/50 shadow-lg shadow-rose-950/20'
              : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-rose-300">
              <Mic className="w-3.5 h-3.5 text-rose-400" />
              <span>Stage 1: 음성 입력 (STT)</span>
            </div>
            <span className="w-5 h-5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-bold flex items-center justify-center">
              1
            </span>
          </div>

          <select
            aria-label="음성 인식 종결 감지 방식"
            value={selections.stage1}
            onChange={(e) => handleStage1Change(e.target.value as Stage1Option)}
            disabled={isListening}
            className="min-h-11 w-full bg-slate-950 border border-slate-700/90 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-100 focus:outline-none focus:border-rose-500 transition-all cursor-pointer"
          >
            <option value="webspeech_fast">⚡ WebSpeech API (600ms 초고속 감지)</option>
            <option value="webspeech_std">⏱️ WebSpeech API (1000ms 표준 감지)</option>
          </select>

          <p className="text-[11px] text-slate-400 truncate">
            {pipeline.stt}
          </p>
        </div>

        {/* Arrow 1 */}
        <div className="hidden sm:flex absolute left-[32.8%] top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 text-slate-600 pointer-events-none">
          <ArrowRight className="w-4 h-4 text-indigo-400 animate-pulse" />
        </div>

        {/* Stage 2: Engine */}
        <div
          className={`flex flex-col gap-2 p-3.5 rounded-xl border bg-gradient-to-r ${engineColor} transition-all shadow-md`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-indigo-300">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Stage 2: 번역 엔진</span>
            </div>
            <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold flex items-center justify-center">
              2
            </span>
          </div>

          <select
            aria-label="번역 엔진"
            value={selections.stage2}
            onChange={(e) => handleStage2Change(e.target.value as Stage2Option)}
            disabled={isListening}
            className="min-h-11 w-full bg-slate-950 border border-slate-700/90 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-100 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="auto">🤖 자동 최적 라우팅 (Smart Fallback)</option>
            <option value="chrome_nano">⚡ Chrome 내장 Translator (온디바이스)</option>
            <option value="gemini_stream">🌊 Gemini 3.5 Flash-Lite (실시간 스트림)</option>
            <option value="turbo_fastpath">🌐 네트워크 번역 폴백</option>
          </select>

          <p className="text-[11px] font-medium text-slate-200 truncate">
            {pipeline.engine}
          </p>
        </div>

        {/* Arrow 2 */}
        <div className="hidden sm:flex absolute left-[66.2%] top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 text-slate-600 pointer-events-none">
          <ArrowRight className="w-4 h-4 text-pink-400 animate-pulse" />
        </div>

        {/* Stage 3: Output (TTS) */}
        <div
          className={`flex flex-col gap-2 p-3.5 rounded-xl border transition-all ${
            isSpeaking
              ? 'bg-violet-950/30 border-violet-500/50 shadow-lg shadow-violet-950/20'
              : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-violet-300">
              <Volume2 className="w-3.5 h-3.5 text-violet-400" />
              <span>Stage 3: 음성 출력 (TTS)</span>
            </div>
            <span className="w-5 h-5 rounded-md bg-violet-500/20 text-violet-300 text-[10px] font-bold flex items-center justify-center">
              3
            </span>
          </div>

          <select
            aria-label="음성 출력 방식"
            value={selections.stage3}
            onChange={(e) => handleStage3Change(e.target.value as Stage3Option)}
            disabled={isListening}
            className="min-h-11 w-full bg-slate-950 border border-slate-700/90 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-100 focus:outline-none focus:border-violet-500 transition-all cursor-pointer"
          >
            <option value="tts_pipelined">🔊 완성 구절 즉시 큐 (스트림 지원 시)</option>
            <option value="tts_standard">🔊 전체 문장 완료 후 재생 (Standard TTS)</option>
          </select>

          <p className="text-[11px] text-slate-400 truncate">
            {pipeline.tts}
          </p>
        </div>
      </div>

      {(selections.stage2 === 'auto' || pipeline.engineType === 'network_fallback') && (
        <p className="text-[11px] text-amber-300/90 px-1" role="note">
          자동 모드는 필요하면 네트워크 폴백을 사용합니다. 이 경우 음성에서 변환된 원문이 외부 번역 서비스로 전송됩니다.
        </p>
      )}

      <details className="group relative rounded-xl border border-slate-800 bg-slate-900/65 open:border-indigo-500/30">
        <summary className="min-h-11 cursor-pointer select-none list-none px-3 py-2.5 flex items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-xl [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-indigo-300">이 조합이 적합한 상황</span>
            <span className="block truncate text-xs text-slate-300 mt-0.5">{combinationGuide.summary}</span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-lg leading-none text-slate-400 transition-transform group-open:rotate-45">+</span>
        </summary>

        <dl className="border-t border-slate-800 px-3 py-3 grid grid-cols-1 sm:grid-cols-[6rem_1fr] gap-x-3 gap-y-2.5 text-[11px] leading-relaxed" aria-live="polite">
          <dt className="font-semibold text-emerald-300">추천 상황</dt>
          <dd className="text-slate-300">{combinationGuide.situation}</dd>

          <dt className="font-semibold text-cyan-300">속도</dt>
          <dd className="text-slate-300">{combinationGuide.speed}</dd>

          <dt className="font-semibold text-violet-300">정확성·듣기</dt>
          <dd className="text-slate-300">{combinationGuide.accuracy}</dd>

          <dt className="font-semibold text-sky-300">오프라인·개인정보</dt>
          <dd className="text-slate-300">{combinationGuide.privacy}</dd>

          <dt className="font-semibold text-amber-300">필요 조건</dt>
          <dd className="text-slate-300">{combinationGuide.requirements}</dd>

          <dt className="font-semibold text-rose-300">주의</dt>
          <dd className="text-slate-300">{combinationGuide.caution}</dd>
        </dl>
      </details>
    </div>
  );
});
