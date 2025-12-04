import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  ChevronLeft,
  Mail,
  Phone,
  Building,
  Briefcase,
  Edit,
  QrCode,
  Shield,
  Linkedin,
  Globe,
  LogOut,
  Tag,
} from 'lucide-react';
import { useState } from 'react';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileCompletion] = useState(75); // Mock profile completion

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm md:text-base text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 md:pb-24">
      {/* Header */}
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

      {/* Main Content */}
      <main className="container mx-auto px-3 md:px-4 max-w-2xl space-y-3 md:space-y-6">
        {/* Profile Completion Banner */}
        {profileCompletion < 100 && (
          <Card className="p-4 md:p-4 shadow-md border-accent/30 bg-gradient-to-r from-accent/10 to-primary/10">
            <div className="flex items-center justify-between gap-3 md:gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 md:gap-2 mb-2 md:mb-2">
                  <span className="text-sm md:text-sm font-semibold text-foreground">
                    Profile {profileCompletion}% Complete
                  </span>
                  <Badge variant="secondary" className="text-xs md:text-xs px-2 py-1">
                    6/8
                  </Badge>
                </div>
                <Progress value={profileCompletion} className="h-2 md:h-2 mb-2 md:mb-2" />
                <p className="text-xs md:text-xs text-muted-foreground">
                  Complete your profile to make better connections
                </p>
              </div>
              <Button size="sm" variant="outline" className="text-sm md:text-sm px-3 md:px-3" onClick={() => navigate("/profile/edit")}>
                Complete
              </Button>
            </div>
          </Card>
        )}

        {/* Profile Overview Card */}
        <Card className="p-4 md:p-6 shadow-md">
          <div className="flex items-start gap-3 md:gap-4 mb-4 md:mb-6">
            <Avatar className="h-16 w-16 md:h-20 md:w-20">
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-2xl md:text-3xl">
                {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-2xl font-bold truncate">{user?.fullName}</h2>
              <p className="text-sm md:text-base text-muted-foreground truncate">{user?.role}</p>
              {user?.organization && (
                <p className="text-sm md:text-base text-muted-foreground truncate">{user.organization}</p>
              )}
            </div>
            <Link to="/profile/edit">
              <Button variant="outline" size="sm" className="flex-shrink-0">
                <Edit className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Edit</span>
              </Button>
            </Link>
          </div>

          {user?.bio && (
            <div className="mb-4 md:mb-6">
              <p className="text-sm md:text-base text-foreground">{user.bio}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="flex items-start gap-2 md:gap-3">
              <Mail className="w-4 h-4 md:w-5 md:h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm text-muted-foreground">Email</p>
                <p className="text-sm md:text-base font-medium truncate">{user?.email}</p>
              </div>
            </div>

            {user?.phone && (
              <div className="flex items-start gap-2 md:gap-3">
                <Phone className="w-4 h-4 md:w-5 md:h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-muted-foreground">Phone</p>
                  <p className="text-sm md:text-base font-medium truncate">{user.phone}</p>
                </div>
              </div>
            )}

            {user?.department && (
              <div className="flex items-start gap-2 md:gap-3">
                <Briefcase className="w-4 h-4 md:w-5 md:h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-muted-foreground">Department</p>
                  <p className="text-sm md:text-base font-medium truncate">{user.department}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 md:gap-3">
              <Building className="w-4 h-4 md:w-5 md:h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm text-muted-foreground">Organization</p>
                <p className="text-sm md:text-base font-medium truncate">{user?.organization}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Research Interests */}
        {user?.accelerationInterests && user.accelerationInterests.length > 0 && (
          <Card className="p-4 md:p-6 shadow-md">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <Tag className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              <h3 className="text-sm md:text-base font-semibold">Research Interests</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {user.accelerationInterests.map((interest) => (
                <Badge key={interest} variant="secondary" className="text-xs md:text-sm">
                  {interest}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* QR Code Card */}
        <Card className="p-4 md:p-6 shadow-md">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <QrCode className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <h3 className="text-sm md:text-base font-semibold">Your QR Badge</h3>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-lg border-2 border-border flex items-center justify-center mb-3 md:mb-4">
            <div className="w-40 h-40 md:w-48 md:h-48 bg-gradient-subtle rounded flex items-center justify-center">
              <QrCode className="w-24 h-24 md:w-32 md:h-32 text-muted-foreground" />
            </div>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground text-center mb-3 md:mb-4">
            Show this QR code to quickly share your contact
          </p>
          <Button className="w-full">Download QR Code</Button>
        </Card>

        {/* Privacy Card */}
        <Card className="p-4 md:p-6 shadow-md">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <Shield className="h-4 w-4 md:h-5 md:h-5 text-primary" />
            <h3 className="text-sm md:text-base font-semibold">Privacy Settings</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm text-muted-foreground">Profile Visibility</span>
              <Badge variant="default" className="text-xs md:text-sm">
                {user?.privacy?.profileVisibility || 'Public'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm text-muted-foreground">QR Scanning</span>
              <Badge variant="default" className="text-xs md:text-sm">
                {user?.privacy?.allowQrScanning ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <Link to="/privacy-settings">
              <Button variant="outline" size="sm" className="w-full text-xs md:text-sm">
                Manage Privacy
              </Button>
            </Link>
          </div>
        </Card>

        {/* Logout Button */}
        <Card className="p-4 md:p-6 shadow-md">
          <Button
            variant="destructive"
            className="w-full"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </Card>
      </main>
    </div>
  );
}
