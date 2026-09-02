const LEGACY_PIPELINE_LABELS: ReadonlyArray<readonly [string, string]> = [
  ['Chrome 내장 Translator', 'Chrome built-in Translator'],
  ['네트워크 번역 폴백', 'Network translation fallback'],
  ['실시간 스트리밍', 'live streaming'],
];

/** Keep persisted labels from older releases out of the English-only interface. */
export const normalizePipelineTag = (pipelineTag?: string): string | undefined => {
  const trimmedTag = pipelineTag?.trim();
  if (!trimmedTag) return undefined;

  return LEGACY_PIPELINE_LABELS.reduce(
    (label, [legacyText, englishText]) => label.replaceAll(legacyText, englishText),
    trimmedTag
  );
};
