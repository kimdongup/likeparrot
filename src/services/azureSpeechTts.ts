import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

const TARGET_VOICES: Record<string, string> = {
  ko: 'ko-KR-SunHiNeural',
  en: 'en-US-JennyNeural',
  ja: 'ja-JP-NanamiNeural',
  'zh-TW': 'zh-TW-HsiaoChenNeural',
  zh: 'zh-CN-XiaoxiaoNeural',
  es: 'es-ES-ElviraNeural',
  fr: 'fr-FR-DeniseNeural',
  de: 'de-DE-KatjaNeural',
  vi: 'vi-VN-HoaiMyNeural',
};

const toVoiceKey = (languageCode: string): string => {
  if (languageCode.toLowerCase().startsWith('zh-tw') || languageCode.toLowerCase() === 'zh-hant') {
    return 'zh-TW';
  }
  if (languageCode.toLowerCase().startsWith('zh')) return 'zh';
  return languageCode.split('-')[0] ?? languageCode;
};

export const synthesizeAzureSpeech = (
  text: string,
  languageCode: string,
  apiKey: string,
  region: string
): Promise<ArrayBuffer> => new Promise((resolve, reject) => {
  const cleanText = text.trim();
  const cleanKey = apiKey.trim();
  const cleanRegion = region.trim();
  if (!cleanText || !cleanKey || !cleanRegion) {
    reject(new Error('Azure Speech TTS requires text, a key, and a region.'));
    return;
  }

  const speechConfig = sdk.SpeechConfig.fromSubscription(cleanKey, cleanRegion);
  speechConfig.speechSynthesisVoiceName = TARGET_VOICES[toVoiceKey(languageCode)] ??
    TARGET_VOICES.en;
  speechConfig.speechSynthesisOutputFormat =
    sdk.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm;
  const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

  synthesizer.speakTextAsync(
    cleanText,
    (result) => {
      synthesizer.close();
      if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted && result.audioData) {
        resolve(result.audioData);
        return;
      }
      reject(new Error(result.errorDetails || 'Azure Speech TTS did not return audio.'));
    },
    (error) => {
      synthesizer.close();
      reject(new Error(String(error)));
    }
  );
});
