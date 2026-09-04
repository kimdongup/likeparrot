import { useEffect, useId, useMemo, useRef } from 'react';
import {
  AudioLines,
  Monitor,
  PanelLeft,
  PanelLeftClose,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import type { WorkflowGroup, WorkflowProfileId } from '../services/workflowProfiles';
import { WORKFLOW_PROFILES } from '../services/workflowProfiles';
import {
  resolveWorkflowCopy,
  WorkflowPicker,
  type WorkflowPickerProps,
} from './WorkflowPicker';

interface WorkflowSidebarProps extends Omit<WorkflowPickerProps, 'className' | 'compact'> {
  expanded: boolean;
  mobileOpen: boolean;
  expandLabel: string;
  collapseLabel: string;
  selectedId: WorkflowProfileId;
  onExpandedChange: (expanded: boolean) => void;
  onMobileOpenChange: (open: boolean) => void;
}

const GROUP_ICONS: Record<WorkflowGroup, typeof Sparkles> = {
  automatic: Sparkles,
  'live-audio': AudioLines,
  desktop: Monitor,
  mobile: Smartphone,
};

const GROUP_ORDER: readonly WorkflowGroup[] = [
  'live-audio',
  'desktop',
  'mobile',
];

export function WorkflowSidebar({
  expanded,
  mobileOpen,
  expandLabel,
  collapseLabel,
  onExpandedChange,
  onMobileOpenChange,
  profiles = WORKFLOW_PROFILES,
  value,
  selectedId,
  availability,
  resolvedProfileId,
  onChange,
  disabled = false,
  copy: copyOverrides,
  isAutomatic = false,
  flowProfileId = null,
  onToggleFlow,
}: WorkflowSidebarProps) {
  const copy = useMemo(() => resolveWorkflowCopy(copyOverrides), [copyOverrides]);
  const instanceId = useId().replaceAll(':', '');
  const panelRef = useRef<HTMLDivElement>(null);
  const highlightedGroup = profiles.find((profile) => profile.id === value)?.group;

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(
      () => panelRef.current?.focus({ preventScroll: true }),
      0
    );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onMobileOpenChange(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen, onMobileOpenChange]);

  const handleSelect = (id: WorkflowProfileId) => {
    if (selectedId === 'auto' && id === resolvedProfileId) {
      onMobileOpenChange(false);
      return;
    }
    onChange(id);
    onMobileOpenChange(false);
  };

  const handleToggleFlow = (id: WorkflowProfileId) => {
    onToggleFlow?.(id);
    onMobileOpenChange(false);
  };

  const list = (
    <>
      <div className="px-2.5 pb-2">
        {isAutomatic ? (
          <p className="text-[11px] leading-4 text-[var(--app-muted)]">
            {copy.usingAutomaticLabel}
          </p>
        ) : (
          <button
            type="button"
            onClick={() => handleSelect('auto')}
            className="text-[11px] font-semibold text-indigo-300 underline-offset-2 hover:underline [[data-theme=light]_&]:text-indigo-700"
          >
            {copy.useAutomaticLabel}
          </button>
        )}
      </div>
      <WorkflowPicker
        profiles={profiles}
        value={value}
        availability={availability}
        resolvedProfileId={resolvedProfileId}
        onChange={handleSelect}
        disabled={disabled}
        copy={copyOverrides}
        compact
        omitAutomatic
        isAutomatic={isAutomatic}
        flowProfileId={flowProfileId}
        onToggleFlow={handleToggleFlow}
      />
    </>
  );

  return (
    <>
      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-[var(--app-border)] bg-[var(--app-surface)] md:flex ${
          expanded ? 'w-[17.5rem]' : 'w-[3.25rem]'
        }`}
        aria-label={copy.title}
      >
        <div className="flex items-center justify-between gap-1 px-2 py-2">
          <button
            type="button"
            onClick={() => onExpandedChange(!expanded)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--app-muted)] transition hover:bg-slate-500/10"
            aria-label={expanded ? collapseLabel : expandLabel}
            title={expanded ? collapseLabel : expandLabel}
          >
            {expanded
              ? <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
              : <PanelLeft className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
        {expanded ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 pb-3">
            {list}
          </div>
        ) : (
          <nav className="flex flex-1 flex-col items-center gap-1 px-1.5 pb-3" aria-label={copy.title}>
            {GROUP_ORDER.map((group) => {
              const Icon = GROUP_ICONS[group];
              const active = highlightedGroup === group;
              return (
                <button
                  key={group}
                  type="button"
                  title={copy.groupLabels[group]}
                  onClick={() => onExpandedChange(true)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                    active
                      ? 'bg-slate-500/15 text-[var(--app-text)]'
                      : 'text-[var(--app-muted)] hover:bg-slate-500/10'
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </button>
              );
            })}
          </nav>
        )}
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 flex md:hidden"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onMobileOpenChange(false);
          }}
        >
          <div className="absolute inset-0 bg-slate-950/50" aria-hidden="true" />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${instanceId}-mobile-title`}
            tabIndex={-1}
            className="relative flex h-full w-[min(20rem,86vw)] flex-col border-r border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-2xl outline-none"
          >
            <div className="flex items-center justify-between px-2 py-2">
              <h2 id={`${instanceId}-mobile-title`} className="px-2 text-sm font-bold">
                {copy.title}
              </h2>
              <button
                type="button"
                onClick={() => onMobileOpenChange(false)}
                aria-label={copy.closeLabel}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--app-muted)]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 pb-3">
              {list}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
