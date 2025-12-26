import { ChevronLeft, Mail, Briefcase, Tag, Loader2, Linkedin, Globe, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function ProfilePage() {
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm md:text-base text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  const isAdmin = user.role?.toLowerCase().includes('admin') || user.role?.toLowerCase().includes('staff');

  // Get initials from full name
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 md:pb-24">
      {/* Header - Compact on mobile, constrained width */}
      <div className="container mx-auto px-3 md:px-4 pt-4 md:pt-8 max-w-2xl">
        <Card className="p-3 md:p-4 shadow-md bg-gradient-navy text-primary-foreground mb-3 md:mb-6">
          <div className="flex items-center gap-2 md:gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="h-11 w-11 md:h-10 md:w-10 text-primary-foreground hover:bg-primary/20">
                <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
              </Button>
            </Link>
            <h1 className="text-base md:text-xl font-bold">My Profile</h1>
          </div>
        </Card>
      </div>

      {/* Main Content - Compact spacing on mobile */}
      <main className="container mx-auto px-3 md:px-4 max-w-2xl space-y-3 md:space-y-6">
        {/* Profile Header - Compact on mobile */}
        <Card className="p-4 md:p-6 shadow-md border-border/50">
          <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
            <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-gradient-navy flex items-center justify-center text-primary-foreground font-bold text-lg md:text-2xl flex-shrink-0">
              {getInitials(user.fullName || 'U')}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-foreground truncate">{user.fullName}</h2>
              {user.role && (
                <p className="text-sm md:text-sm text-muted-foreground mt-1 md:mt-1">{user.role}</p>
              )}
              <div className="flex items-center gap-2 md:gap-2 mt-2 md:mt-2 text-sm md:text-sm text-muted-foreground">
                <Mail className="h-4 w-4 md:h-4 md:w-4 text-accent flex-shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
              {user.department && (
                <div className="flex items-center gap-2 md:gap-2 mt-1.5 text-sm md:text-sm text-muted-foreground">
                  <Briefcase className="h-4 w-4 md:h-4 md:w-4 text-accent flex-shrink-0" />
                  <span className="truncate">{user.department}</span>
                </div>
              )}
              {user.organization && (
                <div className="flex items-center gap-2 md:gap-2 mt-1.5 text-sm md:text-sm text-muted-foreground">
                  <Briefcase className="h-4 w-4 md:h-4 md:w-4 text-accent flex-shrink-0" />
                  <span className="truncate">{user.organization}</span>
                </div>
              )}
              {user.linkedinUrl && (
                <div className="flex items-center gap-2 md:gap-2 mt-1.5 text-sm md:text-sm">
                  <Linkedin className="h-4 w-4 md:h-4 md:w-4 text-accent flex-shrink-0" />
                  <a
                    href={user.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline truncate"
                  >
                    LinkedIn
                  </a>
                </div>
              )}
              {user.websiteUrl && (
                <div className="flex items-center gap-2 md:gap-2 mt-1.5 text-sm md:text-sm">
                  <Globe className="h-4 w-4 md:h-4 md:w-4 text-accent flex-shrink-0" />
                  <a
                    href={user.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline truncate"
                  >
                    Website
                  </a>
                </div>
              )}
            </div>
          </div>

          {user.bio && (
            <div className="mt-3 md:mt-4">
              <h4 className="text-xs md:text-sm font-semibold text-muted-foreground mb-2">Bio</h4>
              <div className="p-2.5 md:p-4 bg-secondary/30 rounded-lg">
                <p className="text-xs md:text-sm text-foreground">{user.bio}</p>
              </div>
            </div>
          )}
        </Card>

        {/* Technology Interests - Compact on mobile */}
        {user.accelerationInterests && user.accelerationInterests.length > 0 && (
          <Card className="p-4 md:p-6 shadow-md border-border/50">
            <div className="flex items-center gap-2 md:gap-2 mb-3 md:mb-4">
              <Tag className="h-5 w-5 md:h-5 md:w-5 text-accent" />
              <h3 className="font-semibold text-base md:text-lg text-foreground">Technology Interests</h3>
            </div>
            <div className="flex flex-wrap gap-2 md:gap-2">
              {user.accelerationInterests.map((interest) => (
                <Badge key={interest} className="bg-accent text-accent-foreground text-xs md:text-xs px-2.5 py-1">
                  {interest}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Admin Tools - Compact on mobile */}
        {isAdmin && (
          <Card className="p-4 md:p-6 shadow-md border-accent/30 bg-gradient-to-r from-accent/10 to-primary/10">
            <div className="flex items-center gap-1.5 md:gap-2 mb-2.5 md:mb-4">
              <Shield className="h-4 w-4 md:h-5 md:w-5 text-accent" />
              <h3 className="font-semibold text-sm md:text-lg text-foreground">Admin Tools</h3>
              <Badge variant="default" className="ml-auto text-[10px] md:text-xs">Admin</Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              You have administrative privileges.
            </p>
          </Card>
        )}

        {/* Sign Out */}
        <Card className="p-4 md:p-6 shadow-md border-border/50">
          <Button
            variant="destructive"
            className="w-full gap-2 h-11 md:h-12 text-sm md:text-base"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 md:h-5 md:w-5" />
            Sign Out
          </Button>
        </Card>

      </main>
    </div>
  );
}
