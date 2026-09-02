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
    webspeech_fast: '빠른 감지',
    webspeech_std: '안정 감지',
  } satisfies Record<Stage1Option, string>,
  stage2: {
    auto: '자동 선택',
    chrome_nano: 'Chrome 온디바이스',
    gemini_stream: 'Gemini 스트림',
    turbo_fastpath: '네트워크 폴백',
  } satisfies Record<Stage2Option, string>,
  stage3: {
    tts_pipelined: '구절 즉시 읽기',
    tts_standard: '전체 문장 읽기',
  } satisfies Record<Stage3Option, string>,
};

const ENGINE_GUIDE: Record<Stage2Option, Pick<
  PipelineCombinationGuide,
  'situation' | 'privacy' | 'requirements' | 'caution'
>> = {
  auto: {
    situation: '기기 지원 여부나 네트워크 상태가 달라 어느 엔진이 좋을지 먼저 정하기 어려울 때 편합니다.',
    privacy: 'Chrome 번역이 가능하면 번역 단계는 기기에서 처리하지만, 그렇지 않으면 Gemini 또는 외부 네트워크 번역으로 원문이 전송될 수 있습니다.',
    requirements: 'Web Speech와 브라우저 TTS가 필요합니다. Chrome 번역 모델, Gemini API 키, 네트워크 폴백 중 사용 가능한 경로를 자동으로 찾습니다.',
    caution: '실제로 선택된 엔진에 따라 속도·품질·데이터 처리 위치가 달라집니다. 현재 엔진 표시를 확인하세요.',
  },
  chrome_nano: {
    situation: '지원되는 데스크톱 Chrome에서 개인정보 보호와 반복 학습의 짧은 응답 시간을 우선할 때 좋습니다.',
    privacy: '번역 단계는 다운로드된 모델로 기기 안에서 처리됩니다. 다만 Web Speech STT의 서버 사용 여부는 브라우저와 운영체제 구현에 따라 다릅니다.',
    requirements: 'Chrome 내장 Translator를 지원하는 데스크톱 Chrome과 선택한 언어 쌍의 모델 다운로드가 필요합니다.',
    caution: '모든 브라우저·모바일 기기·언어 쌍에서 제공되지는 않으며, 첫 모델 준비에는 다운로드 시간이 들 수 있습니다.',
  },
  gemini_stream: {
    situation: '문맥, 관용 표현, 자연스러운 번역이 중요한 자유 회화나 긴 문장을 연습할 때 적합합니다.',
    privacy: '음성에서 변환된 원문이 번역을 위해 Gemini API로 전송되므로 완전한 오프라인 모드는 아닙니다.',
    requirements: '유효한 Gemini API 키와 안정적인 네트워크 연결이 필요합니다.',
    caution: '네트워크 지연·API 할당량의 영향을 받으며, 중요한 표현은 원문과 번역을 함께 확인하는 편이 안전합니다.',
  },
  turbo_fastpath: {
    situation: 'Chrome 내장 번역을 쓸 수 없고 Gemini API 키도 없을 때 사용하는 임시·호환성 경로입니다.',
    privacy: '원문이 Google Translate 또는 MyMemory 등의 외부 번역 서비스로 전송되며 오프라인에서는 동작하지 않습니다.',
    requirements: 'API 키는 필요 없지만 외부 번역 서비스에 연결할 수 있는 네트워크가 필요합니다.',
    caution: '공식 가용성 보장이 없는 폴백이므로 응답 품질과 속도가 일정하지 않고, 민감한 내용에는 권장하지 않습니다.',
  },
};

const ENGINE_SPEED: Record<Stage2Option, string> = {
  auto: '번역 속도는 자동으로 선택된 엔진과 준비 상태에 따라 달라집니다.',
  chrome_nano: '언어 모델 준비가 끝난 뒤에는 네트워크 왕복 없이 빠르게 번역합니다.',
  gemini_stream: '번역 결과를 스트리밍으로 받아 전체 결과 전에도 구절을 사용할 수 있습니다.',
  turbo_fastpath: '외부 서비스의 연결 및 응답 속도에 따라 지연 폭이 큽니다.',
};

const ENGINE_ACCURACY: Record<Stage2Option, string> = {
  auto: '번역 품질은 실제 선택된 엔진에 따르며 실행 때마다 달라질 수 있습니다.',
  chrome_nano: '일상적인 짧은 문장에 유용하며 품질은 언어 쌍과 내려받은 모델에 따라 다릅니다.',
  gemini_stream: '문맥과 자연스러운 표현에 유리하지만 의역이나 누락 가능성은 남아 있습니다.',
  turbo_fastpath: '간단한 문장에 적합하고, 긴 문맥·관용 표현에서는 결과가 불안정할 수 있습니다.',
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
        ? '짧고 분명한 문장을 빠르게 확정하고, 완성된 번역 구절부터 듣는 회화·여행 롤플레이와 즉답 훈련'
        : mayStreamPartialTranslation
          ? '짧고 분명한 문장을 빠르게 확정하고, 실제 선택 엔진이 지원하면 번역 구절부터 듣는 회화·즉답 훈련'
          : '짧고 분명한 문장을 빠르게 확정해 완성된 번역을 곧바로 듣는 회화·여행 롤플레이와 즉답 훈련'
      : '짧은 발화는 빨리 확정하되 번역문 전체를 자연스럽게 듣는 문장 단위 따라 말하기'
    : isPipelinedOutput
      ? streamsPartialTranslation
        ? '말 사이에 잠깐 쉬거나 길게 말하는 학습자가, 완성된 번역 구절부터 먼저 듣는 수업·인터뷰 연습'
        : mayStreamPartialTranslation
          ? '말 사이에 잠깐 쉬거나 길게 말하고, 실제 선택 엔진이 지원하면 번역 구절부터 듣는 수업·인터뷰 연습'
          : '말 사이에 잠깐 쉬거나 길게 말한 뒤, 완성된 번역을 곧바로 듣는 수업·인터뷰 연습'
      : '긴 문장과 신중한 발화를 끝까지 받은 뒤 완성된 문장으로 듣는 발표·정확도 중심 학습';

  const inputSpeed = isFastInput
    ? '말끝의 무음이 약 600ms 이어지면 발화를 확정합니다.'
    : '말끝의 무음을 약 1000ms 확인하므로 빠른 감지보다 약 400ms 더 기다립니다.';
  const inputAccuracy = isFastInput
    ? '짧고 또렷한 발화에 적합하지만, 문장 중간의 긴 쉼을 말끝으로 오인할 수 있습니다.'
    : '천천히 말하거나 문장 중간에 쉬어도 조기 분할이 줄어듭니다.';
  const outputSpeed = !isPipelinedOutput
    ? '번역문 전체가 완성된 뒤 읽기 때문에 첫 음성은 늦지만 흐름이 안정적입니다.'
    : streamsPartialTranslation
      ? 'Gemini가 완성한 번역 구절부터 TTS 큐에 넣으므로 전체 번역이 끝나기 전에 첫 음성을 시작할 수 있습니다.'
      : mayStreamPartialTranslation
        ? '자동 선택이 Gemini 스트림을 사용하면 완성 구절부터 읽습니다. Chrome 내장·네트워크 엔진이 선택되면 전체 결과를 받은 뒤 읽어 표준 읽기와 시작 시점이 거의 같습니다.'
        : '선택한 번역 엔진은 중간 구절을 보내지 않으므로 전체 결과를 받은 뒤 TTS 큐에 넣습니다. 이 조합에서는 표준 읽기와 첫 음성 시점이 거의 같습니다.';
  const outputAccuracy = !isPipelinedOutput
    ? '전체 문맥이 확정된 문장을 한 번에 읽어 억양과 문장 흐름이 더 자연스럽습니다.'
    : streamsPartialTranslation || mayStreamPartialTranslation
      ? '번역 정확도는 바꾸지 않지만 Gemini 스트림을 사용할 때는 구절 경계에서 억양이 끊길 수 있습니다.'
      : '전체 번역문을 한 번에 받는 엔진이라 문장 흐름은 표준 읽기와 비슷합니다.';
  const engine = ENGINE_GUIDE[stage2];
  const outputCaution = isPipelinedOutput && !streamsPartialTranslation
    ? mayStreamPartialTranslation
      ? '구절 즉시 읽기의 속도 이점은 자동 경로가 실제로 Gemini 스트림을 선택했을 때만 생깁니다.'
      : '이 엔진은 중간 번역을 스트리밍하지 않아 구절 즉시 읽기의 속도 이점이 없습니다.'
    : '';

  return {
    summary: `${STAGE_LABELS.stage1[stage1]} · ${STAGE_LABELS.stage2[stage2]} · ${STAGE_LABELS.stage3[stage3]}`,
    situation: `${conversationProfile}에 알맞습니다. ${engine.situation}`,
    speed: `${inputSpeed} ${ENGINE_SPEED[stage2]} ${outputSpeed}`,
    accuracy: `${inputAccuracy} ${ENGINE_ACCURACY[stage2]} ${outputAccuracy}`,
    privacy: engine.privacy,
    requirements: engine.requirements,
    caution: `${engine.caution}${outputCaution ? ` ${outputCaution}` : ''}`,
  };
};
