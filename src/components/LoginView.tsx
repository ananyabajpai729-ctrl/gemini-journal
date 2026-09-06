import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, BookOpen, Sparkles, Lock, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { signInWithGoogle, error, clearError } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);

  const handleLogin = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-stone-50 text-stone-900 flex flex-col justify-between">
      {/* Header */}
      <header id="landing-header" className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center font-medium shadow-sm">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold tracking-tight text-stone-900 text-lg">Personal Gemini Journal</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Private & Encrypted by UID</span>
        </div>
      </header>

      {/* Main Hero / Login Card */}
      <main id="login-main" className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md bg-white border border-stone-200 rounded-2xl p-8 shadow-sm text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-800 flex items-center justify-center mb-6">
            <Sparkles className="w-7 h-7" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 mb-2">
            Your Private Thought Sanctuary
          </h1>
          <p className="text-sm text-stone-600 mb-8 leading-relaxed">
            A reflective space for personal journaling and AI-assisted brainstorming. Authenticate to access your private notes.
          </p>

          {error && (
            <div id="login-error-banner" className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-left text-xs text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={clearError}
                className="text-red-500 hover:text-red-800 text-xs font-semibold px-1"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          {/* Google Sign-in Button */}
          <button
            id="google-signin-btn"
            type="button"
            onClick={handleLogin}
            disabled={submitting}
            className="w-full py-3 px-6 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-800 font-medium text-sm flex items-center justify-center gap-3 transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
          >
            {/* Google Vector Icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{submitting ? 'Connecting...' : 'Continue with Google'}</span>
            <ArrowRight className="w-4 h-4 ml-auto text-stone-400" />
          </button>

          {/* Security Notice */}
          <div className="mt-8 pt-6 border-t border-stone-100 flex items-center justify-center gap-2 text-xs text-stone-500">
            <Lock className="w-3.5 h-3.5 text-stone-400" />
            <span>Authenticated session with end-to-end user data isolation</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer id="landing-footer" className="w-full max-w-5xl mx-auto px-6 py-6 text-center text-xs text-stone-500">
        Personal Gemini Journal • Private & Security Governed
      </footer>
    </div>
  );
};
