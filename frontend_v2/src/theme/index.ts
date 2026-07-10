export const theme = {
  colors: {
    primary: '#4A88D8',
    primaryLight: '#7BA8E8',
    primaryDark: '#3568B0',
    auxiliary: '#63B995',
    auxiliaryLight: '#8FD4B8',
    warm: '#F2A25C',
    warmLight: '#F7BE8C',
    coral: '#E87575',
    coralLight: '#F2A0A0',
    bg: '#F7F8FA',
  },
  shadows: {
    soft: '0 4px 20px rgba(74, 136, 216, 0.08)',
    lift: '0 12px 40px rgba(74, 136, 216, 0.15)',
    glow: '0 0 60px rgba(74, 136, 216, 0.12)',
  },
  radius: {
    '2xl': '1rem',
    '3xl': '1.5rem',
  },
} as const;

export const LEVEL_COLORS: Record<string, string> = {
  '高': '#63B995',
  '中': '#F2A25C',
  '低': '#E87575',
};

export const LEVEL_CLASSES: Record<string, string> = {
  '高': 'bg-[rgba(99,185,149,0.14)] text-[#2D8A68]',
  '中': 'bg-[rgba(242,162,92,0.14)] text-[#C77A2E]',
  '低': 'bg-[rgba(232,117,117,0.14)] text-[#C04848]',
};

export const DIMENSION_COLORS: Record<string, string> = {
  O: '#4A88D8',
  C: '#63B995',
  E: '#F2A25C',
  A: '#E87575',
  N: '#7BA8E8',
};

export const DIMENSION_GRADIENTS: Record<string, string> = {
  O: 'from-[#4A88D8]/10 to-[#4A88D8]/5',
  C: 'from-[#63B995]/10 to-[#63B995]/5',
  E: 'from-[#F2A25C]/10 to-[#F2A25C]/5',
  A: 'from-[#E87575]/10 to-[#E87575]/5',
  N: 'from-[#7BA8E8]/10 to-[#7BA8E8]/5',
};

export const KEYWORD_COLORS = [
  'bg-brand-primary/10 text-brand-primary',
  'bg-brand-auxiliary/10 text-brand-auxiliary',
  'bg-brand-warm/10 text-brand-warm',
  'bg-brand-coral/10 text-brand-coral',
  'bg-brand-primary/10 text-brand-primary',
];
