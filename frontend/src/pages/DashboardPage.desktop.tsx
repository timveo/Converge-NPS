import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, MessageSquare, Users, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DesktopShell } from '@/components/desktop/DesktopShell';
import {
  DashboardWidget,
  DashboardTwoColumnRow,
} from '@/components/desktop/layouts';
import {
  TodayScheduleWidget,
  RecentMessagesWidget,
  EventParticipantsWidget,
} from '@/components/desktop/widgets';
import OnboardingFlow from '@/components/OnboardingFlow';

export default function DashboardDesktopPage() {
  const { user, updateUser } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Auto-show onboarding for users who haven't completed it
  useEffect(() => {
    if (user && user.onboardingCompleted === false) {
      setShowOnboarding(true);
    }
  }, [user]);

  const handleOnboardingComplete = useCallback(async () => {
    setShowOnboarding(false);
    try {
      await api.patch('/users/me/onboarding', {
        onboardingStep: 3,
        onboardingCompleted: true,
      });
      updateUser({ onboardingCompleted: true });
    } catch (error) {
      console.error('Failed to update onboarding status:', error);
    }
  }, [updateUser]);

  const displayName = user?.fullName?.split(' ')[0] || 'User';

  // Calculate event countdown
  const eventDate = new Date('2026-01-28');
  const today = new Date();
  const daysUntilEvent = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <DesktopShell>
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
          </div>

          {/* Welcome Banner */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[hsl(216,100%,22%)] via-[hsl(216,80%,28%)] to-[hsl(195,90%,40%)] p-6 shadow-lg">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
              <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
              <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-white/30 rounded-full" />
              <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-white/40 rounded-full" />

              <div className="relative flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-white">
                      Welcome back, {displayName}!
                    </h1>
                    <Sparkles className="h-5 w-5 text-amber-300" />
                  </div>
                  <p className="text-white/80 text-sm mb-4 max-w-md">
                    Your hub for connecting with innovators, exploring sessions, and building your network at Converge.
                  </p>
                  <div className="flex items-center gap-4">
                    <Badge className="bg-white/20 text-white hover:bg-white/30 border-0 px-3 py-1.5">
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      January 28-30, 2026
                    </Badge>
                    {daysUntilEvent > 0 && (
                      <Badge className="bg-amber-500/90 text-white hover:bg-amber-500 border-0 px-3 py-1.5">
                        <Clock className="h-3.5 w-3.5 mr-1.5" />
                        {daysUntilEvent} days until event
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main Content Grid */}
          <div className="space-y-6">
            {/* Top Row - Schedule and Messages */}
            <DashboardTwoColumnRow>
              <DashboardWidget
                title="Today's Schedule"
                subtitle="Your sessions for today"
                icon={Calendar}
                action={
                  <Link to="/schedule">
                    <Button variant="ghost" size="sm" className="gap-1">
                      View All
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                }
              >
                <TodayScheduleWidget />
              </DashboardWidget>

              <DashboardWidget
                title="Recent Messages"
                subtitle="Your conversations"
                icon={MessageSquare}
                action={
                  <Link to="/messages">
                    <Button variant="ghost" size="sm" className="gap-1">
                      View All
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                }
              >
                <RecentMessagesWidget />
              </DashboardWidget>
            </DashboardTwoColumnRow>

            {/* Bottom Row - Event Participants (full width) */}
            <DashboardWidget
              title="Event Participants"
              subtitle="Checked-in attendees"
              icon={Users}
              action={
                <Link to="/connections?tab=participants">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View All
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              }
            >
              <EventParticipantsWidget />
            </DashboardWidget>
          </div>
        </div>
      </div>

      {/* Onboarding Flow Modal */}
      <OnboardingFlow open={showOnboarding} onComplete={handleOnboardingComplete} />
    </DesktopShell>
  );
}
