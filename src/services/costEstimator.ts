import { VOICE_PRICING } from '../data/voicePricing';

export interface CostEstimatorInput {
  sessionHours: number;
  inputAudioPercent: number;
  translatedOutputPercent: number;
  localCurrencyPerUsd: number;
}

export type CostEstimateId =
  | 'text-first-browser'
  | 'text-first-gemini'
  | 'gemini-live-translate'
  | 'openai-realtime-translate'
  | 'google-cloud-pipeline';

export type EstimateKind = 'listed' | 'estimated' | 'no-direct-api-charge';

export interface CostComponent {
  id:
    | 'input-audio'
    | 'output-audio'
    | 'translation-audio'
    | 'input-transcription'
    | 'stt'
    | 'translation'
    | 'browser';
  usdLow: number;
  usdHigh: number;
}

export interface CostEstimate {
  id: CostEstimateId;
  kind: EstimateKind;
  usdLow: number;
  usdHigh: number;
  localCurrencyLow: number;
  localCurrencyHigh: number;
  usdPerSessionHourLow: number;
  usdPerSessionHourHigh: number;
  components: readonly CostComponent[];
}

export interface CostEstimatorResult {
  normalized: CostEstimatorInput;
  inputAudioHours: number;
  translatedOutputHours: number;
  estimates: readonly CostEstimate[];
}

const DEFAULT_INPUT: CostEstimatorInput = {
  sessionHours: 1,
  inputAudioPercent: 100,
  translatedOutputPercent: 100,
  localCurrencyPerUsd: 1,
};

const finiteOr = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalizeInput = (input: CostEstimatorInput): CostEstimatorInput => ({
  sessionHours: clamp(finiteOr(input.sessionHours, DEFAULT_INPUT.sessionHours), 0, 10_000),
  inputAudioPercent: clamp(
    finiteOr(input.inputAudioPercent, DEFAULT_INPUT.inputAudioPercent),
    0,
    100
  ),
  translatedOutputPercent: clamp(
    finiteOr(input.translatedOutputPercent, DEFAULT_INPUT.translatedOutputPercent),
    0,
    200
  ),
  localCurrencyPerUsd: clamp(
    finiteOr(input.localCurrencyPerUsd, DEFAULT_INPUT.localCurrencyPerUsd),
    0,
    1_000_000
  ),
});

const createEstimate = (
  id: CostEstimateId,
  kind: EstimateKind,
  sessionHours: number,
  localCurrencyPerUsd: number,
  components: readonly CostComponent[]
): CostEstimate => {
  const usdLow = components.reduce((sum, component) => sum + component.usdLow, 0);
  const usdHigh = components.reduce((sum, component) => sum + component.usdHigh, 0);
  const safeSessionHours = sessionHours > 0 ? sessionHours : 1;

  return {
    id,
    kind,
    usdLow,
    usdHigh,
    localCurrencyLow: usdLow * localCurrencyPerUsd,
    localCurrencyHigh: usdHigh * localCurrencyPerUsd,
    usdPerSessionHourLow: usdLow / safeSessionHours,
    usdPerSessionHourHigh: usdHigh / safeSessionHours,
    components,
  };
};

/**
 * Pure list-price estimator. It deliberately excludes taxes, network traffic,
 * server hosting, retries, cached/context text tokens, and promotional credits.
 */
export const estimateVoiceCosts = (input: CostEstimatorInput): CostEstimatorResult => {
  const normalized = normalizeInput(input);
  const inputAudioHours = normalized.sessionHours * normalized.inputAudioPercent / 100;
  const translatedOutputHours = inputAudioHours * normalized.translatedOutputPercent / 100;
  const audioTokensPerHour = VOICE_PRICING.geminiLive.audioTokensPerSecond * 60 * 60;

  const geminiInputUsd = inputAudioHours
    * audioTokensPerHour
    * VOICE_PRICING.geminiLive.inputAudioUsdPerMillionTokens
    / 1_000_000;
  const geminiOutputUsd = translatedOutputHours
    * audioTokensPerHour
    * VOICE_PRICING.geminiLive.outputAudioUsdPerMillionTokens
    / 1_000_000;

  const openAiTranslationUsd = inputAudioHours
    * 60
    * VOICE_PRICING.openAiRealtimeTranslate.translationAudioUsdPerMinute;
  const openAiInputTranscriptionUsd = inputAudioHours
    * 60
    * VOICE_PRICING.openAiRealtimeTranslate.optionalInputTranscriptionUsdPerMinute;

  const googleSttUsd = inputAudioHours
    * 60
    * VOICE_PRICING.googleCloudPipeline.speechToTextV2UsdPerMinute;
  const googleTranslationUsdLow = inputAudioHours
    * VOICE_PRICING.googleCloudPipeline.flashLiteTranslationUsdPerInputHourLow;
  const googleTranslationUsdHigh = inputAudioHours
    * VOICE_PRICING.googleCloudPipeline.flashLiteTranslationUsdPerInputHourHigh;

  const estimates: CostEstimate[] = [
    createEstimate(
      'text-first-browser',
      'no-direct-api-charge',
      normalized.sessionHours,
      normalized.localCurrencyPerUsd,
      [{ id: 'browser', usdLow: 0, usdHigh: 0 }]
    ),
    createEstimate(
      'text-first-gemini',
      'estimated',
      normalized.sessionHours,
      normalized.localCurrencyPerUsd,
      [
        {
          id: 'translation',
          usdLow: googleTranslationUsdLow,
          usdHigh: googleTranslationUsdHigh,
        },
        { id: 'browser', usdLow: 0, usdHigh: 0 },
      ]
    ),
    createEstimate(
      'google-cloud-pipeline',
      'estimated',
      normalized.sessionHours,
      normalized.localCurrencyPerUsd,
      [
        { id: 'stt', usdLow: googleSttUsd, usdHigh: googleSttUsd },
        {
          id: 'translation',
          usdLow: googleTranslationUsdLow,
          usdHigh: googleTranslationUsdHigh,
        },
        { id: 'browser', usdLow: 0, usdHigh: 0 },
      ]
    ),
    createEstimate(
      'openai-realtime-translate',
      'listed',
      normalized.sessionHours,
      normalized.localCurrencyPerUsd,
      [
        { id: 'translation-audio', usdLow: openAiTranslationUsd, usdHigh: openAiTranslationUsd },
        {
          id: 'input-transcription',
          usdLow: openAiInputTranscriptionUsd,
          usdHigh: openAiInputTranscriptionUsd,
        },
      ]
    ),
    createEstimate(
      'gemini-live-translate',
      'listed',
      normalized.sessionHours,
      normalized.localCurrencyPerUsd,
      [
        { id: 'input-audio', usdLow: geminiInputUsd, usdHigh: geminiInputUsd },
        { id: 'output-audio', usdLow: geminiOutputUsd, usdHigh: geminiOutputUsd },
      ]
    ),
  ];

  return {
    normalized,
    inputAudioHours,
    translatedOutputHours,
    estimates,
  };
};

export const isRangeEstimate = (estimate: CostEstimate): boolean =>
  Math.abs(estimate.usdHigh - estimate.usdLow) > Number.EPSILON;
