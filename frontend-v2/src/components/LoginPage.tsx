'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, ArrowRight, Loader2, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { buildLoginUrl, passwordSignIn } from '@/lib/auth';

const LoginPage = ({ onLogin }: any) => {
    const [loginUrl, setLoginUrl] = useState<string | null>(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // Determine hosted UI availability on client only to prevent hydration mismatch
    useEffect(() => {
        setLoginUrl(buildLoginUrl());
    }, []);

    const hasHostedUi = Boolean(loginUrl);

    const handleLogin = () => {
        if (!loginUrl) return;
        window.location.href = loginUrl;
    };

    const handlePasswordLogin = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const tokens = await passwordSignIn(username, password);
            onLogin(tokens);
        } catch (err: any) {
            setError(err?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const features = [
        'Multi-model AI deliberation',
        'Secure cloud sync',
    ];

    return (
        <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
            {/* Left Panel - Branding (Desktop Only) */}
            <div className="hidden lg:flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#2563eb] via-[#4f46e5] to-[#7c3aed] p-10 text-white">
                {/* Ambient background effects */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-400/20 rounded-full blur-[100px]" />
                </div>

                {/* Top Section - Logo & Brand */}
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-16">
                        <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-xl font-semibold">LLM Council</span>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-5xl font-bold leading-tight mb-6">
                            Your AI-Powered<br />
                            Deliberation<br />
                            Platform
                        </h1>
                        <p className="text-lg text-blue-100/80 leading-relaxed max-w-md">
                            Capture ideas, organize thoughts, and unlock insights with the power of artificial intelligence.
                        </p>
                    </motion.div>
                </div>

                {/* Bottom Section - Features */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="relative z-10 space-y-3"
                >
                    {features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                                <Check className="w-4 h-4" />
                            </div>
                            <span className="text-sm text-blue-100">{feature}</span>
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* Right Panel - Interaction */}
            <div className="flex items-center justify-center p-8 bg-white min-h-screen">
                <div className="w-full max-w-sm space-y-8">
                    {/* Mobile Logo */}
                    <div className="text-center lg:hidden mb-8">
                        <div className="inline-flex items-center gap-2 p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl mb-4">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900">LLM Council</h1>
                    </div>

                    {/* Welcome Header */}
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h2>
                        <p className="text-slate-500 text-sm">
                            Enter your credentials to access your account
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-100"
                        >
                            {error}
                        </motion.div>
                    )}

                    {hasHostedUi ? (
                        <div className="space-y-6">
                            <Button
                                onClick={handleLogin}
                                className="w-full h-11 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
                            >
                                Sign in with Cognito
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handlePasswordLogin} className="space-y-5">
                            {/* Email/Username Field */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">Email</label>
                                <Input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    className="h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                                    placeholder="you@example.com"
                                />
                            </div>

                            {/* Password Field */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-slate-700">Password</label>
                                </div>
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                                    placeholder="Enter your password"
                                />
                            </div>

                            {/* Remember Me */}
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="remember"
                                    checked={rememberMe}
                                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                                />
                                <label
                                    htmlFor="remember"
                                    className="text-sm text-slate-600 cursor-pointer"
                                >
                                    Remember me for 30 days
                                </label>
                            </div>

                            {/* Sign In Button */}
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-11 text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign in'
                                )}
                            </Button>

                            {/* Divider */}
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-slate-200" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-3 text-slate-400 font-medium">Or continue with</span>
                                </div>
                            </div>

                            {/* Google Button */}
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-11 text-sm font-medium text-slate-700 border-slate-200 hover:bg-slate-50"
                            >
                                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                    <path
                                        fill="currentColor"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                Google
                            </Button>

                            {/* Sign Up Link */}
                            <p className="text-center text-sm text-slate-500">
                                Don't have an account?{' '}
                                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                                    Sign up
                                </a>
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
