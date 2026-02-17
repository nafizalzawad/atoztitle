import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (isSignUp) {
      if (!fullName.trim()) {
        setError('Full name is required');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName.trim());
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Account created! Please check your email to verify your account before signing in.');
      }
    } else {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) {
        setError(error.message === 'Invalid login credentials'
          ? 'Invalid email or password. Please try again.'
          : error.message
        );
      } else {
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary items-center justify-center p-12">
        <div className="max-w-md text-primary-foreground">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground/20">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AtoZ Title</h1>
              <p className="text-sm opacity-80">& Settlement</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold leading-tight mb-4">
            Business Development CRM
          </h2>
          <p className="text-lg opacity-80 leading-relaxed">
            Track relationships, manage your pipeline, and convert prospects into clients with discipline and precision.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">AtoZ Title & Settlement</h1>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">
            {isSignUp ? 'Create an account' : 'Welcome back'}
          </h2>
          <p className="text-muted-foreground mb-8">
            {isSignUp ? 'Sign up to get started' : 'Sign in to your account'}
          </p>

          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@atoztitle.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess(''); }}
              className="font-medium text-primary hover:underline"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
