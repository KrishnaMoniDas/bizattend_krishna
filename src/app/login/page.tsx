'use client';

import { useState, type FormEvent, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, LogIn, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [email, setEmail] = useState(process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_ADMIN_EMAIL_DEV || '' : '');
  const [password, setPassword] = useState(process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_ADMIN_PASSWORD_DEV || '' : '');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (status === 'authenticated') {
      const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
      router.push(callbackUrl);
    }
  }, [status, router, searchParams]);

  // Display error from query params (e.g., after failed OAuth)
  useEffect(() => {
    const queryError = searchParams.get('error');
    if (queryError) {
        if (queryError === "CredentialsSignin") {
            setError("Invalid email or password. Please try again.");
        } else {
            setError(`Login failed: ${queryError}. Please try again.`);
        }
    }
  }, [searchParams]);


  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    setIsLoading(false);

    if (result?.error) {
      if (result.error === "CredentialsSignin") {
        setError("Invalid email or password. Please try again.");
      } else {
        setError(`Login failed: ${result.error}. Please try again.`);
      }
    } else if (result?.ok) {
      const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
      router.push(callbackUrl);
      router.refresh(); // Important to update server session state recognition
    }
  };
  
  if (status === 'loading' || status === 'authenticated') {
    return (
        <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }


  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-xl glass-effect">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Manager Login</CardTitle>
          <CardDescription>Access the BizAttend management panel.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" /> Sign In
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
