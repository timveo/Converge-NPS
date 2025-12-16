import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  QrCode,
  Calendar,
  Briefcase,
  MessageCircle,
  Users,
  Lightbulb,
  User,
  Settings as SettingsIcon,
  HelpCircle,
  Shield,
  ClipboardCheck,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Footer from '@/components/Footer';
import { BottomNav } from '@/components/navigation/BottomNav';
import QRCodeBadge from '@/components/QRCodeBadge';
import ThemeToggle from '@/components/ThemeToggle';
import OnboardingFlow from '@/components/OnboardingFlow';

export default function DashboardPage() {
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

    // Mark onboarding as completed in the backend
    try {
      await api.patch('/users/me/onboarding', {
        onboardingStep: 3,
        onboardingCompleted: true,
      });
      // Update local user state
      updateUser({ onboardingCompleted: true });
    } catch (error) {
      console.error('Failed to update onboarding status:', error);
    }
  }, [updateUser]);

  const isAdmin = user?.roles?.includes('admin') || false;
  const isStaffOrAdmin = user?.roles?.includes('staff') || user?.roles?.includes('admin') || false;
  const unreadCount = 0; // TODO: Implement unread count

  const profileData = user ? {
    name: user.fullName || 'User',
    displayName: user.fullName?.split(' ')[0] || 'User',
    role: 'Attendee', // TODO: Get from user profile
    uuid: user.id,
    event: "SC-JAN26",
    org: '', // TODO: Get from user profile
    bio: '', // TODO: Get from user profile
    interests: [], // TODO: Get from user profile
    linkedin: '', // TODO: Get from user profile
    show_organization: true,
    allow_qr_scan: true
  } : {
    name: "User",
    displayName: "User",
    role: "Attendee",
    uuid: "GUEST",
    event: "SC-JAN26"
  };

  const quickActions = [
    {
      title: "Event Schedule",
      description: "Sessions & Workshops",
      icon: Calendar,
      href: "/schedule",
      color: "from-primary to-navy-light"
    },
    {
      title: "Collaborative Opportunities",
      description: "Projects & Research",
      icon: Lightbulb,
      href: "/opportunities",
      color: "from-accent to-primary"
    },
    {
      title: "Industry Opportunities",
      description: "45+ Organizations",
      icon: Briefcase,
      href: "/industry",
      color: "from-navy-light to-tech-cyan"
    },
    {
      title: "My Network",
      description: "Connections & Invites",
      icon: Users,
      href: "/connections",
      color: "from-military-green to-primary"
    },
    {
      title: "Messages",
      description: "Brainstorm, Explore, Commit",
      icon: MessageCircle,
      href: "/messages",
      color: "from-tech-cyan to-accent"
    },
    ...(isStaffOrAdmin ? [{
      title: "Staff Check-In",
      description: "Scan Attendees",
      icon: ClipboardCheck,
      href: "/staff/checkin",
      color: "from-military-green to-tech-cyan",
      isStaff: true
    }] : []),
    ...(isAdmin ? [{
      title: "Admin Dashboard",
      description: "System Overview",
      icon: Shield,
      href: "/admin",
      color: "from-destructive to-accent",
      isAdmin: true
    }] : [])
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 md:pb-8">
      {/* Header */}
      <header className="bg-gradient-navy text-primary-foreground shadow-lg rounded-xl mx-3 md:mx-4 mt-3 md:mt-4">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-6">
          {/* Mobile Layout */}
          <div className="flex md:hidden flex-col gap-2">
            <div className="flex items-center gap-3">
              <img src="/nps-logo.png" alt="NPS Logo" className="h-14 w-auto" />
              <div>
                <h1 className="text-base font-bold tracking-tight dark:text-white">Converge @ NPS</h1>
                <p className="text-xs font-semibold text-nps-gold">Naval Postgraduate School</p>
                <p className="text-[10px] text-tech-cyan-light">January 28-30, 2026</p>
              </div>
            </div>
            <TooltipProvider delayDuration={200}>
              <div className="flex items-center justify-center gap-1 pt-1 border-t border-white/10">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-primary-foreground hover:bg-primary/20"
                      onClick={() => setShowOnboarding(true)}
                    >
                      <HelpCircle className="h-5 w-5 text-white" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Help</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="h-9 w-9 flex items-center justify-center">
                      <ThemeToggle />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Theme</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to="/messages">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-primary-foreground hover:bg-primary/20 relative"
                      >
                        <MessageCircle className="h-5 w-5 text-white" />
                        {unreadCount > 0 && (
                          <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-destructive rounded-full border border-nps-navy" />
                        )}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Messages</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to="/settings">
                      <Button variant="ghost" size="icon" className="h-11 w-11 md:h-10 md:w-10 text-primary-foreground hover:bg-primary/20">
                        <SettingsIcon className="h-5 w-5 md:h-6 md:w-6" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Settings</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to="/profile">
                      <Button variant="ghost" size="icon" className="h-11 w-11 md:h-10 md:w-10 text-primary-foreground hover:bg-primary/20">
                        <User className="h-5 w-5 md:h-6 md:w-6" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Profile</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/nps-logo.png" alt="NPS Logo" className="h-24 w-auto" />
              <div>
                <h1 className="text-xl font-bold tracking-tight dark:text-white">Converge @ NPS</h1>
                <p className="text-base font-semibold text-nps-gold mt-0.5">Naval Postgraduate School</p>
                <p className="text-sm text-tech-cyan-light mt-0.5">January 28-30, 2026</p>
              </div>
            </div>
            <TooltipProvider delayDuration={200}>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-primary-foreground hover:bg-primary/20"
                      onClick={() => setShowOnboarding(true)}
                    >
                      <HelpCircle className="h-8 w-8 text-white" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Help & Tutorial</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <ThemeToggle />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Toggle Theme</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to="/messages" className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-primary-foreground hover:bg-primary/20"
                      >
                        <MessageCircle className="h-6 w-6 text-white" />
                        {unreadCount > 0 && (
                          <span className="absolute top-1 right-1 h-3 w-3 bg-destructive rounded-full border-2 border-nps-navy" />
                        )}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Messages</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to="/settings">
                      <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/20">
                        <SettingsIcon className="h-6 w-6" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Settings</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to="/profile">
                      <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/20">
                        <User className="h-6 w-6" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>My Profile</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 md:py-8 pb-4 md:pb-8 max-w-6xl">
        {/* Welcome Banner - Compact on mobile */}
        <Card className="p-3 md:p-6 mb-4 md:mb-8 bg-gradient-to-br from-card to-accent/5 border-accent/30">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-lg md:text-2xl font-bold mb-1 md:mb-2">Welcome, {profileData.displayName}!</h2>
              <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 md:line-clamp-none">
                Discover opportunities, connect with partners, and collaborate at NPS.
              </p>
            </div>
          </div>
        </Card>

        {/* QR Code Badge */}
        <Card className="p-3 md:p-6 mb-4 md:mb-8 shadow-md">
          <QRCodeBadge user={profileData} isOffline={false} />
        </Card>

        {/* Scan to Connect Card */}
        <Card className="p-4 md:p-6 mb-4 md:mb-8 shadow-md bg-gradient-to-br from-accent/5 to-primary/5 border-accent/30">
          <div className="flex flex-col items-center gap-3">
            <Link to="/scanner" className="w-full">
              <Button
                variant="default"
                size="lg"
                className="w-full gap-2 text-sm md:text-base"
              >
                <QrCode className="h-5 w-5 md:h-5 md:w-5" />
                Scan to Connect
              </Button>
            </Link>
            <p className="text-xs md:text-sm text-muted-foreground text-center">
              Scan Attendee's Badge
            </p>
          </div>
        </Card>

        {/* Quick Actions Grid - Compact cards on mobile */}
        <div className="mb-4 md:mb-8">
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4 auto-rows-fr">
            {quickActions.map((action, index) => (
              <Link key={action.title} to={action.href} className="h-full">
                <Card
                  className={`h-full min-h-[120px] md:min-h-[160px] p-3 md:p-6 flex flex-col hover:shadow-lg transition-all duration-300 border-border/50 hover:border-accent/50 cursor-pointer group hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 animate-fade-in ${action.isAdmin ? 'border-accent/50 bg-gradient-to-br from-accent/5 to-destructive/5' : ''} ${(action as any).isStaff ? 'border-military-green/50 bg-gradient-to-br from-military-green/5 to-tech-cyan/5' : ''}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shrink-0`}>
                    <action.icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <h3 className="font-semibold text-sm md:text-lg mb-1 flex items-center gap-1 md:gap-2 transition-colors duration-300 group-hover:text-accent leading-tight">
                      {action.title}
                      {action.isAdmin && <Shield className="h-3 w-3 md:h-4 md:w-4 text-accent shrink-0" />}
                      {(action as any).isStaff && <ClipboardCheck className="h-3 w-3 md:h-4 md:w-4 text-military-green shrink-0" />}
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground transition-colors duration-300 line-clamp-1 md:line-clamp-none">{action.description}</p>
                  </div>
                  {action.isAdmin && (
                    <Badge className="mt-2 md:mt-3 bg-destructive text-xs w-fit">Admin</Badge>
                  )}
                  {(action as any).isStaff && (
                    <Badge className="mt-2 md:mt-3 bg-military-green text-xs w-fit">Staff</Badge>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </main>

      {/* Bottom Navigation for Mobile */}
      <BottomNav />

      {/* Onboarding Flow Modal */}
      <OnboardingFlow
        open={showOnboarding}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}
