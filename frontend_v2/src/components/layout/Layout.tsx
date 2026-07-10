import { type ReactNode } from 'react';
import { BackgroundBlobs } from '@/components/ui/SectionHeader';

interface LayoutProps {
  children: ReactNode;
  showBlobs?: boolean;
}

export function Layout({ children, showBlobs = true }: LayoutProps) {
  return (
    <div className="min-h-screen">
      {showBlobs && <BackgroundBlobs />}
      <main className="relative z-10">{children}</main>
    </div>
  );
}

export function Header() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 glass-strong">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-primary to-brand-auxiliary flex items-center justify-center">
            <span className="text-white font-bold text-sm">O</span>
          </div>
          <span className="font-semibold text-gray-800">OCEAN 人格测评</span>
        </a>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="py-8 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-sm text-gray-400 leading-relaxed">
          测评结果只是你当前状态的一个参考，不是永久标签，也不是专业诊断。如果你对结果感到困惑或焦虑，建议与信任的朋友聊聊，或联系学校心理咨询中心。
        </p>
      </div>
    </footer>
  );
}
