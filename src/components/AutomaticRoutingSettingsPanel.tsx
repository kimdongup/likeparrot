import { CheckCircle2, Cloud, HardDrive, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import type { UiStrings } from '../constants/translations';
import type {
  AutomaticRoutingPreference,
  CloudTranslationProvider,
} from '../services/preferences';

type ActionResult = boolean | void | Promise<boolean | void>;

interface AutomaticRoutingSettingsPanelProps {
  preference: AutomaticRoutingPreference;
  geminiConfigured: boolean;
  azureConfigured: boolean;
  t: UiStrings;
  onChange: (preference: AutomaticRoutingPreference) => ActionResult;
}

export function AutomaticRoutingSettingsPanel({
  preference,
  geminiConfigured,
  azureConfigured,
  t,
  onChange,
}: AutomaticRoutingSettingsPanelProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const providerConfigured: Record<CloudTranslationProvider, boolean> = {
    gemini: geminiConfigured,
    azure: azureConfigured,
  };

  const updatePreference = async (nextPreference: AutomaticRoutingPreference) => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveFailed(false);
    try {
      const result = await onChange(nextPreference);
      if (result === false) setSaveFailed(true);
    } catch {
      setSaveFailed(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFallbackChange = (allowCloudFallback: boolean) => {
    let preferredCloudProvider = preference.preferredCloudProvider;
    if (allowCloudFallback && !providerConfigured[preferredCloudProvider]) {
      if (geminiConfigured) preferredCloudProvider = 'gemini';
      else if (azureConfigured) preferredCloudProvider = 'azure';
    }
    void updatePreference({ allowCloudFallback, preferredCloudProvider });
  };

  const providers = [
    { id: 'gemini' as const, label: t.settings.geminiApi, configured: geminiConfigured },
    { id: 'azure' as const, label: t.settings.azureApi, configured: azureConfigured },
  ];

  return (
    <section aria-labelledby="automatic-routing-heading" className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-indigo-400" aria-hidden="true" />
          <h3 id="automatic-routing-heading" className="text-base font-bold">
            {t.settings.automaticRouting}
          </h3>
        </div>
        <p className="mt-1.5 text-sm leading-5 text-slate-400 [[data-theme=light]_&]:text-slate-600">
          {t.settings.automaticRoutingDescription}
        </p>
      </div>

      <div className="flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
        <HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400 [[data-theme=light]_&]:text-emerald-700" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-emerald-200 [[data-theme=light]_&]:text-emerald-900">
            {t.settings.onDeviceFirst}
          </p>
          <p className="mt-1 text-xs leading-5 text-emerald-100/70 [[data-theme=light]_&]:text-emerald-900/70">
            {t.settings.onDeviceFirstDescription}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-950/40 [[data-theme=light]_&]:border-slate-300 [[data-theme=light]_&]:bg-slate-50">
        <label className="flex min-h-14 cursor-pointer items-center gap-3 px-3.5 py-3">
          <input
            type="checkbox"
            role="switch"
            checked={preference.allowCloudFallback}
            disabled={isSaving}
            onChange={(event) => handleFallbackChange(event.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="relative h-6 w-11 shrink-0 rounded-full bg-slate-700 transition after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-indigo-600 peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-400 peer-disabled:opacity-60 [[data-theme=light]_&]:bg-slate-300"
          />
          <span className="min-w-0">
            <span className="block text-sm font-bold text-slate-100 [[data-theme=light]_&]:text-slate-900">
              {t.settings.allowCloudFallback}
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-400 [[data-theme=light]_&]:text-slate-600">
              {t.settings.allowCloudFallbackDescription}
            </span>
          </span>
        </label>

        <fieldset className="border-t border-slate-800 px-3.5 py-3 [[data-theme=light]_&]:border-slate-200">
          <legend className="px-1 text-xs font-bold text-slate-300 [[data-theme=light]_&]:text-slate-700">
            {t.settings.preferredCloudProvider}
          </legend>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {providers.map(({ id, label, configured }) => {
              const selected = preference.preferredCloudProvider === id;
              return (
                <label
                  key={id}
                  className={`flex min-h-12 items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition ${
                    configured
                      ? 'cursor-pointer border-slate-700 text-slate-200 hover:border-slate-500 [[data-theme=light]_&]:border-slate-300 [[data-theme=light]_&]:text-slate-800'
                      : 'cursor-not-allowed border-slate-800 text-slate-500 opacity-70 [[data-theme=light]_&]:border-slate-200 [[data-theme=light]_&]:text-slate-500'
                  } ${selected && configured ? 'border-indigo-500 bg-indigo-500/10 [[data-theme=light]_&]:border-indigo-500' : ''}`}
                >
                  <input
                    type="radio"
                    name="preferred-cloud-provider"
                    value={id}
                    checked={selected}
                    disabled={!configured || isSaving}
                    onChange={() => void updatePreference({
                      ...preference,
                      preferredCloudProvider: id,
                    })}
                    className="h-5 w-5 shrink-0 accent-indigo-500"
                  />
                  <span className="min-w-0 flex-1 font-semibold">{label}</span>
                  {configured ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 [[data-theme=light]_&]:text-emerald-700" aria-hidden="true" />
                  ) : (
                    <span className="text-[11px] font-medium leading-4 text-amber-300 [[data-theme=light]_&]:text-amber-800">
                      {t.settings.providerUnavailable}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="flex gap-2 rounded-xl bg-sky-500/10 p-3 text-xs leading-5 text-sky-200 [[data-theme=light]_&]:text-sky-900">
        <Cloud className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>{t.settings.cloudFallbackPrivacyNotice}</p>
      </div>

      {saveFailed && (
        <p role="alert" className="text-sm font-semibold text-rose-400 [[data-theme=light]_&]:text-rose-700">
          {t.settings.storageError}
        </p>
      )}
    </section>
  );
}
