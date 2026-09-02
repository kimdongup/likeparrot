import { ENGLISH_UI } from './en';
import type { DeepPartial, UiStrings } from './types';

const mergeSection = <Section extends Record<string, string>>(
  base: Section,
  override?: DeepPartial<Section>
): Section => ({ ...base, ...override });

export const createLocale = (
  locale: string,
  override: DeepPartial<Omit<UiStrings, 'locale'>>
): UiStrings => ({
  locale,
  modes: mergeSection(ENGLISH_UI.modes, override.modes),
  common: mergeSection(ENGLISH_UI.common, override.common),
  header: mergeSection(ENGLISH_UI.header, override.header),
  controls: mergeSection(ENGLISH_UI.controls, override.controls),
  audio: mergeSection(ENGLISH_UI.audio, override.audio),
  pipeline: mergeSection(ENGLISH_UI.pipeline, override.pipeline),
  settings: mergeSection(ENGLISH_UI.settings, override.settings),
  transcript: mergeSection(ENGLISH_UI.transcript, override.transcript),
  errors: mergeSection(ENGLISH_UI.errors, override.errors),
});
