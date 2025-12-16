import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, CheckCircle, XCircle, Eye, EyeOff, Check, X } from 'lucide-react';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'At least one uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'At least one lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'At least one number', test: (p) => /[0-9]/.test(p) },
];

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Check if token exists
  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  const allRequirementsMet = passwordRequirements.every((req) => req.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password requirements
    if (!allRequirementsMet) {
      setError('Please meet all password requirements');
      return;
    }

    // Validate passwords match
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
    } catch (err: any) {
      const message = err.response?.data?.error?.message || 'Failed to reset password. The link may have expired.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // No token - show error state
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-3 md:p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center px-4 py-4 md:px-6 md:py-6">
            <div className="mx-auto mb-2 md:mb-4 w-10 h-10 md:w-12 md:h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-5 h-5 md:w-6 md:h-6 text-destructive" />
            </div>
            <CardTitle className="text-xl md:text-2xl">Invalid Link</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
            <Link to="/forgot-password">
              <Button className="w-full h-11 md:h-10 text-sm md:text-base">
                Request New Reset Link
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="ghost" className="w-full h-11 md:h-10 text-sm md:text-base mt-2">
                <ArrowLeft className="mr-1.5 md:mr-2 h-4 w-4 md:h-5 md:w-5" />
                Back to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-3 md:p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center px-4 py-4 md:px-6 md:py-6">
            <div className="mx-auto mb-2 md:mb-4 w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <CardTitle className="text-xl md:text-2xl">Password Reset!</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Your password has been successfully reset.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6 pb-4 md:pb-6">
            <p className="text-xs md:text-sm text-muted-foreground text-center">
              You can now log in with your new password.
            </p>
            <Button
              className="w-full h-11 md:h-10 text-sm md:text-base"
              onClick={() => navigate('/auth')}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-3 md:p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center px-4 py-4 md:px-6 md:py-6">
          <CardTitle className="text-xl md:text-2xl">Create New Password</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password Field */}
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="password" className="text-sm">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-11 md:h-10 text-sm md:text-base pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            {password.length > 0 && (
              <div className="space-y-1.5 p-3 bg-muted/50 rounded-md">
                <p className="text-xs font-medium text-muted-foreground">Password requirements:</p>
                {passwordRequirements.map((req, index) => {
                  const met = req.test(password);
                  return (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      {met ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className={met ? 'text-green-600' : 'text-muted-foreground'}>
                        {req.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Confirm Password Field */}
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className={`h-11 md:h-10 text-sm md:text-base pr-10 ${
                    confirmPassword.length > 0 && !passwordsMatch ? 'border-destructive' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" />
                  Passwords match
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-xs md:text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 md:h-10 text-sm md:text-base"
              disabled={loading || !allRequirementsMet || !passwordsMatch}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 md:mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>

            {/* Disabled button explanation */}
            {password.length > 0 && (!allRequirementsMet || !passwordsMatch) && (
              <p className="text-xs text-muted-foreground text-center">
                {!allRequirementsMet
                  ? 'Please meet all password requirements above'
                  : 'Passwords must match'}
              </p>
            )}

            <Link to="/auth">
              <Button variant="ghost" className="w-full h-11 md:h-10 text-sm md:text-base">
                <ArrowLeft className="mr-1.5 md:mr-2 h-4 w-4 md:h-5 md:w-5" />
                Back to Login
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
