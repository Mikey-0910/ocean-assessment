import { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 font-medium rounded-full transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';

const variantClasses: Record<string, string> = {
  primary:
    'bg-brand-primary text-white shadow-lift hover:bg-brand-primary-dark hover:shadow-glow hover:-translate-y-0.5 active:scale-[0.97]',
  secondary:
    'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:-translate-y-0.5',
  outline:
    'bg-transparent text-brand-primary border border-brand-primary/30 hover:bg-brand-primary/5',
  ghost:
    'bg-transparent text-gray-600 hover:bg-gray-100',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  iconRight,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
      {iconRight && <span className="w-4 h-4">{iconRight}</span>}
    </button>
  );
}

// 特殊的 AI CTA 按钮（带动画渐变）
export function AiCtaButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2.5 px-9 py-4 text-white text-[17px] font-semibold rounded-full
        bg-gradient-to-r from-brand-primary via-[#5B9EE8] to-brand-auxiliary bg-[length:200%_200%]
        shadow-[0_8px_32px_rgba(74,136,216,0.32)]
        animate-pulse-soft
        hover:-translate-y-[3px] hover:scale-[1.03] hover:shadow-[0_16px_44px_rgba(74,136,216,0.44)]
        hover:bg-[position:100%_0]
        active:scale-[0.97]
        transition-all duration-300"
    >
      {children}
    </button>
  );
}
