import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  Edit,
  QrCode,
  Shield,
  Linkedin,
  Globe,
} from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">My Profile</h1>
          <div className="flex gap-2">
            <Link to="/privacy-settings">
              <Button variant="outline">
                <Shield className="w-4 h-4 mr-2" />
                Privacy
              </Button>
            </Link>
            <Link to="/profile/edit">
              <Button>
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-3xl font-semibold">
                    {user?.fullName?.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{user?.fullName}</h2>
                    <p className="text-muted-foreground">{user?.role}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{user?.email}</p>
                    </div>
                  </div>

                  {user?.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{user.phone}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Building className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Organization</p>
                      <p className="font-medium">{user?.organization}</p>
                    </div>
                  </div>

                  {user?.department && (
                    <div className="flex items-start gap-3">
                      <Briefcase className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Department</p>
                        <p className="font-medium">{user.department}</p>
                      </div>
                    </div>
                  )}
                </div>

                {user?.bio && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Bio</p>
                    <p className="text-gray-900">{user.bio}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {user?.accelerationInterests && user.accelerationInterests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Research Interests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {user.accelerationInterests.map((interest) => (
                      <Badge key={interest} variant="secondary">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  QR Badge
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 flex items-center justify-center">
                  <div className="w-48 h-48 bg-gradient-subtle rounded flex items-center justify-center">
                    <QrCode className="w-32 h-32 text-muted-foreground" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Show this QR code to quickly share your contact
                  </p>
                  <Button className="w-full">Download QR Code</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Privacy Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Profile Visibility</span>
                  <Badge variant={user?.privacy?.profileVisibility === 'public' ? 'default' : 'secondary'}>
                    {user?.privacy?.profileVisibility || 'public'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">QR Scanning</span>
                  <Badge variant={user?.privacy?.allowQrScanning ? 'default' : 'secondary'}>
                    {user?.privacy?.allowQrScanning ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <Link to="/privacy-settings">
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    Manage Privacy
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
