import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function ProfileEditPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    organization: user?.organization || '',
    department: user?.department || '',
    role: user?.role || '',
    bio: user?.bio || '',
    linkedinUrl: user?.linkedinUrl || '',
    websiteUrl: user?.websiteUrl || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Normalize URLs
      let linkedinUrl = formData.linkedinUrl?.trim() || '';
      let websiteUrl = formData.websiteUrl?.trim() || '';

      if (linkedinUrl && !linkedinUrl.match(/^https?:\/\//i)) {
        linkedinUrl = `https://${linkedinUrl}`;
      }
      if (websiteUrl && !websiteUrl.match(/^https?:\/\//i)) {
        websiteUrl = `https://${websiteUrl}`;
      }

      const profilePayload = {
        fullName: formData.fullName.trim(),
        phone: formData.phone?.trim() || null,
        organization: formData.organization?.trim() || null,
        department: formData.department?.trim() || null,
        role: formData.role?.trim() || null,
        bio: formData.bio?.trim() || null,
        linkedinUrl: linkedinUrl || null,
        websiteUrl: websiteUrl || null,
      };

      const response = await api.patch<{ message: string; profile: any }>('/users/me', profilePayload);

      // Update local user state
      if (updateUser && response.profile) {
        updateUser({
          fullName: profilePayload.fullName,
          phone: profilePayload.phone,
          organization: profilePayload.organization || user?.organization || '',
          department: profilePayload.department,
          role: profilePayload.role || user?.role || '',
          bio: profilePayload.bio,
          linkedinUrl: profilePayload.linkedinUrl,
          websiteUrl: profilePayload.websiteUrl,
        });
      }

      toast.success('Profile updated successfully!');
      navigate('/profile');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 md:pb-24">
      {/* Header */}
      <div className="container mx-auto px-3 md:px-4 pt-4 md:pt-8 max-w-2xl">
        <Card className="p-3 md:p-4 shadow-md bg-gradient-navy text-primary-foreground mb-3 md:mb-6">
          <div className="flex items-center gap-2 md:gap-4">
            <Link to="/profile">
              <Button variant="ghost" size="icon" className="h-11 w-11 md:h-10 md:w-10 text-primary-foreground hover:bg-primary/20">
                <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
              </Button>
            </Link>
            <h1 className="text-base md:text-xl font-bold">Edit Profile</h1>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-3 md:px-4 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-6">
          <Card className="p-4 md:p-6 shadow-md">
            <h3 className="text-sm md:text-base font-semibold mb-4">Personal Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization">Organization *</Label>
                  <Input
                    id="organization"
                    name="organization"
                    value={formData.organization}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Input
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={4}
                    maxLength={500}
                    placeholder="Tell others about yourself (max 500 characters)"
                  />
                  <p className="text-sm text-muted-foreground">
                    {formData.bio.length}/500 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                  <Input
                    id="linkedinUrl"
                    name="linkedinUrl"
                    type="url"
                    value={formData.linkedinUrl}
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <Input
                    id="websiteUrl"
                    name="websiteUrl"
                    type="url"
                    value={formData.websiteUrl}
                    onChange={handleChange}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/profile')} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </main>
    </div>
  );
}
