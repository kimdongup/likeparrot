import { memo, useId, useMemo } from 'react';
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

export const WorkflowPicker = memo(function WorkflowPicker({
  profiles = WORKFLOW_PROFILES,
  value,
  availability,
  resolvedProfileId,
  onChange,
  disabled = false,
  copy: copyOverrides,
  className = '',
}: WorkflowPickerProps) {
  const copy = useMemo(() => mergeCopy(copyOverrides), [copyOverrides]);
  const instanceId = useId().replaceAll(':', '');
  const descriptionId = `${instanceId}-workflow-description`;
  const profileMap = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles]
  );
  const selectedProfile = profileMap.get(value) ?? profiles[0];
  const resolvedProfile = value === 'auto' && resolvedProfileId
    ? profileMap.get(resolvedProfileId)
    : undefined;
  const activeProfile = resolvedProfile ?? selectedProfile;

  return (
    <section
      className={`workflow-picker min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 text-[var(--app-text)] shadow-xl sm:p-5 ${className}`.trim()}
      aria-labelledby={`${instanceId}-workflow-title`}
      aria-describedby={descriptionId}
    >
      <header className="mb-4">
        <h2 id={`${instanceId}-workflow-title`} className="text-sm font-bold sm:text-base">
          {copy.title}
        </h2>
        <p id={descriptionId} className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
          {copy.description}
        </p>
      </header>

      <div className="space-y-4">
        {GROUP_ORDER.map((group) => {
          const groupProfiles = profiles.filter((profile) => profile.group === group);
          if (groupProfiles.length === 0) return null;
          return (
            <fieldset key={group} className="min-w-0">
              <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--app-muted)]">
                {copy.groupLabels[group]}
              </legend>
              <div className="grid min-w-0 grid-cols-1 gap-2 lg:grid-cols-2">
                {groupProfiles.map((profile) => {
                  const state = availability[profile.id];
                  const isAvailable = state?.available ?? true;
                  const isDisabled = disabled || !isAvailable;
                  const isSelected = value === profile.id;
                  const itemDescriptionId = `${instanceId}-${profile.id}-description`;
                  const disabledReason = copy.disabledReasons[profile.id] ?? state?.disabledReason;
                  return (
                    <label
                      key={profile.id}
                      className={`relative flex min-h-14 min-w-0 gap-3 rounded-xl border p-3 transition-colors ${
                        isDisabled
                          ? 'cursor-not-allowed border-[var(--app-border)] opacity-60'
                          : isSelected
                            ? 'cursor-pointer border-indigo-400 bg-indigo-500/10'
                            : 'cursor-pointer border-[var(--app-border)] hover:border-indigo-400/60 hover:bg-indigo-500/[0.06]'
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
                        className="mt-0.5 h-5 w-5 shrink-0 accent-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="break-words text-sm font-semibold">
                            {profileLabel(profile, copy)}
                          </span>
                          {isSelected && (
                            <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold text-indigo-300 [[data-theme=light]_&]:text-indigo-700">
                              {copy.selectedLabel}
                            </span>
                          )}
                        </span>
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
                        {isAvailable && (
                          <span className="sr-only">{copy.availableLabel}</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>

      {activeProfile && (
        <section
          className="mt-5 rounded-xl border border-indigo-500/30 bg-indigo-500/[0.05] p-3 sm:p-4"
          aria-labelledby={`${instanceId}-active-flow-title`}
          aria-live="polite"
        >
          <h3 id={`${instanceId}-active-flow-title`} className="text-xs font-bold uppercase tracking-wider text-indigo-300 [[data-theme=light]_&]:text-indigo-700">
            {copy.activeFlowTitle}
          </h3>
          <p className="mt-1 break-words text-sm font-semibold">
            {resolvedProfile
              ? `${copy.automaticResolvedPrefix}: ${profileLabel(resolvedProfile, copy)}`
              : profileLabel(activeProfile, copy)}
          </p>

          <ol className="mt-3 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
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
      )}
    </section>
  );
});
