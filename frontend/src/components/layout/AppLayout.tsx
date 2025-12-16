import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/components/navigation/BottomNav';

export function AppLayout() {
  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <Outlet />
      <BottomNav />
    </div>
  );
}
