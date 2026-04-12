import { useState } from 'react';
import { auth } from '../../lib/firebase';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
} from 'firebase/auth';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmail = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = '/';
    } catch (e: any) {
      setError('Correo o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      window.location.href = '/';
    } catch (e: any) {
      setError('Error al iniciar sesión con Google');
    }
  };

  const handleFacebook = async () => {
    try {
      await signInWithPopup(auth, new FacebookAuthProvider());
      window.location.href = '/';
    } catch (e: any) {
      setError('Error al iniciar sesión con Facebook');
    }
  };

  const handleApple = async () => {
    try {
      await signInWithPopup(auth, new OAuthProvider('apple.com'));
      window.location.href = '/';
    } catch (e: any) {
      setError('Error al iniciar sesión con Apple');
    }
  };

  const EyeOpen = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
  
  const EyeClosed = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );

  return (
    <div className="w-full max-w-sm">
      <div className="border border-zinc-700 rounded-2xl p-8 bg-zinc-950">
        <h1 className="text-xl font-semibold text-center mb-6">Inicia Sesión</h1>

        {/* Social buttons */}
        <div className="flex flex-col gap-3 mb-4">
          <button
            onClick={handleFacebook}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#1877F2] text-white text-sm font-medium hover:opacity-90 transition"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
            </svg>
            Continuar con Facebook
          </button>

          <button
            onClick={handleGoogle}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-white text-zinc-900 text-sm font-medium hover:opacity-90 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>

          <button
            onClick={handleApple}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-zinc-800 text-white text-sm font-medium hover:opacity-90 transition"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            Continuar con Apple
          </button>
        </div>

        <div className="flex items-center gap-2 my-4">
          <div className="flex-1 h-px bg-zinc-700" />
          <span className="text-zinc-500 text-xs">O</span>
          <div className="flex-1 h-px bg-zinc-700" />
        </div>

        {/* Email/password */}
        <div className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Correo Electrónico"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          <button
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
          >
            {showPassword ? <EyeOpen /> : <EyeClosed />}
          </button>
          </div>

          <a href="/auth/forgot-password" className="text-xs text-zinc-400 hover:text-white text-right">
            ¿Has olvidado tu cuenta?
          </a>

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          <button
            onClick={handleEmail}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Iniciar Sesión'}
          </button>

          <p className="text-center text-xs text-zinc-400 mt-2">
            No tienes cuenta?{' '}
            <a href="/auth/register" className="text-white font-medium hover:underline">
              Regístrate
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}