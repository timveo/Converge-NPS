import { useState, useMemo } from 'react';
import { X, Mail, Briefcase, Linkedin, Globe, Tag, LogOut, QrCode, Maximize2 } from 'lucide-react';
import QRCode from 'react-qr-code';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { user, logout } = useAuth();
  const [showFullScreenQR, setShowFullScreenQR] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate QR data
  const qrData = useMemo(() => {
    if (!user) return '';
    return JSON.stringify({
      type: 'converge-nps-profile',
      id: user.id,
      v: 1,
    });
  }, [user?.id]);

  const manualCode = user?.id?.slice(0, 8).toUpperCase() || '';

  if (!user) return null;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-full max-w-md mx-4 bg-background rounded-xl shadow-2xl border border-border overflow-hidden"
            >
              {/* Header */}
              <div className="bg-primary px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-primary-foreground">My Profile</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-primary-foreground hover:bg-white/20 h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* User Info Card */}
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                      {user.fullName ? getInitials(user.fullName) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-foreground truncate">{user.fullName}</h3>
                    {user.role && (
                      <p className="text-sm text-muted-foreground mt-0.5">{user.role}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {user.department && (
                      <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
                        <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="truncate">{user.department}</span>
                      </div>
                    )}
                    {user.organization && (
                      <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
                        <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="truncate">{user.organization}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Social Links */}
                {(user.linkedinUrl || user.websiteUrl) && (
                  <div className="flex flex-wrap gap-2">
                    {user.linkedinUrl && (
                      <a
                        href={user.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0077B5]/10 text-[#0077B5] text-sm hover:bg-[#0077B5]/20 transition-colors"
                      >
                        <Linkedin className="h-4 w-4" />
                        LinkedIn
                      </a>
                    )}
                    {user.websiteUrl && (
                      <a
                        href={user.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors"
                      >
                        <Globe className="h-4 w-4" />
                        Website
                      </a>
                    )}
                  </div>
                )}

                {/* Bio */}
                {user.bio && (
                  <div className="bg-secondary/30 rounded-lg p-4">
                    <p className="text-sm text-foreground">{user.bio}</p>
                  </div>
                )}

                {/* Technology Interests */}
                {user.accelerationInterests && user.accelerationInterests.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="h-4 w-4 text-primary" />
                      <h4 className="font-medium text-sm text-foreground">Technology Interests</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {user.accelerationInterests.map((interest) => (
                        <Badge key={interest} variant="secondary" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* QR Code Badge */}
                <div className="border border-border rounded-xl p-4 bg-gradient-to-br from-secondary/30 to-primary/5">
                  <div className="flex items-center gap-2 mb-3">
                    <QrCode className="h-4 w-4 text-primary" />
                    <h4 className="font-medium text-sm text-foreground">Your Digital Badge</h4>
                  </div>
                  <div
                    className="flex flex-col items-center py-4 cursor-pointer group"
                    onClick={() => setShowFullScreenQR(true)}
                  >
                    <div className="bg-white p-3 rounded-xl shadow-md relative">
                      <QRCode
                        value={qrData}
                        size={140}
                        level="H"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl">
                        <Maximize2 className="w-6 h-6 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="text-center mt-3">
                      <p className="text-xs text-muted-foreground">Manual Code</p>
                      <p className="text-sm font-mono font-semibold text-primary tracking-wider">{manualCode}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Tap to enlarge for easier scanning
                  </p>
                </div>

                {/* Sign Out */}
                <Button
                  variant="outline"
                  className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={() => {
                    onClose();
                    logout();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen QR Modal */}
      <Dialog open={showFullScreenQR} onOpenChange={setShowFullScreenQR}>
        <DialogContent className="max-w-md p-0 bg-white dark:bg-card">
          <div className="relative p-6">
            <button
              onClick={() => setShowFullScreenQR(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold">{user.fullName}</h3>
              {user.organization && (
                <p className="text-sm text-muted-foreground">{user.organization}</p>
              )}
            </div>

            <div className="flex justify-center mb-6">
              <div className="bg-white p-4 rounded-xl shadow-lg">
                <QRCode value={qrData} size={250} level="H" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Manual Code</p>
              <p className="text-2xl font-mono font-bold text-primary tracking-wider">{manualCode}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
