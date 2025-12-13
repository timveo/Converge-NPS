import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate email
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      // Always show success to prevent user enumeration
      setSubmitted(true);
    } catch {
      // Still show success message to prevent user enumeration
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-3 md:p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center px-4 py-4 md:px-6 md:py-6">
            <div className="mx-auto mb-2 md:mb-4 w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <CardTitle className="text-xl md:text-2xl">Check Your Email</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Check your email for instructions to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6 pb-4 md:pb-6">
            <p className="text-xs md:text-sm text-muted-foreground text-center">
              If an account exists for <strong>{email}</strong>, you will receive an email
              with a link to reset your password.
            </p>
            <p className="text-xs md:text-sm text-muted-foreground text-center">
              Didn't receive an email? Check your spam folder or try again.
            </p>
            <div className="flex flex-col gap-1.5 md:gap-2">
              <Button
                variant="outline"
                className="h-11 md:h-10 text-sm md:text-base"
                onClick={() => {
                  setSubmitted(false);
                  setEmail('');
                }}
              >
                Try a different email
              </Button>
              <Link to="/auth">
                <Button variant="ghost" className="w-full h-11 md:h-10 text-sm md:text-base">
                  <ArrowLeft className="mr-1.5 md:mr-2 h-4 w-4 md:h-5 md:w-5" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-3 md:p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center px-4 py-4 md:px-6 md:py-6">
          <CardTitle className="text-xl md:text-2xl">Reset Password</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Enter your email address and we'll send you instructions to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="email" className="text-sm">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                maxLength={255}
                className={`h-11 md:h-10 text-sm md:text-base ${error ? 'border-destructive' : ''}`}
              />
              {error && <p className="text-xs md:text-sm text-destructive">{error}</p>}
            </div>
            <Button
              type="submit"
              className="w-full h-11 md:h-10 text-sm md:text-base"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 md:mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Instructions'
              )}
            </Button>
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
