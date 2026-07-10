import { type ReactNode } from 'react';
import { LEVEL_CLASSES } from '@/theme';

export function TagPill({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium
        transition-transform duration-200 hover:-translate-y-0.5 ${className}`}
    >
      {children}
    </span>
  );
}

export function LevelBadge({ level }: { level: string }) {
  const colorClass = LEVEL_CLASSES[level] || LEVEL_CLASSES['中'];
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[13px] font-semibold ${colorClass}`}
    >
      {level}
    </span>
  );
}

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`flex-1 h-2 bg-gray-200 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-gradient-to-r from-brand-primary to-brand-auxiliary rounded-full transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Divider({ className = '' }: { className?: string }) {
  return <div className={`w-px bg-gray-200 ${className}`} />;
}
