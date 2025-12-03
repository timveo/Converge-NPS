import { ReactNode, useState } from 'react';
import { BottomNav } from '../navigation/BottomNav';
import { Sidebar } from '../navigation/Sidebar';
import { TopBar } from '../navigation/TopBar';
import { useDeviceType } from '@/hooks/useDeviceType';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const deviceType = useDeviceType();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar (Desktop only) */}
      <Sidebar />

      {/* Top Bar */}
      <TopBar onMenuClick={() => setShowMobileMenu(!showMobileMenu)} />

      {/* Mobile Menu Overlay */}
      {showMobileMenu && deviceType !== 'desktop' && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowMobileMenu(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-white z-50 shadow-xl">
            {/* Mobile menu content - reuse sidebar styles */}
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-blue-600">Converge</h1>
              <p className="text-sm text-gray-600 mt-1">NPS Tech Accelerator</p>
            </div>
            {/* Add navigation items here if needed */}
          </div>
        </>
      )}

      {/* Main Content */}
      <main
        className={cn(
          'transition-all duration-200',
          deviceType === 'desktop' ? 'ml-64' : 'ml-0',
          deviceType !== 'desktop' ? 'pb-20' : 'pb-0',
          'pt-16'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>

      {/* Bottom Nav (Mobile/Tablet only) */}
      <BottomNav />
    </div>
  );
}
