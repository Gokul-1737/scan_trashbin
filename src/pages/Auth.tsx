import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { Recycle, Mail, Lock, User, Leaf, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, user, role, isAdmin } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  useEffect(() => {
    if (user && role) {
      const from = (location.state as any)?.from?.pathname;
      const defaultDestination = isAdmin ? '/admin' : '/scan';
      navigate(from || defaultDestination, { replace: true });
    }
  }, [user, role, isAdmin, navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    
    const { error } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Please verify your email before logging in');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Welcome back! 🌱');
    }
    
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = signupSchema.safeParse({ 
      fullName: signupName, 
      email: signupEmail, 
      password: signupPassword 
    });
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    
    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please log in instead.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Account created! Please check your email to verify your account.');
      setActiveTab('login');
    }
    
    setIsLoading(false);
  };

  const floatingIcons = [
    { icon: Leaf, delay: 0, x: '10%', y: '20%' },
    { icon: Recycle, delay: 0.5, x: '85%', y: '15%' },
    { icon: Leaf, delay: 1, x: '15%', y: '75%' },
    { icon: Recycle, delay: 1.5, x: '80%', y: '70%' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-background via-secondary/30 to-background">
      {/* Animated background elements */}
      {floatingIcons.map((item, index) => (
        <motion.div
          key={index}
          className="absolute text-primary/10"
          style={{ left: item.x, top: item.y }}
          animate={{
            y: [0, -20, 0],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 4,
            delay: item.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <item.icon className="w-16 h-16 md:w-24 md:h-24" />
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <Card className="glass-card border-0 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="mx-auto mb-4"
            >
              <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center shadow-glow">
                <Recycle className="w-10 h-10 text-primary-foreground" />
              </div>
            </motion.div>
            <CardTitle className="text-2xl font-bold text-gradient">
              Smart Recycle Bin
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Admin Control Panel
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <AnimatePresence mode="wait">
                <TabsContent value="login" className="mt-0">
                  <motion.form
                    key="login"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onSubmit={handleLogin}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary" />
                        Email
                      </Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="admin@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="h-11"
                        required
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.email}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-primary" />
                        Password
                      </Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="h-11"
                        required
                      />
                      {errors.password && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.password}
                        </p>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-11 gradient-primary hover:opacity-90 transition-opacity"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Sign In
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </motion.form>
                </TabsContent>

                <TabsContent value="signup" className="mt-0">
                  <motion.form
                    key="signup"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onSubmit={handleSignup}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        Full Name
                      </Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Doe"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="h-11"
                        required
                      />
                      {errors.fullName && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.fullName}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary" />
                        Email
                      </Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="h-11"
                        required
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.email}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-primary" />
                        Password
                      </Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="h-11"
                        required
                      />
                      {errors.password && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.password}
                        </p>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-11 gradient-primary hover:opacity-90 transition-opacity"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Create Account
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </motion.form>
                </TabsContent>
              </AnimatePresence>
            </Tabs>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>🌱 Join the green revolution</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
