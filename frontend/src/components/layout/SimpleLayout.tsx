import { ReactNode } from 'react';

interface SimpleLayoutProps {
  children: ReactNode;
}

/**
 * Simple layout without top bar or side navigation
 * Used for pages that have their own header (like Dashboard)
 */
export function SimpleLayout({ children }: SimpleLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      {children}
    </div>
  );
}
