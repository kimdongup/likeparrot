import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import type {
  ChangeEvent,
  CompositionEvent,
  FormEvent,
  KeyboardEvent,
} from 'react';
import { Keyboard, Send, X } from 'lucide-react';

export interface MobileDictationComposerCopy {
  title: string;
  inputLabel: string;
  instructions: string;
  languageHintPrefix: string;
  placeholder: string;
  submit: string;
  submitting: string;
  clear: string;
  shortcutHint: string;
  characterCountLabel: string;
  emptyError: string;
  submitError: string;
}

export interface MobileDictationComposerProps {
  sourceLanguageCode: string;
  sourceLanguageName?: string;
  /** Supplying value makes the editor parent-controlled. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSubmit: (text: string) => Promise<void>;
  onSubmitError?: (error: unknown) => void;
  disabled?: boolean;
  maxLength?: number;
  clearOnSuccess?: boolean;
  dismissKeyboardOnSubmit?: boolean;
  copy?: Partial<MobileDictationComposerCopy>;
  className?: string;
}

const DEFAULT_COPY: MobileDictationComposerCopy = {
  title: 'Mobile keyboard dictation',
  inputLabel: 'Source text',
  instructions: 'Tap the field, then tap the microphone on your phone keyboard. Review the text before submitting.',
  languageHintPrefix: 'Use a keyboard configured for',
  placeholder: 'Dictate, type, or paste what you want to translate…',
  submit: 'Translate and speak',
  submitting: 'Translating…',
  clear: 'Clear',
  shortcutHint: 'On a hardware keyboard, press Ctrl/Command + Enter to submit.',
  characterCountLabel: 'characters',
  emptyError: 'Enter or dictate some text first.',
  submitError: 'The text could not be submitted. Your source text is still here.',
};

export const MobileDictationComposer = memo(function MobileDictationComposer({
  sourceLanguageCode,
  sourceLanguageName,
  value,
  defaultValue = '',
  onValueChange,
  onSubmit,
  onSubmitError,
  disabled = false,
  maxLength = 4_000,
  clearOnSuccess = true,
  dismissKeyboardOnSubmit = true,
  copy: copyOverrides,
  className = '',
}: MobileDictationComposerProps) {
  const copy = { ...DEFAULT_COPY, ...copyOverrides };
  const [localValue, setLocalValue] = useState(defaultValue);
  const [isComposing, setIsComposing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const instanceId = useId().replaceAll(':', '');
  const inputId = `${instanceId}-dictation-input`;
  const instructionsId = `${instanceId}-dictation-instructions`;
  const languageHintId = `${instanceId}-dictation-language-hint`;
  const shortcutId = `${instanceId}-dictation-shortcut`;
  const errorId = `${instanceId}-dictation-error`;
  const currentValue = value ?? localValue;
  const cleanValue = currentValue.trim();
  const isBusy = isSubmitting;
  const isSubmitDisabled = disabled || isBusy || isComposing || cleanValue.length === 0;

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const updateValue = useCallback((nextValue: string) => {
    if (value === undefined) setLocalValue(nextValue);
    onValueChange?.(nextValue);
    setLocalError(null);
  }, [onValueChange, value]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    updateValue(event.currentTarget.value);
  };

  const handleCompositionEnd = (event: CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    // Some mobile IMEs commit their final replacement only at compositionend.
    updateValue(event.currentTarget.value);
  };

  const submitCurrentValue = useCallback(async () => {
    if (disabled || isSubmitting || isComposing) return;
    const text = (textareaRef.current?.value ?? currentValue).trim();
    if (!text) {
      setLocalError(copy.emptyError);
      textareaRef.current?.focus();
      return;
    }

    setLocalError(null);
    setIsSubmitting(true);
    if (dismissKeyboardOnSubmit) textareaRef.current?.blur();
    try {
      await onSubmit(text);
      if (!mountedRef.current) return;
      if (clearOnSuccess) updateValue('');
    } catch (error) {
      if (!mountedRef.current) return;
      setLocalError(copy.submitError);
      onSubmitError?.(error);
    } finally {
      if (mountedRef.current) setIsSubmitting(false);
    }
  }, [
    clearOnSuccess,
    copy.emptyError,
    copy.submitError,
    currentValue,
    disabled,
    dismissKeyboardOnSubmit,
    isComposing,
    isSubmitting,
    onSubmit,
    onSubmitError,
    updateValue,
  ]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitCurrentValue();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === 'Enter' &&
      (event.ctrlKey || event.metaKey) &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void submitCurrentValue();
    }
  };

  const handleClear = () => {
    updateValue('');
    textareaRef.current?.focus();
  };

  const describedBy = [
    instructionsId,
    languageHintId,
    shortcutId,
    localError ? errorId : '',
  ].filter(Boolean).join(' ');

  return (
    <form
      onSubmit={handleSubmit}
      className={`mobile-dictation-composer min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-[var(--app-text)] shadow-xl sm:p-4 ${className}`.trim()}
      aria-labelledby={`${instanceId}-dictation-title`}
      aria-busy={isBusy}
    >
      <div className="flex items-start gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300 [[data-theme=light]_&]:text-indigo-700" aria-hidden="true">
          <Keyboard className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <h2 id={`${instanceId}-dictation-title`} className="text-sm font-bold sm:text-base">
            {copy.title}
          </h2>
          <p id={instructionsId} className="mt-0.5 text-xs leading-5 text-[var(--app-muted)]">
            {copy.instructions}
          </p>
        </span>
      </div>

      <label htmlFor={inputId} className="mt-3 block text-xs font-semibold">
        {copy.inputLabel}
      </label>
      <p id={languageHintId} className="mt-1 text-[11px] leading-4 text-[var(--app-muted)]">
        {copy.languageHintPrefix}{sourceLanguageName ? ` ${sourceLanguageName}` : ''}.
      </p>
      <textarea
        ref={textareaRef}
        id={inputId}
        lang={sourceLanguageCode}
        value={currentValue}
        onChange={handleChange}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={handleCompositionEnd}
        onKeyDown={handleKeyDown}
        disabled={disabled || isBusy}
        maxLength={maxLength}
        rows={4}
        inputMode="text"
        enterKeyHint="done"
        autoCapitalize="sentences"
        autoCorrect="on"
        spellCheck
        placeholder={copy.placeholder}
        aria-describedby={describedBy}
        aria-invalid={Boolean(localError)}
        className="mt-2 min-h-28 w-full resize-y rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-3 text-base leading-6 text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-60"
      />

      <div className="mt-1.5 flex min-w-0 items-start justify-between gap-3 text-[10px] leading-4 text-[var(--app-muted)]">
        <span id={shortcutId} className="min-w-0">{copy.shortcutHint}</span>
        <span className="shrink-0" aria-label={`${currentValue.length} ${copy.characterCountLabel}`}>
          {currentValue.length}/{maxLength}
        </span>
      </div>

      {localError && (
        <p id={errorId} role="alert" className="mt-2 text-xs font-medium leading-5 text-rose-400 [[data-theme=light]_&]:text-rose-700">
          {localError}
        </p>
      )}

      <span className="sr-only" role="status" aria-live="polite">
        {isBusy ? copy.submitting : ''}
      </span>

      <div className="mt-3 grid grid-cols-[minmax(5.5rem,0.32fr)_minmax(0,1fr)] gap-2">
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || isBusy || currentValue.length === 0}
          className="flex min-h-12 min-w-0 touch-manipulation items-center justify-center gap-1.5 rounded-xl border border-[var(--app-border)] px-2 text-xs font-semibold text-[var(--app-muted)] transition-colors hover:bg-slate-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{copy.clear}</span>
        </button>
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="flex min-h-12 min-w-0 touch-manipulation items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 px-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:from-slate-700 disabled:via-slate-700 disabled:to-slate-700 disabled:text-slate-400 disabled:shadow-none"
        >
          <Send className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words text-center">
            {isBusy ? copy.submitting : copy.submit}
          </span>
        </button>
      </div>
    </form>
  );
});
