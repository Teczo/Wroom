type Tone = 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'violet';

const tones: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  violet: 'bg-violet-100 text-violet-800',
};

const projectStatusTones: Record<string, Tone> = {
  idea: 'neutral',
  'in-development': 'blue',
  live: 'green',
  'on-hold': 'amber',
  archived: 'neutral',
};

const featureStatusTones: Record<string, Tone> = {
  backlog: 'neutral',
  todo: 'neutral',
  'in-progress': 'blue',
  blocked: 'red',
  review: 'violet',
  done: 'green',
};

const priorityTones: Record<string, Tone> = {
  low: 'neutral',
  medium: 'blue',
  high: 'amber',
  critical: 'red',
};

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {label}
    </span>
  );
}

export function ProjectStatusPill({ status }: { status: string }) {
  return <Pill label={status.replace('-', ' ')} tone={projectStatusTones[status] ?? 'neutral'} />;
}

export function FeatureStatusPill({ status }: { status: string }) {
  return <Pill label={status.replace('-', ' ')} tone={featureStatusTones[status] ?? 'neutral'} />;
}

export function PriorityPill({ priority }: { priority: string }) {
  return <Pill label={priority} tone={priorityTones[priority] ?? 'neutral'} />;
}
