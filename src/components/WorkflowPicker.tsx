import { memo, useId, useMemo } from 'react';
import { GitBranch, X } from 'lucide-react';
import type {
  WorkflowAvailability,
  WorkflowFlowStep,
  WorkflowGroup,
  WorkflowProfile,
  WorkflowProfileId,
} from '../services/workflowProfiles';
import { WORKFLOW_PROFILES } from '../services/workflowProfiles';

type StepLocation = WorkflowFlowStep['location'];

export interface WorkflowPickerCopy {
  title: string;
  description: string;
  groupLabels: Record<WorkflowGroup, string>;
  activeFlowTitle: string;
  automaticResolvedPrefix: string;
  requirementsLabel: string;
  availableLabel: string;
  unavailableLabel: string;
  selectedLabel: string;
  showFlowLabel: string;
  hideFlowLabel: string;
  closeLabel: string;
  useAutomaticLabel: string;
  usingAutomaticLabel: string;
  automaticBadge: string;
  locationLabels: Record<StepLocation, string>;
  profileLabels: Partial<Record<WorkflowProfileId, string>>;
  profileDescriptions: Partial<Record<WorkflowProfileId, string>>;
  profileRequirements: Partial<Record<WorkflowProfileId, readonly string[]>>;
  profileStepLabels: Partial<Record<WorkflowProfileId, readonly string[]>>;
  profileStepDetails: Partial<Record<WorkflowProfileId, readonly string[]>>;
  disabledReasons: Partial<Record<WorkflowProfileId, string>>;
}

export type WorkflowPickerCopyOverrides = Partial<Omit<
  WorkflowPickerCopy,
  'groupLabels' | 'locationLabels'
>> & {
  groupLabels?: Partial<Record<WorkflowGroup, string>>;
  locationLabels?: Partial<Record<StepLocation, string>>;
};

export interface WorkflowPickerProps {
  profiles?: readonly WorkflowProfile[];
  value: WorkflowProfileId;
  availability: Partial<Record<WorkflowProfileId, WorkflowAvailability>>;
  resolvedProfileId?: WorkflowProfileId | null;
  onChange: (id: WorkflowProfileId) => void;
  disabled?: boolean;
  copy?: WorkflowPickerCopyOverrides;
  className?: string;
  compact?: boolean;
  omitAutomatic?: boolean;
  isAutomatic?: boolean;
  flowProfileId?: WorkflowProfileId | null;
  onToggleFlow?: (id: WorkflowProfileId) => void;
}

const GROUP_ORDER: readonly WorkflowGroup[] = [
  'automatic',
  'live-audio',
  'desktop',
  'mobile',
];

const DEFAULT_COPY: WorkflowPickerCopy = {
  title: 'Choose a complete workflow',
  description: 'Each option includes input, translation, speech output, and transcript storage.',
  groupLabels: {
    automatic: 'Automatic',
    'live-audio': 'Live audio',
    desktop: 'Desktop text pipelines',
    mobile: 'Mobile keyboard pipelines',
  },
  activeFlowTitle: 'Active flow',
  automaticResolvedPrefix: 'Automatic selected',
  requirementsLabel: 'Requirements',
  availableLabel: 'Available',
  unavailableLabel: 'Unavailable',
  selectedLabel: 'Selected',
  showFlowLabel: 'Show full flow',
  hideFlowLabel: 'Hide full flow',
  closeLabel: 'Close workflow menu',
  useAutomaticLabel: 'Use automatic routing',
  usingAutomaticLabel: 'Automatic routing is on',
  automaticBadge: 'Auto',
  locationLabels: {
    device: 'Device',
    browser: 'Browser',
    network: 'Network',
    storage: 'Saved locally',
  },
  profileLabels: {},
  profileDescriptions: {},
  profileRequirements: {},
  profileStepLabels: {},
  profileStepDetails: {},
  disabledReasons: {},
};

const mergeCopy = (overrides?: WorkflowPickerCopyOverrides): WorkflowPickerCopy => ({
  ...DEFAULT_COPY,
  ...overrides,
  groupLabels: { ...DEFAULT_COPY.groupLabels, ...overrides?.groupLabels },
  locationLabels: { ...DEFAULT_COPY.locationLabels, ...overrides?.locationLabels },
  profileLabels: { ...DEFAULT_COPY.profileLabels, ...overrides?.profileLabels },
  profileDescriptions: {
    ...DEFAULT_COPY.profileDescriptions,
    ...overrides?.profileDescriptions,
  },
  profileRequirements: {
    ...DEFAULT_COPY.profileRequirements,
    ...overrides?.profileRequirements,
  },
  profileStepLabels: {
    ...DEFAULT_COPY.profileStepLabels,
    ...overrides?.profileStepLabels,
  },
  profileStepDetails: {
    ...DEFAULT_COPY.profileStepDetails,
    ...overrides?.profileStepDetails,
  },
  disabledReasons: { ...DEFAULT_COPY.disabledReasons, ...overrides?.disabledReasons },
});

const profileLabel = (profile: WorkflowProfile, copy: WorkflowPickerCopy): string =>
  copy.profileLabels[profile.id] ?? profile.label;

const profileDescription = (profile: WorkflowProfile, copy: WorkflowPickerCopy): string =>
  copy.profileDescriptions[profile.id] ?? profile.description;

const stepLabel = (
  profile: WorkflowProfile,
  step: WorkflowFlowStep,
  index: number,
  copy: WorkflowPickerCopy
): string => copy.profileStepLabels[profile.id]?.[index] ?? step.label;

const stepDetail = (
  profile: WorkflowProfile,
  step: WorkflowFlowStep,
  index: number,
  copy: WorkflowPickerCopy
): string => copy.profileStepDetails[profile.id]?.[index] ?? step.detail;

export function resolveWorkflowCopy(overrides?: WorkflowPickerCopyOverrides): WorkflowPickerCopy {
  return mergeCopy(overrides);
}

export function resolveActiveWorkflowProfile(
  profiles: readonly WorkflowProfile[],
  value: WorkflowProfileId,
  resolvedProfileId?: WorkflowProfileId | null
): { selectedProfile: WorkflowProfile; activeProfile: WorkflowProfile; resolvedProfile?: WorkflowProfile } {
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const selectedProfile = profileMap.get(value) ?? profiles[0];
  const resolvedProfile = value === 'auto' && resolvedProfileId
    ? profileMap.get(resolvedProfileId)
    : undefined;
  return {
    selectedProfile,
    resolvedProfile,
    activeProfile: resolvedProfile ?? selectedProfile,
  };
}

interface WorkflowActiveFlowProps {
  activeProfile: WorkflowProfile;
  copy: WorkflowPickerCopy;
  instanceId: string;
  automaticNote?: string;
  onClose?: () => void;
}

export function WorkflowActiveFlow({
  activeProfile,
  copy,
  instanceId,
  automaticNote,
  onClose,
}: WorkflowActiveFlowProps) {
  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-y-auto p-3 sm:p-4"
      aria-labelledby={`${instanceId}-active-flow-title`}
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3
            id={`${instanceId}-active-flow-title`}
            className="text-xs font-bold uppercase tracking-wider text-indigo-300 [[data-theme=light]_&]:text-indigo-700"
          >
            {copy.activeFlowTitle}
          </h3>
          <p className="mt-1 break-words text-sm font-semibold">
            {profileLabel(activeProfile, copy)}
          </p>
          {automaticNote && (
            <p className="mt-0.5 text-[11px] text-[var(--app-muted)]">{automaticNote}</p>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.hideFlowLabel}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] transition hover:bg-slate-500/10"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <ol className="mt-3 grid list-none grid-cols-1 gap-2 p-0">
        {activeProfile.steps.map((step, index) => (
          <li
            key={step.id}
            className="flex min-w-0 gap-2.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-2.5"
          >
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-500/15 text-[11px] font-bold text-indigo-300 [[data-theme=light]_&]:text-indigo-700"
            >
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="block break-words text-xs font-semibold">
                {stepLabel(activeProfile, step, index, copy)}
              </span>
              <span className="mt-0.5 block break-words text-[11px] leading-4 text-[var(--app-muted)]">
                {stepDetail(activeProfile, step, index, copy)}
              </span>
              <span className="mt-1 inline-block rounded bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--app-muted)]">
                {copy.locationLabels[step.location]}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-3 border-t border-[var(--app-border)] pt-3">
        <h4 className="text-[11px] font-bold text-[var(--app-muted)]">
          {copy.requirementsLabel}
        </h4>
        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[11px] leading-4 text-[var(--app-muted)]">
          {(copy.profileRequirements[activeProfile.id] ?? activeProfile.requirements).map(
            (requirement) => <li key={requirement}>{requirement}</li>
          )}
        </ul>
      </div>
    </section>
  );
}

export const WorkflowPicker = memo(function WorkflowPicker({
  profiles = WORKFLOW_PROFILES,
  value,
  availability,
  resolvedProfileId: _resolvedProfileId,
  onChange,
  disabled = false,
  copy: copyOverrides,
  className = '',
  compact = false,
  omitAutomatic = false,
  isAutomatic = false,
  flowProfileId = null,
  onToggleFlow,
}: WorkflowPickerProps) {
  const copy = useMemo(() => mergeCopy(copyOverrides), [copyOverrides]);
  const instanceId = useId().replaceAll(':', '');
  const descriptionId = `${instanceId}-workflow-description`;
  const listedProfiles = omitAutomatic
    ? profiles.filter((profile) => profile.id !== 'auto')
    : profiles;

  return (
    <section
      className={`workflow-picker min-w-0 ${className}`.trim()}
      aria-labelledby={`${instanceId}-workflow-title`}
      aria-describedby={compact ? undefined : descriptionId}
    >
      {!compact && (
        <header className="mb-3">
          <h2 id={`${instanceId}-workflow-title`} className="text-sm font-bold sm:text-base">
            {copy.title}
          </h2>
          <p id={descriptionId} className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
            {copy.description}
          </p>
        </header>
      )}
      {compact && (
        <h2 id={`${instanceId}-workflow-title`} className="sr-only">
          {copy.title}
        </h2>
      )}

      <div className={compact ? 'space-y-3' : 'space-y-4'}>
        {GROUP_ORDER.map((group) => {
          const groupProfiles = listedProfiles.filter((profile) => profile.group === group);
          if (groupProfiles.length === 0) return null;
          return (
            <fieldset key={group} className="min-w-0">
              <legend className={`mb-1.5 px-2 text-[11px] font-semibold tracking-wide text-[var(--app-muted)] ${compact ? 'normal-case' : 'uppercase tracking-wider font-bold'}`}>
                {copy.groupLabels[group]}
              </legend>
              <div className={`grid min-w-0 grid-cols-1 ${compact ? 'gap-0.5' : 'gap-2'}`}>
                {groupProfiles.map((profile) => {
                  const state = availability[profile.id];
                  const isAvailable = state?.available ?? true;
                  const isDisabled = disabled || !isAvailable;
                  const isSelected = value === profile.id;
                  const itemDescriptionId = `${instanceId}-${profile.id}-description`;
                  const disabledReason = copy.disabledReasons[profile.id] ?? state?.disabledReason;
                  const label = profileLabel(profile, copy);
                  const flowOpen = flowProfileId === profile.id;
                  return (
                    <div
                      key={profile.id}
                      className={`relative flex min-w-0 items-center ${compact ? 'gap-0.5' : 'gap-2'}`}
                    >
                      <label
                        title={compact ? `${label}${!isAvailable && disabledReason ? ` — ${disabledReason}` : ''}` : undefined}
                        className={`relative flex min-w-0 flex-1 items-center gap-2.5 rounded-xl transition-colors ${
                          compact
                            ? `min-h-10 px-2.5 py-1.5 ${
                                isDisabled
                                  ? 'cursor-not-allowed opacity-45'
                                  : isSelected
                                    ? 'cursor-pointer bg-slate-500/15 [[data-theme=light]_&]:bg-slate-200/80'
                                    : 'cursor-pointer hover:bg-slate-500/10 [[data-theme=light]_&]:hover:bg-slate-100'
                              }`
                            : `min-h-12 gap-3 border p-2.5 ${
                                isDisabled
                                  ? 'cursor-not-allowed border-[var(--app-border)] opacity-60'
                                  : isSelected
                                    ? 'cursor-pointer border-indigo-400 bg-indigo-500/10'
                                    : 'cursor-pointer border-[var(--app-border)] hover:border-indigo-400/60 hover:bg-indigo-500/[0.06]'
                              }`
                        }`}
                      >
                        <input
                          type="radio"
                          name={`${instanceId}-workflow`}
                          value={profile.id}
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => onChange(profile.id)}
                          aria-describedby={itemDescriptionId}
                          className={compact
                            ? 'sr-only'
                            : 'mt-0.5 h-5 w-5 shrink-0 accent-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400'}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className={`min-w-0 truncate ${compact ? 'text-[13px] font-medium' : 'break-words text-sm font-semibold'}`}>
                              {label}
                            </span>
                            {isAutomatic && isSelected && (
                              <span className="shrink-0 rounded-full bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300 [[data-theme=light]_&]:text-indigo-700">
                                {copy.automaticBadge}
                              </span>
                            )}
                          </span>
                          {!compact && (
                            <>
                              <span
                                id={itemDescriptionId}
                                className="mt-1 block break-words text-[11px] leading-4 text-[var(--app-muted)]"
                              >
                                {profileDescription(profile, copy)}
                              </span>
                              {!isAvailable && disabledReason && (
                                <span className="mt-1.5 block break-words text-[11px] font-medium leading-4 text-amber-400 [[data-theme=light]_&]:text-amber-800">
                                  {copy.unavailableLabel}: {disabledReason}
                                </span>
                              )}
                            </>
                          )}
                          {compact && (
                            <span id={itemDescriptionId} className="sr-only">
                              {profileDescription(profile, copy)}
                              {!isAvailable && disabledReason ? ` ${copy.unavailableLabel}: ${disabledReason}` : ''}
                            </span>
                          )}
                          {isAvailable && (
                            <span className="sr-only">{copy.availableLabel}</span>
                          )}
                        </span>
                      </label>
                      {onToggleFlow && (
                        <button
                          type="button"
                          onClick={() => onToggleFlow(profile.id)}
                          aria-pressed={flowOpen}
                          aria-label={flowOpen ? copy.hideFlowLabel : copy.showFlowLabel}
                          title={flowOpen ? copy.hideFlowLabel : copy.showFlowLabel}
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition ${
                            flowOpen
                              ? 'bg-indigo-500/15 text-indigo-300 [[data-theme=light]_&]:text-indigo-700'
                              : 'text-[var(--app-muted)] hover:bg-slate-500/10 hover:text-[var(--app-text)]'
                          }`}
                        >
                          <GitBranch className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>
    </section>
  );
});
