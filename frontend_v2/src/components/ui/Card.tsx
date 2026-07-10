import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses: Record<string, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6 md:p-8',
  lg: 'p-8 md:p-10',
};

export function Card({
  children,
  className = '',
  hover = false,
  glass = true,
  padding = 'lg',
}: CardProps) {
  return (
    <div
      className={`
        rounded-3xl
        ${glass ? 'glass' : ''}
        ${paddingClasses[padding]}
        ${hover ? 'card-float' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface ResultCardProps {
  children: ReactNode;
  className?: string;
  accent?: 'primary' | 'auxiliary' | 'warm' | 'coral';
}

export function ResultCard({
  children,
  className = '',
  accent = 'primary',
}: ResultCardProps) {
  const accentClasses: Record<string, string> = {
    primary: 'from-brand-primary/10 to-brand-primary/5',
    auxiliary: 'from-brand-auxiliary/10 to-brand-auxiliary/5',
    warm: 'from-brand-warm/10 to-brand-warm/5',
    coral: 'from-brand-coral/10 to-brand-coral/5',
  };

  return (
    <div
      className={`
        glass rounded-3xl p-7 card-float
        ${className}
      `}
    >
      {children}
    </div>
  );
}
