# LikeParrot

말한 내용을 듣고 목표 언어로 번역해 읽어 주며, 원문과 번역문을 터미널형 스크립트로 기록하는 PWA입니다. 이제 첫 화면은 하나이며, 입력·번역·음성 출력·기록 저장까지 포함한 **완전한 워크플로** 중 하나를 고르는 구조입니다.

## 워크플로

| 워크플로 | 경로 | 처리 흐름 | 적합한 상황 |
| --- | --- | --- | --- |
| **자동 경로 선택** | `/` | 기기와 브라우저 기능, 저장된 API 키, 클라우드 대체 설정을 확인해 가능한 워크플로 하나를 선택 | 사용자가 매번 조합을 판단하지 않아도 되는 기본 경로 |
| **실시간 오디오** | `/` | Gemini Live WebSocket 또는 OpenAI Realtime WebRTC → 번역 음성 + 입·출력 전사 | 첫 음성이 중요한 실시간 회화 |
| **데스크탑 텍스트** | `/` | 데스크탑 Web Speech → 원문 먼저 저장 → Chrome 기기 내 번역 또는 Gemini/Azure 텍스트 번역 → 기본 TTS | 원문과 번역문을 확인하며 학습하는 경우 |
| **모바일 키보드** | `/` | 모바일 기본 키보드 받아쓰기 또는 입력 → 원문 먼저 저장 → Gemini/Azure 텍스트 번역 → 기본 TTS | 모바일 Chrome/Safari에서 말끝 감지가 불안정할 때 |
| **요금 안내** | `/billingplan` | 실제 앱 경로별 시간·음성 비율 → 예상 USD/KRW 비용 | 공급자·무료 대안·안전장치 비교 |

`/all_in_one`은 이전 버전 링크 호환을 위해 `/`로 자동 이동합니다.

### 실시간 오디오 워크플로

엔진 선택 메뉴에서 Gemini 3.5 Live Translate 또는 OpenAI `gpt-realtime-translate`를 고릅니다. 두 엔진 모두 마이크 오디오를 보내고 번역 음성을 바로 받아 재생하므로 Web Speech STT, REST 번역, 브라우저 TTS를 별도 단계로 거치지 않습니다. 서버에서 받은 입력·출력 전사는 같은 터미널형 스크립트에 기록됩니다.

Live Translate는 목표 언어를 설정하고 입력 언어를 자동 감지합니다. 화면의 입력 언어 선택값은 사용자가 기대하는 언어와 기록 메타데이터에 사용됩니다.

연결에는 세션 재개와 컨텍스트 압축을 요청합니다. 서버의 `GoAway`가 오면 현재 재생을 안전하게 마친 뒤 최신 재개 핸들로 연결합니다. 입력 전사가 늦게 도착해 다음 기록과 잘못 합쳐질 가능성이 있으면 원문 누락을 표시하고 새 세션 경계를 만듭니다.

OpenAI 경로는 브라우저 WebRTC를 사용합니다. 설정에 넣은 개인 키는 같은 출처의 `/api/openai-translation-session` 함수가 60초짜리 client secret으로 교환하며, Realtime 연결에는 이 임시 secret만 전달합니다. 소스 기록을 위해 `gpt-realtime-whisper` 입력 전사도 함께 사용합니다. 확인된 공식 통역 모델만 제공하며, 공식 모델 목록에 없는 `gpt-live-1`·`gpt-live-1-mini` 이름은 메뉴에 넣지 않습니다.

### 텍스트 워크플로

다음 조합을 별도 드롭다운 단계가 아니라 완전한 워크플로 목록으로 표시합니다. 사용할 수 없는 조합은 화면에 남겨 두되 선택할 수 없으며, 필요한 브라우저 기능 또는 API 키를 함께 보여 줍니다.

- **데스크탑 Chrome 기기 내 번역 - 빠름:** 듣는 동안 인식을 유지하고, 짧은 `uh` 쉼은 무시한 뒤 약 1.2초 공백에서 문장 2~3개를 원문 저장·Chrome Translator·기록으로 넘김. 번역문은 기록을 눌러 읽음
- **데스크탑 Chrome 기기 내 번역 - 안정형:** 같은 경로이며 공백만 약 1.5초, 문장 3~4개 정도를 모음
- **데스크탑 Web Speech + Gemini 3.5 Flash-Lite:** 원문 저장 후 Gemini 텍스트 번역, 기본 TTS
- **데스크탑 Web Speech + Azure AI Translator:** 원문 저장 후 Azure 텍스트 번역, 기본 TTS
- **모바일 키보드 받아쓰기 + Gemini 3.5 Flash-Lite:** 사용자가 키보드 마이크로 텍스트를 만든 뒤 Gemini 번역, 기본 TTS
- **모바일 키보드 받아쓰기 + Azure AI Translator:** 사용자가 키보드 마이크로 텍스트를 만든 뒤 Azure 번역, 기본 TTS

텍스트 워크플로는 번역 전에 원문 기록을 먼저 저장하고, 같은 기록의 상태만 `번역 중`, `실패`, `완료`로 갱신합니다. 따라서 번역 실패나 세션 중단이 있어도 사용자가 말한 원문은 사라지지 않습니다.

자동 경로 선택은 데스크탑 Chrome 기기 내 번역을 우선합니다. 클라우드 대체는 설정에서 명시적으로 켜야만 자동 선택에 포함되며, 단순히 API 키를 저장했다고 해서 자동으로 원문이 네트워크 제공자에게 전송되지는 않습니다. 모바일에서는 PWA가 OS 받아쓰기를 직접 시작할 수 없으므로 실제 텍스트 입력칸을 보여 주고, 사용자가 키보드 마이크 또는 타이핑으로 만든 텍스트만 앱이 처리합니다.

## 터미널형 스크립트

기록은 카드 대신 원문(`<`)과 번역문(`>`)이 이어지는 터미널형 텍스트로 표시됩니다. 새 전사와 스트리밍 번역은 아래쪽에 실시간으로 나타나며, 사용자가 과거 기록을 읽는 동안에는 스크롤 위치를 강제로 이동하지 않습니다.

- 데스크톱: 기록 근처에 마우스를 올리거나 키보드 포커스를 두면 세부 정보와 동작이 나타납니다.
- 모바일: 기록을 탭하면 세부 정보와 동작이 열리고, 다시 탭하면 닫힙니다.
- 세부 정보: 언어 쌍, 기록 시각, 사용한 파이프라인, 번역 지연을 표시합니다.
- 동작: 기본 브라우저 TTS로 번역문 읽기·정지, 번역문 복사, 개별 삭제를 지원합니다.

스크립트는 IndexedDB에 최대 500개까지 기기 로컬로 저장되며 개별 삭제와 전체 삭제를 지원합니다.

## 독립 HTML로 저장

제목줄의 저장 버튼은 현재 스크립트를 `likeparrot-transcript-날짜-시간.html` 형식의 독립 HTML 파일로 내려받습니다. 저장 파일에는 원문, 번역문, 언어, 시각, 파이프라인과 지연 정보가 포함됩니다.

내려받은 HTML은 앱이나 API 키 없이도 브라우저에서 열 수 있습니다. 기록을 hover하거나 원문을 클릭·탭해 세부 정보를 열 수 있고, 번역문을 클릭하거나 **읽기**를 선택하면 해당 기기의 기본 TTS로 재생합니다. 정지와 복사도 지원하며, 화면은 운영체제의 밝게/어둡게 설정을 따릅니다.

## 설정과 첫 실행

제목줄의 설정 버튼에서 다음 항목을 관리합니다.

- **API 키:** Google AI Studio로 이동하는 발급 안내, 키 보기·숨기기, 저장과 삭제
- **OpenAI API 키:** OpenAI 키 발급 안내와 GPT Realtime용 임시 client secret 교환
- **API 키 저장 범위:** 기본값은 현재 탭의 `sessionStorage`이며, **이 기기에 API 키 기억하기**를 선택하면 `localStorage`에도 저장
- **화면 테마:** 밝게, 어둡게, 시스템 설정 중 선택하고 브라우저에 저장

API 키가 없어도 첫 화면은 바로 열립니다. 키가 필요한 워크플로는 목록에 보이지만 선택할 수 없고, 필요한 Gemini, OpenAI, Azure API 키를 설정에서 저장하라는 안내가 표시됩니다.

> **주의:** `sessionStorage`와 `localStorage`는 암호화된 비밀 저장소가 아닙니다. **이 기기에 기억하기**는 개인 기기에서만 사용하고, 공유 기기에서는 키를 저장하지 마세요.

## 모바일 최적화

- 좁은 화면에서 파이프라인과 컨트롤을 한 열로 배치합니다.
- 설정을 스크롤 가능한 하단 시트로 열고, 터치 동작 버튼은 최소 44px 크기를 유지합니다.
- hover가 없는 기기에서는 탭으로 기록의 정보와 버튼을 표시합니다.
- `dvh`와 safe-area 여백을 사용해 주소창·노치·홈 인디케이터와 겹치지 않도록 합니다.
- 입력 요소는 모바일 브라우저의 의도하지 않은 자동 확대를 줄이도록 구성했습니다.

## 로컬 실행

```bash
npm install
npm run dev
```

마이크와 AudioWorklet에는 보안 컨텍스트가 필요합니다. 개발 서버는 자체 서명 HTTPS를 사용하므로 브라우저에서 인증서를 한 번 허용해야 할 수 있습니다.

### 데스크탑 Chrome 글먼저 검증 (가상 마이크)

Web Speech는 파일 입력을 받지 않습니다. 스피커로 틀고 마이크로 다시 듣는 방식은 통화가 중간에 빠지므로, **BlackHole처럼 출력과 입력을 같은 가상 장치로 묶은 뒤 파일을 재생**해 검증합니다.

1. macOS에 BlackHole 2ch를 설치하고 시스템 입력·출력을 `BlackHole 2ch`로 둡니다.
2. 데스크톱 Chrome에서 `https://localhost:5173/`을 열고 모국어를 영어, 워크플로를 Chrome 기기 내 빠름 또는 안정형으로 고릅니다.
3. 시작을 누른 뒤 같은 기기로 테스트 오디오를 재생합니다.
4. 끝나면 입력·출력을 원래 마이크·스피커로 되돌립니다.

성공 기준은 SRT 줄 수나 고유명사 완전 일치가 아니라, 본론이 중간에 끊기지 않고 빠름/안정형이 쉼 길이만 다르게 묶이는지입니다.

```bash
npm run lint
npm run build
npm run preview
```

일반 `npm run dev`는 프런트엔드와 기존 번역 프록시만 실행합니다. OpenAI Realtime까지 로컬에서 시험할 때는 Vercel CLI의 `vercel dev`로 프런트엔드와 `/api/openai-translation-session` 함수를 함께 실행하세요.

## API 키와 운영 보안

개인용 BYOK 환경에서는 설정에 입력한 Gemini API 키를 Google 요청에 사용하고, OpenAI 키는 같은 출처 서버리스 함수에 보내 임시 WebRTC client secret으로 교환합니다. 두 표준 키 모두 탭 또는 사용자가 선택한 기기 브라우저 저장소에 있으므로 XSS, 브라우저 확장 프로그램, 공유 프로필과 개발자 도구에 노출될 수 있습니다. 운영자가 하나의 공용 키를 제공하는 다중 사용자 서비스의 인증 방식으로 그대로 사용하면 안 됩니다.

공용 키 방식의 운영 환경에서는 비밀키를 서버 환경 변수에만 두고 사용자 인증과 rate limit을 추가해야 합니다. Gemini는 백엔드가 [Live 임시 토큰(ephemeral token)](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens)을 발급하고 모델·언어·세션 설정을 제한하도록 구성하세요. 일반 Gemini 번역도 서버 측 자격 증명을 사용하는 프록시로 옮기는 것을 권장합니다.

## 브라우저와 배포 참고사항

- 실시간 오디오 워크플로에는 `getUserMedia`와 HTTPS가 필요합니다. Gemini 엔진에는 WebSocket·Web Audio API·Gemini 키가, OpenAI 엔진에는 WebRTC·서버리스 token 교환 경로·OpenAI 키가 필요합니다.
- 데스크탑 텍스트 워크플로의 음성 입력에는 Web Speech Recognition 지원 브라우저가 필요하고, 기록 읽기에는 Web Speech Synthesis 지원이 필요합니다.
- 모바일 텍스트 워크플로는 PWA가 모바일 받아쓰기를 직접 제어하지 않고, 사용자가 OS 키보드의 마이크로 만든 텍스트를 입력값으로 받습니다.
- Chrome 내장 Translator는 지원되는 데스크톱 Chrome과 언어 쌍에서만 동작합니다. 첫 실행 시 언어 모델 다운로드가 필요할 수 있습니다.
- 마이크 기능을 배포할 때는 반드시 HTTPS를 사용하세요. `localhost`를 제외한 HTTP 환경에서는 마이크와 AudioWorklet이 차단될 수 있습니다.
- 현재 빌드는 `/sw.js`, `/assets/*` 같은 절대 URL을 사용하므로 도메인의 루트 경로에 배포해야 합니다. `/`, `/all_in_one`, `/billingplan` 직접 진입은 `/index.html`로 rewrite하되 `/api/*`는 서버리스 함수로 남겨야 합니다.
- 텍스트 워크플로의 지연값은 원문이 확정된 시점부터 번역 완료 시점까지입니다. 브라우저 TTS 큐 대기와 실제 발화 시작 시간은 포함하지 않습니다.

## 코드 구성

UI 컴포넌트는 렌더링과 사용자 입력을 담당하고, 재사용 가능한 동작은 서비스 계층에 분리했습니다.

- `src/components/TranscriptTerminal.tsx`: 터미널형 기록 UI와 접근 가능한 상호작용
- `src/components/SettingsModal.tsx`: API 키·테마 설정 UI
- `src/components/BillingPlanPage.tsx`: 요금 분석 화면
- `src/components/WorkflowPicker.tsx`: 완전한 워크플로 선택 UI
- `src/components/MobileDictationComposer.tsx`: 모바일 키보드 받아쓰기/텍스트 입력 UI
- `src/hooks/useLikeParrotController.ts`: 화면과 분리된 앱 상태·라우팅·음성 워크플로 조정
- `src/services/geminiLiveSocket.ts`: Gemini Live WebSocket·오디오 세션
- `src/services/openAiRealtimeTranslation.ts`: OpenAI WebRTC 통역 세션
- `src/services/costEstimator.ts`: 공급자별 순수 비용 계산 로직
- `src/services/workflowProfiles.ts`: 워크플로 조합, 요구 기능, 자동 경로 선택 규칙
- `src/services/workflowPresentation.ts`: 워크플로 표시 문구와 다국어 설명
- `src/services/preferences.ts`: API 키와 테마 저장 정책
- `src/services/transcriptExport.ts`: 독립 HTML 생성과 다운로드
