import { type ReactNode } from 'react';

export function SectionHeader({
  tag,
  title,
  subtitle,
  className = '',
}: {
  tag: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={`reveal ${className}`}>
      <p className="text-sm font-medium text-brand-primary mb-2">{tag}</p>
      <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">{title}</h2>
      {subtitle && <p className="text-gray-500">{subtitle}</p>}
    </div>
  );
}

// Ghost blobs for background decoration
export function BackgroundBlobs() {
  return (
    <>
      <div className="blob blob-blue" aria-hidden="true" />
      <div className="blob blob-teal" aria-hidden="true" />
      <div className="blob blob-warm" aria-hidden="true" />
    </>
  );
}
