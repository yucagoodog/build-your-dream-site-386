import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Clapperboard, Loader2 } from "lucide-react";

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent you a confirmation link." });
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: "Enter your email first", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "Password reset link sent." });
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <Clapperboard className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">VidForge</h1>
          <p className="text-xs text-muted-foreground">AI Video Production Pipeline</p>
        </div>
      </div>

      <Card className="w-full max-w-sm border-border/50">
        <Tabs defaultValue="login">
          <CardHeader className="pb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
          </CardHeader>

          <TabsContent value="login">
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-surface-1"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-surface-1"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />}
                  Sign In
                </Button>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </button>
              </CardContent>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-surface-1"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Password</Label>
                  <Input
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-surface-1"
                    minLength={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />}
                  Create Account
                </Button>
              </CardContent>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
