import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from '@/components/navigation/BottomNav';

export function AppLayout() {
  const location = useLocation();
  
  // Hide bottom nav on individual chat pages (e.g., /messages/123)
  const isChatPage = /^\/messages\/[^/]+$/.test(location.pathname);
  
  return (
    <div className={`min-h-screen ${isChatPage ? '' : 'pb-16'} md:pb-0`}>
      <Outlet />
      {!isChatPage && <BottomNav />}
    </div>
  );
}
