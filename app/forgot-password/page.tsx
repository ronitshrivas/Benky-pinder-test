'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft, CheckCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'otp' | 'password' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { sendPasswordResetOtp, resetPasswordWithOtp } = useAuth();
  const router = useRouter();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetOtp(email);
      setStep('otp');
      toast.success('Reset code sent to your email');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset code');
    }
    setLoading(false);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      const next = document.getElementById(`reset-otp-${index + 1}`);
      next?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prev = document.getElementById(`reset-otp-${index - 1}`);
      prev?.focus();
    }
  };

  const handleVerifyOtp = () => {
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Please enter the full 6-digit code');
      return;
    }
    setStep('password');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await resetPasswordWithOtp(email, otp.join(''), password);
      setStep('success');
      toast.success('Password reset successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex -mt-20">
      {/* Left - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <Image src="/images/img2.jpeg" alt="Yoga" fill sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-primary/60 flex items-center justify-center p-12">
          <div className="text-center">
            <blockquote className="font-serif text-2xl text-white italic leading-relaxed">
              &ldquo;Strength comes from staying connected to your true nature&rdquo;
            </blockquote>
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-surface">
        <div className="w-full max-w-md">
          {step === 'success' ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-accent" />
              </div>
              <h1 className="font-serif text-3xl text-primary mb-2">Password Updated</h1>
              <p className="text-text-light mb-8">
                Your password has been reset successfully.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="btn-primary w-full"
              >
                Sign In
              </button>
            </div>
          ) : step === 'password' ? (
            <>
              <div className="text-center mb-8">
                <h1 className="font-serif text-3xl text-primary mb-2">Create New Password</h1>
                <p className="text-text-light">Enter a new password for your account</p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label className="input-label">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pl-10 pr-10"
                      placeholder="Min 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-primary"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="input-label">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input-field pl-10 pr-10"
                      placeholder="Repeat password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-primary"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Reset Password'}
                </button>
              </form>
            </>
          ) : step === 'otp' ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-accent" />
              </div>
              <h1 className="font-serif text-3xl text-primary mb-2">Verify Your Email</h1>
              <p className="text-text-light mb-8">
                We&apos;ve sent a 6-digit code to <strong>{email}</strong>
              </p>

              <div className="flex justify-center gap-3 mb-8">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`reset-otp-${i}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-lg focus:border-accent focus:outline-none transition-colors"
                  />
                ))}
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50 mb-4"
              >
                Continue
              </button>

              <button
                onClick={() => sendPasswordResetOtp(email)}
                className="text-sm text-text-light hover:text-accent"
              >
                Didn&apos;t receive a code? Resend
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="font-serif text-3xl text-primary mb-2">Forgot Password?</h1>
                <p className="text-text-light">Enter your email and we&apos;ll send you a reset code</p>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label className="input-label">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field pl-10"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Reset Code'}
                </button>
              </form>

              <p className="text-center text-sm text-text-light mt-8">
                <Link href="/login" className="inline-flex items-center gap-1 text-accent font-medium hover:underline">
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
