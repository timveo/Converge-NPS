import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, User, Bell, Info, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const settingsSections = [
  {
    title: 'Account',
    description: 'Manage your account settings',
    icon: User,
    items: [
      { label: 'Edit Profile', href: '/profile/edit' },
      { label: 'Privacy Settings', href: '/privacy-settings' },
    ],
  },
  {
    title: 'Notifications',
    description: 'Configure your notification preferences',
    icon: Bell,
    items: [
      { label: 'Email Notifications', href: '#' },
      { label: 'SMS Notifications', href: '#' },
    ],
  },
  {
    title: 'About',
    description: 'App information and support',
    icon: Info,
    items: [
      { label: 'Terms of Service', href: '#' },
      { label: 'Privacy Policy', href: '#' },
      { label: 'Help & Support', href: '#' },
    ],
  },
];

export default function SettingsPage() {
  const { logout } = useAuth();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your app preferences</p>
        </div>

        <div className="space-y-4">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.title}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-blue-600" />
                    <CardTitle>{section.title}</CardTitle>
                  </div>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <Link key={item.label} to={item.href}>
                        <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                          <span>{item.label}</span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <Card>
            <CardContent className="p-6">
              <Button
                variant="destructive"
                onClick={logout}
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
