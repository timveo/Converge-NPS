import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VerificationCodeInput } from '@/components/auth/VerificationCodeInput';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Mail, Eye, EyeOff } from 'lucide-react';

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register, verify2FA, resend2FA, twoFactorPending, cancelTwoFactor } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [codeError, setCodeError] = useState(false);

  // Login state
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup state
  const [signupData, setSignupData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    organization: '',
    role: '',
  });
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // ===== LOGIN FLOW - STEP 1 =====
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrors({});

    // Validate
    if (!loginData.email) {
      setLoginErrors({ email: 'Email is required' });
      return;
    }
    if (!loginData.password) {
      setLoginErrors({ password: 'Password is required' });
      return;
    }

    setLoading(true);
    try {
      const response = await login({ email: loginData.email, password: loginData.password });

      if (response.requires2FA) {
        toast.success('Verification code sent!', {
          description: 'Please check your email for the 6-digit code.',
        });
        setResendCooldown(30); // Start cooldown
      } else {
        // Direct login (backwards compatibility)
        toast.success('Welcome back!', {
          description: "You're now logged in.",
        });
        navigate('/');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error?.message || 'Invalid email or password';

      // Handle rate limit for 2FA
      if (error.response?.data?.error?.code === 'TWO_FACTOR_RATE_LIMIT') {
        const cooldown = error.response?.data?.error?.cooldownRemaining || 30;
        setResendCooldown(cooldown);
        toast.error('Please wait', {
          description: `You can request a new code in ${cooldown} seconds.`,
        });
      } else {
        toast.error('Login failed', {
          description: errorMessage,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== LOGIN FLOW - STEP 2: VERIFY 2FA CODE =====
  const handleVerifyCode = async (code: string) => {
    if (!twoFactorPending) return;

    setLoading(true);
    setCodeError(false);
    try {
      await verify2FA(twoFactorPending.userId, code);
      toast.success('Welcome back!', {
        description: "You're now logged in.",
      });
      navigate('/');
    } catch (error: any) {
      console.error('2FA verification error:', error);
      setCodeError(true);
      const errorMessage = error.response?.data?.error?.message || 'Invalid verification code';
      const attemptsRemaining = error.response?.data?.error?.attemptsRemaining;

      toast.error('Verification failed', {
        description: attemptsRemaining !== undefined
          ? `${errorMessage}`
          : errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  // ===== RESEND 2FA CODE =====
  const handleResendCode = async () => {
    if (!twoFactorPending || resendCooldown > 0) return;

    setLoading(true);
    try {
      await resend2FA(twoFactorPending.userId);
      setResendCooldown(30);
      toast.success('Code resent!', {
        description: 'Please check your email for the new code.',
      });
    } catch (error: any) {
      console.error('Resend error:', error);
      const cooldown = error.response?.data?.error?.cooldownRemaining || 30;
      setResendCooldown(cooldown);
      toast.error('Failed to resend', {
        description: error.response?.data?.error?.message || 'Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  // ===== CANCEL 2FA AND GO BACK =====
  const handleBack = () => {
    cancelTwoFactor();
    setCodeError(false);
  };

  // ===== SIGNUP FLOW =====
  const validateSignup = (): boolean => {
    const errors: Record<string, string> = {};

    if (!signupData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!signupData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (!signupData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupData.email)) {
      errors.email = 'Invalid email address';
    }
    if (!signupData.password) {
      errors.password = 'Password is required';
    } else if (signupData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (!signupData.organization.trim()) {
      errors.organization = 'Organization is required';
    }
    if (!signupData.role) {
      errors.role = 'Participant type is required';
    }

    setSignupErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignup()) return;

    setLoading(true);
    try {
      const fullName = `${signupData.firstName} ${signupData.lastName}`.trim();
      await register({
        email: signupData.email,
        password: signupData.password,
        fullName,
        organization: signupData.organization,
        role: signupData.role as any,
      });

      toast.success('Account created!', {
        description: 'Logging you in...',
      });

      // Automatically login after registration to trigger 2FA
      const response = await login({ email: signupData.email, password: signupData.password });

      if (response.requires2FA) {
        toast.success('Verification code sent!', {
          description: 'Please check your email for the 6-digit code.',
        });
        setResendCooldown(30);
      } else {
        navigate('/');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error('Signup failed', {
        description: error.response?.data?.error?.message || 'An error occurred during signup',
      });
    } finally {
      setLoading(false);
    }
  };

  // ===== RENDER 2FA VERIFICATION SCREEN =====
  if (twoFactorPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-3 md:p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center px-4 md:px-6 py-4 md:py-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-xl md:text-2xl">Check your email</CardTitle>
            <CardDescription className="text-sm md:text-base">
              We sent a verification code to
              <br />
              <span className="font-medium text-foreground">{twoFactorPending.email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4 md:pb-6 space-y-6">
            <div className="space-y-4">
              <Label className="text-center block text-sm text-muted-foreground">
                Enter the 6-digit code
              </Label>
              <VerificationCodeInput
                onComplete={handleVerifyCode}
                disabled={loading}
                error={codeError}
              />
              {codeError && (
                <p className="text-center text-sm text-destructive">
                  Invalid code. Please try again.
                </p>
              )}
              <p className="text-center text-xs text-muted-foreground">
                Code expires in 5 minutes
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="ghost"
                onClick={handleResendCode}
                disabled={loading || resendCooldown > 0}
                className="text-sm"
              >
                {resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : "Didn't receive the code? Resend"}
              </Button>

              <Button
                variant="outline"
                onClick={handleBack}
                disabled={loading}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== RENDER LOGIN/SIGNUP SCREEN =====
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-3 md:p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center px-4 md:px-6 py-4 md:py-6">
          <CardTitle className="text-xl md:text-2xl">Converge @ NPS</CardTitle>
          <CardDescription className="text-sm md:text-base">
            Sign in or create an account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'login' | 'signup')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 h-11 md:h-10">
              <TabsTrigger value="login" className="text-sm md:text-base">
                Login
              </TabsTrigger>
              <TabsTrigger value="signup" className="text-sm md:text-base">
                Sign Up
              </TabsTrigger>
            </TabsList>

            {/* LOGIN TAB */}
            <TabsContent value="login">
              <form onSubmit={handleLoginSubmit} className="space-y-4 md:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm md:text-base">
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    disabled={loading}
                    maxLength={255}
                    className={`h-11 md:h-10 text-sm md:text-base ${loginErrors.email ? 'border-destructive' : ''}`}
                  />
                  {loginErrors.email && (
                    <p className="text-xs md:text-sm text-destructive">{loginErrors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm md:text-base">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      disabled={loading}
                      className={`h-11 md:h-10 text-sm md:text-base pr-10 ${loginErrors.password ? 'border-destructive' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {loginErrors.password && (
                    <p className="text-xs md:text-sm text-destructive">{loginErrors.password}</p>
                  )}
                </div>
                <div className="text-right">
                  <Link
                    to="/forgot-password"
                    className="text-xs md:text-sm text-primary hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 md:h-10 text-sm md:text-base gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending code...
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  We'll send a verification code to your email
                </p>
              </form>
            </TabsContent>

            {/* SIGNUP TAB */}
            <TabsContent value="signup">
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="signup-firstname" className="text-sm md:text-base">
                      First Name *
                    </Label>
                    <Input
                      id="signup-firstname"
                      type="text"
                      placeholder="John"
                      value={signupData.firstName}
                      onChange={(e) =>
                        setSignupData({ ...signupData, firstName: e.target.value })
                      }
                      disabled={loading}
                      maxLength={50}
                      className={`h-11 md:h-10 text-sm md:text-base ${signupErrors.firstName ? 'border-destructive' : ''}`}
                    />
                    {signupErrors.firstName && (
                      <p className="text-xs md:text-sm text-destructive">
                        {signupErrors.firstName}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-lastname" className="text-sm md:text-base">
                      Last Name *
                    </Label>
                    <Input
                      id="signup-lastname"
                      type="text"
                      placeholder="Doe"
                      value={signupData.lastName}
                      onChange={(e) =>
                        setSignupData({ ...signupData, lastName: e.target.value })
                      }
                      disabled={loading}
                      maxLength={50}
                      className={`h-11 md:h-10 text-sm md:text-base ${signupErrors.lastName ? 'border-destructive' : ''}`}
                    />
                    {signupErrors.lastName && (
                      <p className="text-xs md:text-sm text-destructive">
                        {signupErrors.lastName}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm md:text-base">
                    Email *
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    disabled={loading}
                    maxLength={255}
                    className={`h-11 md:h-10 text-sm md:text-base ${signupErrors.email ? 'border-destructive' : ''}`}
                  />
                  {signupErrors.email && (
                    <p className="text-xs md:text-sm text-destructive">{signupErrors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-role" className="text-sm md:text-base">
                    Participant Type *
                  </Label>
                  <Select
                    value={signupData.role}
                    onValueChange={(value) => setSignupData({ ...signupData, role: value })}
                    disabled={loading}
                  >
                    <SelectTrigger
                      id="signup-role"
                      className={`h-11 md:h-10 text-sm md:text-base ${signupErrors.role ? 'border-destructive' : ''}`}
                    >
                      <SelectValue placeholder="Select participant type" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="faculty">Faculty/Staff</SelectItem>
                      <SelectItem value="industry">Industry</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  {signupErrors.role && (
                    <p className="text-xs md:text-sm text-destructive">{signupErrors.role}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-organization" className="text-sm md:text-base">
                    Organization / Company *
                  </Label>
                  <Input
                    id="signup-organization"
                    type="text"
                    placeholder="Your organization or company"
                    value={signupData.organization}
                    onChange={(e) =>
                      setSignupData({ ...signupData, organization: e.target.value })
                    }
                    disabled={loading}
                    maxLength={200}
                    className={`h-11 md:h-10 text-sm md:text-base ${signupErrors.organization ? 'border-destructive' : ''}`}
                  />
                  {signupErrors.organization && (
                    <p className="text-xs md:text-sm text-destructive">
                      {signupErrors.organization}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm md:text-base">
                    Password *
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showSignupPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                      value={signupData.password}
                      onChange={(e) =>
                        setSignupData({ ...signupData, password: e.target.value })
                      }
                      disabled={loading}
                      minLength={8}
                      maxLength={128}
                      className={`h-11 md:h-10 text-sm md:text-base pr-10 ${signupErrors.password ? 'border-destructive' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showSignupPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {signupErrors.password && (
                    <p className="text-xs md:text-sm text-destructive">
                      {signupErrors.password}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    At least 8 characters
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 md:h-10 text-sm md:text-base"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
