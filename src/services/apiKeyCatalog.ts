import type { UiStrings } from '../constants/translations';
import type { ApiKeyProvider } from './preferences';

export interface ApiKeyAuxiliaryField {
  placeholder: string;
  required?: boolean;
}

export interface ApiKeyProviderSpec {
  id: ApiKeyProvider;
  createKeyUrl: string;
  keyPlaceholder: string;
  auxiliary?: ApiKeyAuxiliaryField;
  extraAuxiliary?: ApiKeyAuxiliaryField;
}

export interface ApiKeyProviderCopy {
  title: string;
  description: string;
  inputLabel: string;
  helpTitle: string;
  helpSteps: readonly [string, string, string];
  createKeyLabel: string;
  securityNotice?: string;
  auxiliaryLabel?: string;
  auxiliaryHint?: string;
  extraAuxiliaryLabel?: string;
  extraAuxiliaryHint?: string;
}

/** Add a new API by appending a spec here, then wiring copy + saved values. */
export const API_KEY_PROVIDERS: readonly ApiKeyProviderSpec[] = [
  {
    id: 'gemini',
    createKeyUrl: 'https://aistudio.google.com/app/apikey',
    keyPlaceholder: 'AIzaSy...',
  },
  {
    id: 'openai',
    createKeyUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'azure',
    createKeyUrl: 'https://portal.azure.com/#create/Microsoft.CognitiveServicesTextTranslation',
    keyPlaceholder: 'Azure Translator key',
    auxiliary: { placeholder: 'koreacentral' },
  },
  {
    id: 'azureSpeech',
    createKeyUrl:
      'https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/~/SpeechServices',
    keyPlaceholder: 'Azure Speech key',
    auxiliary: { placeholder: 'eastus', required: true },
    extraAuxiliary: { placeholder: 'my-speech-resource' },
  },
];

export function getApiKeyProviderCopy(
  id: ApiKeyProvider,
  t: UiStrings
): ApiKeyProviderCopy {
  switch (id) {
    case 'openai':
      return {
        title: t.settings.openAiApiKey,
        description: t.settings.openAiApiDescription,
        inputLabel: t.settings.openAiApiInputLabel,
        helpTitle: t.settings.openAiHowToGetKey,
        helpSteps: [
          t.settings.openAiApiStep1,
          t.settings.openAiApiStep2,
          t.settings.openAiApiStep3,
        ],
        createKeyLabel: t.settings.createOpenAiKey,
        securityNotice: t.settings.openAiTokenNotice,
      };
    case 'azure':
      return {
        title: t.settings.azureApiKey,
        description: t.settings.azureApiDescription,
        inputLabel: t.settings.azureApiInputLabel,
        helpTitle: t.settings.azureHowToGetKey,
        helpSteps: [
          t.settings.azureApiStep1,
          t.settings.azureApiStep2,
          t.settings.azureApiStep3,
        ],
        createKeyLabel: t.settings.createAzureKey,
        securityNotice: t.settings.azureTokenNotice,
        auxiliaryLabel: t.settings.azureRegion,
        auxiliaryHint: t.settings.azureRegionHint,
      };
    case 'azureSpeech':
      return {
        title: t.settings.azureSpeechApiKey,
        description: t.settings.azureSpeechApiDescription,
        inputLabel: t.settings.azureSpeechApiInputLabel,
        helpTitle: t.settings.azureSpeechHowToGetKey,
        helpSteps: [
          t.settings.azureSpeechApiStep1,
          t.settings.azureSpeechApiStep2,
          t.settings.azureSpeechApiStep3,
        ],
        createKeyLabel: t.settings.createAzureSpeechKey,
        securityNotice: t.settings.azureSpeechTokenNotice,
        auxiliaryLabel: t.settings.azureSpeechRegion,
        auxiliaryHint: t.settings.azureSpeechRegionHint,
        extraAuxiliaryLabel: t.settings.azureSpeechResource,
        extraAuxiliaryHint: t.settings.azureSpeechResourceHint,
      };
    default:
      return {
        title: t.settings.apiKey,
        description: t.settings.geminiApiDescription,
        inputLabel: t.settings.apiInputLabel,
        helpTitle: t.settings.howToGetKey,
        helpSteps: [t.settings.apiStep1, t.settings.apiStep2, t.settings.apiStep3],
        createKeyLabel: t.settings.createKey,
      };
  }
}
