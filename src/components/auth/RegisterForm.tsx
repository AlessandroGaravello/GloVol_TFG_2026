import { useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import PhoneInput from '../ui/PhoneInput';

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

function validatePassword(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Al menos 8 caracteres');
  if (!/[A-Z]/.test(password)) errors.push('Al menos una mayúscula');
  if (!/[a-z]/.test(password)) errors.push('Al menos una minúscula');
  if (!/[0-9]/.test(password)) errors.push('Al menos un número');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Al menos un símbolo (!@#$...)');
  return errors;
}

export default function RegisterForm() {
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    phone: '',
    country: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const set = (field: string) => (e: any) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const passwordErrors = validatePassword(form.password);
  const isPasswordValid = passwordErrors.length === 0;

  const handlePhone = (phone: string, country: string) => {
    setForm(prev => ({ ...prev, phone, country }));
  };

  const handleRegister = async () => {
    setError('');

    if (!isPasswordValid) {
      setError('La contraseña no cumple los requisitos de seguridad');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(cred.user, { displayName: form.displayName });
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email: form.email,
        displayName: form.displayName,
        username: form.username,
        phone: form.phone,
        role: 'user',
        isVerified: false,
        isActive: true,
        verificationStatus: 'none',
        profilePicture: null,
        country: form.country,
        city: '',
        region: '',
        language: 'es',
        warCrimesAccess: false,
        totalDonatedEUR: 0,
        followersCount: 0,
        followingCount: 0,
        volunteerEventsCount: 0,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });
      window.location.href = '/auth/login';
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        setError('Este correo ya está registrado');
      } else {
        setError('Error al crear la cuenta');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="border border-zinc-700 rounded-2xl p-8 bg-zinc-950">
        <h1 className="text-xl font-semibold text-center mb-6">Registro</h1>

        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Nombre Apellido Apellido"
            value={form.displayName}
            onChange={set('displayName')}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
          <input
            type="email"
            placeholder="correo@gmail.com"
            value={form.email}
            onChange={set('email')}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
          <input
            type="text"
            placeholder="Usuario1234"
            value={form.username}
            onChange={set('username')}
            className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Contraseña"
              value={form.password}
              onChange={e => { set('password')(e); setPasswordTouched(true); }}
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              {showPassword ? <EyeOpen /> : <EyeClosed />}
            </button>
          </div>

          {/* Indicador de requisitos */}
          {passwordTouched && (
            <div className="bg-zinc-900 rounded-lg px-3 py-2 flex flex-col gap-1">
              {[
                { label: 'Al menos 8 caracteres', ok: form.password.length >= 8 },
                { label: 'Al menos una mayúscula', ok: /[A-Z]/.test(form.password) },
                { label: 'Al menos una minúscula', ok: /[a-z]/.test(form.password) },
                { label: 'Al menos un número', ok: /[0-9]/.test(form.password) },
                { label: 'Al menos un símbolo (!@#$...)', ok: /[^A-Za-z0-9]/.test(form.password) },
              ].map(({ label, ok }) => (
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`w-3.5 h-3.5 flex-shrink-0 ${ok ? 'text-green-400' : 'text-zinc-600'}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  >
                    {ok
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      : <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    }
                  </svg>
                  <span className={`text-xs ${ok ? 'text-green-400' : 'text-zinc-500'}`}>{label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Repite contraseña"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
            <button
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              {showConfirm ? <EyeOpen /> : <EyeClosed />}
            </button>
          </div>

          <div className="flex items-center gap-2">
          <PhoneInput onChange={handlePhone} />
          </div>

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 mt-1"
          >
            {loading ? 'Creando cuenta...' : 'Regístrate'}
          </button>

          <p className="text-center text-xs text-zinc-400 mt-1">
            ¿Ya tienes cuenta?{' '}
            <a href="/auth/login" className="text-white font-medium hover:underline">
              Inicia sesión
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}