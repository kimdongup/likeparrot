import type {
  PipelineSelections,
  Stage1Option,
  Stage2Option,
  Stage3Option,
} from '../types';

export interface PipelineCombinationGuide {
  summary: string;
  situation: string;
  speed: string;
  accuracy: string;
  privacy: string;
  requirements: string;
  caution: string;
}

const STAGE_LABELS = {
  stage1: {
    webspeech_fast: 'Fast detection',
    webspeech_std: 'Stable detection',
  } satisfies Record<Stage1Option, string>,
  stage2: {
    auto: 'Automatic routing',
    chrome_nano: 'Chrome on-device',
    gemini_stream: 'Gemini stream',
    turbo_fastpath: 'Network fallback',
  } satisfies Record<Stage2Option, string>,
  stage3: {
    tts_pipelined: 'Speak completed phrases',
    tts_standard: 'Speak the full sentence',
  } satisfies Record<Stage3Option, string>,
};

const ENGINE_GUIDE: Record<Stage2Option, Pick<
  PipelineCombinationGuide,
  'situation' | 'privacy' | 'requirements' | 'caution'
>> = {
  auto: {
    situation: 'Useful when device support and network conditions vary and you do not want to choose an engine in advance.',
    privacy: 'Translation stays on-device when Chrome Translator is available. Otherwise, the transcript may be sent to Gemini or an external translation service.',
    requirements: 'Requires Web Speech and browser TTS. It automatically finds an available path among Chrome Translator, Gemini with an API key, and the network fallback.',
    caution: 'Speed, quality, and data handling depend on the engine selected at runtime. Check the active engine indicator.',
  },
  chrome_nano: {
    situation: 'Best on supported desktop Chrome when privacy and low repeat-practice latency matter most.',
    privacy: 'Translation runs on the device with a downloaded model. Web Speech STT may still use a server depending on the browser and operating system.',
    requirements: 'Requires desktop Chrome with the built-in Translator API and a downloadable model for the selected language pair.',
    caution: 'It is not available on every browser, mobile device, or language pair, and the first model download can take time.',
  },
  gemini_stream: {
    situation: 'Good for free conversation and longer sentences where context, idioms, and natural phrasing matter.',
    privacy: 'The speech transcript is sent to the Gemini API for translation, so this is not a fully offline mode.',
    requirements: 'Requires a valid Gemini API key and a stable network connection.',
    caution: 'Network latency and API quotas apply. Review important phrases against the source transcript.',
  },
  turbo_fastpath: {
    situation: 'A temporary compatibility path when Chrome Translator is unavailable and there is no Gemini API key.',
    privacy: 'The transcript is sent to an external service such as Google Translate or MyMemory and does not work offline.',
    requirements: 'No API key is required, but the browser must be able to reach an external translation service.',
    caution: 'This fallback has no availability guarantee, so speed and quality can vary. Do not use it for sensitive content.',
  },
};

const ENGINE_SPEED: Record<Stage2Option, string> = {
  auto: 'Translation speed depends on the engine selected at runtime and whether that engine is ready.',
  chrome_nano: 'After the language model is ready, translation is fast and avoids a network round trip.',
  gemini_stream: 'Translation arrives as a stream, so completed phrases can be used before the full result is ready.',
  turbo_fastpath: 'Latency can vary widely with the external service connection and response time.',
};

const ENGINE_ACCURACY: Record<Stage2Option, string> = {
  auto: 'Translation quality follows the engine selected at runtime and can vary between sessions.',
  chrome_nano: 'Useful for short everyday sentences; quality depends on the language pair and downloaded model.',
  gemini_stream: 'Strong with context and natural phrasing, although paraphrases or omissions are still possible.',
  turbo_fastpath: 'Suitable for simple sentences but less reliable for long context and idiomatic language.',
};

/** Pure presentation-model builder for all 2 × 4 × 2 pipeline combinations. */
export const getPipelineCombinationGuide = (
  selections: PipelineSelections
): PipelineCombinationGuide => {
  const { stage1, stage2, stage3 } = selections;
  const isFastInput = stage1 === 'webspeech_fast';
  const isPipelinedOutput = stage3 === 'tts_pipelined';
  const streamsPartialTranslation = stage2 === 'gemini_stream';
  const mayStreamPartialTranslation = stage2 === 'auto';

  const conversationProfile = isFastInput
    ? isPipelinedOutput
      ? streamsPartialTranslation
        ? 'Fast confirmation of short, clear speech with immediate playback of completed phrases suits travel role-play and quick-response drills'
        : mayStreamPartialTranslation
          ? 'Fast confirmation of short, clear speech with early phrase playback when the selected engine supports streaming suits conversation drills'
          : 'Fast confirmation of short, clear speech followed by immediate playback of the complete translation suits travel role-play and response drills'
      : 'Fast confirmation of short speech followed by natural playback of the complete translation suits sentence-by-sentence shadowing'
    : isPipelinedOutput
      ? streamsPartialTranslation
        ? 'Stable endpoint detection with early playback of completed phrases suits lessons and interview practice with pauses or longer answers'
        : mayStreamPartialTranslation
          ? 'Stable endpoint detection with early phrase playback when available suits lessons and interview practice with pauses or longer answers'
          : 'Stable endpoint detection followed by immediate playback of the complete translation suits lessons and interview practice with longer answers'
      : 'Waiting for long or careful speech to finish before playing the complete sentence suits presentations and accuracy-focused study';

  const inputSpeed = isFastInput
    ? 'Speech is finalized after about 600ms of ending silence.'
    : 'Speech is finalized after about 1000ms of ending silence, roughly 400ms later than fast detection.';
  const inputAccuracy = isFastInput
    ? 'Works well for short, clear speech but may mistake a long mid-sentence pause for the end.'
    : 'Reduces premature splits when you speak slowly or pause within a sentence.';
  const outputSpeed = !isPipelinedOutput
    ? 'Playback starts after the entire translation is complete, so first audio is later but the flow is stable.'
    : streamsPartialTranslation
      ? 'Completed Gemini phrases enter the TTS queue immediately, allowing speech to start before the full translation finishes.'
      : mayStreamPartialTranslation
        ? 'Completed phrases play early when automatic routing selects Gemini streaming. Chrome and network engines play after the full result, much like standard output.'
        : 'This engine does not provide partial phrases, so TTS starts after the full result and offers little timing advantage over standard output.';
  const outputAccuracy = !isPipelinedOutput
    ? 'Speaking a complete sentence generally produces smoother prosody and sentence flow.'
    : streamsPartialTranslation || mayStreamPartialTranslation
      ? 'Translation accuracy is unchanged, but phrase boundaries can make prosody less continuous when Gemini streaming is used.'
      : 'Because this engine returns the full translation at once, sentence flow is similar to standard output.';
  const engine = ENGINE_GUIDE[stage2];
  const outputCaution = isPipelinedOutput && !streamsPartialTranslation
    ? mayStreamPartialTranslation
      ? 'Early phrase playback is faster only when automatic routing actually selects Gemini streaming.'
      : 'This engine does not stream partial translations, so phrase playback does not provide a speed advantage.'
    : '';

  return {
    summary: `${STAGE_LABELS.stage1[stage1]} · ${STAGE_LABELS.stage2[stage2]} · ${STAGE_LABELS.stage3[stage3]}`,
    situation: `${conversationProfile}. ${engine.situation}`,
    speed: `${inputSpeed} ${ENGINE_SPEED[stage2]} ${outputSpeed}`,
    accuracy: `${inputAccuracy} ${ENGINE_ACCURACY[stage2]} ${outputAccuracy}`,
    privacy: engine.privacy,
    requirements: engine.requirements,
    caution: `${engine.caution}${outputCaution ? ` ${outputCaution}` : ''}`,
  };
};
