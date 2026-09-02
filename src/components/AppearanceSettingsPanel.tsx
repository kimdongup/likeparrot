import { Monitor, Moon, Sun } from 'lucide-react';
import type { UiStrings } from '../constants/translations';
import type { ThemePreference } from '../services/preferences';

interface AppearanceSettingsPanelProps {
  theme: ThemePreference;
  t: UiStrings;
  onThemeChange: (theme: ThemePreference) => void;
}

export function AppearanceSettingsPanel({
  theme,
  t,
  onThemeChange,
}: AppearanceSettingsPanelProps) {
  const options = [
    { value: 'light' as const, label: t.settings.light, description: t.settings.lightDescription, Icon: Sun },
    { value: 'dark' as const, label: t.settings.dark, description: t.settings.darkDescription, Icon: Moon },
    { value: 'system' as const, label: t.settings.system, description: t.settings.systemDescription, Icon: Monitor },
  ];

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % options.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + options.length) % options.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = options.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    onThemeChange(options[nextIndex].value);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]
      ?.focus();
  };

  return (
    <section aria-labelledby="appearance-heading">
      <h3 id="appearance-heading" className="text-base font-bold">{t.settings.appearance}</h3>
      <div role="radiogroup" aria-labelledby="appearance-heading" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {options.map(({ value, label, description, Icon }, index) => {
          const selected = theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onThemeChange(value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`min-h-24 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                selected
                  ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200 [[data-theme=light]_&]:text-indigo-800'
                  : 'border-slate-700 bg-slate-950/40 text-slate-300 hover:border-slate-500 [[data-theme=light]_&]:border-slate-300 [[data-theme=light]_&]:bg-slate-50 [[data-theme=light]_&]:text-slate-700'
              }`}
            >
              <Icon className="mb-2 h-5 w-5" aria-hidden="true" />
              <span className="block text-sm font-bold">{label}</span>
              <span className="mt-1 block text-xs leading-4 opacity-70">{description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
