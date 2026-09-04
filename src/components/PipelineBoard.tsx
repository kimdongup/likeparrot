import { memo, useMemo } from 'react';
import { Activity, Cpu, Volume2, ArrowRight, Mic, Sliders } from 'lucide-react';
import type {
  PipelineStatus,
  PipelineSelections,
  Stage1Option,
  Stage2Option,
  Stage3Option,
} from '../types';
import { getUiStrings } from '../constants/translations';
import { getPipelineCombinationGuide } from '../services/pipelineGuide';

interface PipelineBoardProps {
  pipeline: PipelineStatus;
  selections: PipelineSelections;
  onSelectionChange: (selections: PipelineSelections) => void;
  isListening: boolean;
  isSpeaking: boolean;
  uiLanguageCode: string;
}

export const PipelineBoard = memo(function PipelineBoard({
  pipeline,
  selections,
  onSelectionChange,
  isListening,
  isSpeaking,
  uiLanguageCode,
}: PipelineBoardProps) {
  const t = getUiStrings(uiLanguageCode);
  const combinationGuide = useMemo(
    () => getPipelineCombinationGuide(selections, uiLanguageCode),
    [selections, uiLanguageCode]
  );
  const sttStatus = selections.stage1 === 'webspeech_fast'
    ? t.pipeline.fastStatus
    : t.pipeline.stableStatus;
  const engineStatus = selections.stage2 === 'auto' && pipeline.latencyMs === 0
    ? t.pipeline.automaticRouting
    : pipeline.engineType === 'chrome_nano'
      ? t.pipeline.chromeTranslator
      : pipeline.engineType === 'bergamot'
        ? t.pipeline.bergamotTranslator
        : pipeline.engineType === 'gemini_stream'
          ? t.pipeline.geminiStream
          : t.pipeline.networkFallback;
  const ttsStatus = selections.stage3 === 'tts_pipelined'
    ? t.pipeline.phraseStatus
    : t.pipeline.sentenceStatus;

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
      case 'bergamot':
        return 'from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-300';
      case 'gemini_stream':
        return 'from-indigo-500/20 to-purple-500/10 border-indigo-500/40 text-indigo-300';
      case 'network_fallback':
        return 'from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-300';
      default:
        return 'from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-300';
    }
  }, [pipeline.engineType]);

  return (
    <div lang={t.locale} className="pipeline-board w-full bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl space-y-3.5 [[data-theme=light]_&]:bg-white [[data-theme=light]_&]:border-slate-200">
      {/* Background Cyber Grid Glow */}
      <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-500/5 via-pink-500/5 to-transparent pointer-events-none" />

      {/* Header bar of Ticker */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700/80 font-mono font-semibold text-slate-200">
            <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>{t.pipeline.title}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded-md">
            <Sliders className="w-3 h-3 text-pink-400" />
            <span>{t.pipeline.subtitle}</span>
          </div>
        </div>

        {/* Latency Indicator */}
        <div className="flex items-center gap-2 font-mono">
          <span className="text-slate-400 text-[11px]">{t.pipeline.latencyLabel}</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-xs font-bold text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{pipeline.latencyMs > 0 ? `${pipeline.latencyMs} ms` : t.common.ready}</span>
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
            <label htmlFor="pipeline-stage-1" className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-rose-300">
              <Mic className="w-3.5 h-3.5 text-rose-400" />
              <span>{t.pipeline.stage1Title}</span>
            </label>
            <span className="w-5 h-5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-bold flex items-center justify-center">
              1
            </span>
          </div>

          <select
            id="pipeline-stage-1"
            value={selections.stage1}
            onChange={(e) => handleStage1Change(e.target.value as Stage1Option)}
            disabled={isListening}
            className="min-h-11 w-full bg-slate-950 border border-slate-700/90 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-100 transition-all cursor-pointer focus-visible:outline-none focus-visible:border-rose-500 focus-visible:ring-2 focus-visible:ring-rose-500/50"
          >
            <option value="webspeech_fast">{t.pipeline.fastDetection}</option>
            <option value="webspeech_std">{t.pipeline.stableDetection}</option>
          </select>

          <p className="text-[11px] text-slate-400 truncate">
            {sttStatus}
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
            <label htmlFor="pipeline-stage-2" className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-indigo-300">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t.pipeline.stage2Title}</span>
            </label>
            <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold flex items-center justify-center">
              2
            </span>
          </div>

          <select
            id="pipeline-stage-2"
            value={selections.stage2}
            onChange={(e) => handleStage2Change(e.target.value as Stage2Option)}
            disabled={isListening}
            className="min-h-11 w-full bg-slate-950 border border-slate-700/90 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-100 transition-all cursor-pointer focus-visible:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/50"
          >
            <option value="auto">{t.pipeline.automaticRouting}</option>
            <option value="chrome_nano">{t.pipeline.chromeTranslator}</option>
            <option value="bergamot">{t.pipeline.bergamotTranslator}</option>
            <option value="gemini_stream">{t.pipeline.geminiStream}</option>
            <option value="turbo_fastpath">{t.pipeline.networkFallback}</option>
          </select>

          <p className="text-[11px] font-medium text-slate-200 truncate">
            {engineStatus}
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
            <label htmlFor="pipeline-stage-3" className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-violet-300">
              <Volume2 className="w-3.5 h-3.5 text-violet-400" />
              <span>{t.pipeline.stage3Title}</span>
            </label>
            <span className="w-5 h-5 rounded-md bg-violet-500/20 text-violet-300 text-[10px] font-bold flex items-center justify-center">
              3
            </span>
          </div>

          <select
            id="pipeline-stage-3"
            value={selections.stage3}
            onChange={(e) => handleStage3Change(e.target.value as Stage3Option)}
            disabled={isListening}
            className="min-h-11 w-full bg-slate-950 border border-slate-700/90 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-100 transition-all cursor-pointer focus-visible:outline-none focus-visible:border-violet-500 focus-visible:ring-2 focus-visible:ring-violet-500/50"
          >
            <option value="tts_pipelined">{t.pipeline.phrasePlayback}</option>
            <option value="tts_standard">{t.pipeline.sentencePlayback}</option>
          </select>

          <p className="text-[11px] text-slate-400 truncate">
            {ttsStatus}
          </p>
        </div>
      </div>

      {(selections.stage2 === 'auto' || pipeline.engineType === 'network_fallback') && (
        <p className="text-[11px] text-amber-300/90 px-1" role="note">
          {t.pipeline.fallbackNote}
        </p>
      )}

      <details className="group relative rounded-xl border border-slate-800 bg-slate-900/65 open:border-indigo-500/30">
        <summary className="min-h-11 cursor-pointer select-none list-none px-3 py-2.5 flex items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-xl [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-indigo-300">{t.pipeline.guideHeading}</span>
            <span className="block truncate text-xs text-slate-300 mt-0.5">{combinationGuide.summary}</span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-lg leading-none text-slate-400 transition-transform group-open:rotate-45">+</span>
        </summary>

        <dl className="border-t border-slate-800 px-3 py-3 grid grid-cols-1 sm:grid-cols-[6rem_1fr] gap-x-3 gap-y-2.5 text-[11px] leading-relaxed" aria-live="polite">
          <dt className="font-semibold text-emerald-300">{t.pipeline.bestFor}</dt>
          <dd className="text-slate-300">{combinationGuide.situation}</dd>

          <dt className="font-semibold text-cyan-300">{t.pipeline.speed}</dt>
          <dd className="text-slate-300">{combinationGuide.speed}</dd>

          <dt className="font-semibold text-violet-300">{t.pipeline.accuracy}</dt>
          <dd className="text-slate-300">{combinationGuide.accuracy}</dd>

          <dt className="font-semibold text-sky-300">{t.pipeline.privacy}</dt>
          <dd className="text-slate-300">{combinationGuide.privacy}</dd>

          <dt className="font-semibold text-amber-300">{t.pipeline.requirements}</dt>
          <dd className="text-slate-300">{combinationGuide.requirements}</dd>

          <dt className="font-semibold text-rose-300">{t.pipeline.caution}</dt>
          <dd className="text-slate-300">{combinationGuide.caution}</dd>
        </dl>
      </details>
    </div>
  );
});
