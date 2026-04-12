import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────
interface FormData {
  displayName: string;
  username:    string;
  bio:         string;
  city:        string;
  region:      string;
  country:     string;
  language:    string;
  phone:       string;
  warCrimesAccess: boolean;
}

type VerifType = 'government' | 'journalist' | 'organization';

interface VerifForm {
  requestType: VerifType;
  // Gobierno
  governmentLevel:   string;
  governmentEntity:  string;
  position:          string;
  territory:         string;
  // Periodista
  journalistType:    string;
  pressAgencyName:   string;
  licenseNumber:     string;
  requestsWarCrime:  boolean;
  // Organización
  orgName:           string;
  orgType:           string;
  orgCountry:        string;
  orgRegNumber:      string;
  // Documentos (nombres de fichero seleccionados — en producción se subirían a Storage)
  doc1Name: string;
  doc2Name: string;
  doc3Name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────
const LANGUAGES_OPTIONS = [
  { code: 'es', label: 'Español' }, { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' }, { code: 'de', label: 'Deutsch' },
  { code: 'zh', label: '中文' },     { code: 'ar', label: 'العربية' },
];

const COUNTRIES = [
  { code: 'ES', name: 'España' }, { code: 'MX', name: 'México' },
  { code: 'AR', name: 'Argentina' }, { code: 'CO', name: 'Colombia' },
  { code: 'US', name: 'Estados Unidos' }, { code: 'GB', name: 'Reino Unido' },
  { code: 'FR', name: 'Francia' }, { code: 'DE', name: 'Alemania' },
  { code: 'IT', name: 'Italia' }, { code: 'PT', name: 'Portugal' },
  { code: 'UA', name: 'Ucrania' }, { code: 'MA', name: 'Marruecos' },
  { code: 'TR', name: 'Turquía' }, { code: 'SY', name: 'Siria' },
  { code: 'IQ', name: 'Irak' }, { code: 'AF', name: 'Afganistán' },
  { code: 'PK', name: 'Pakistán' }, { code: 'IN', name: 'India' },
  { code: 'CN', name: 'China' }, { code: 'BR', name: 'Brasil' },
  { code: 'NG', name: 'Nigeria' }, { code: 'ET', name: 'Etiopía' },
  { code: 'SO', name: 'Somalia' }, { code: 'SD', name: 'Sudán' },
  { code: 'SS', name: 'Sudán del Sur' }, { code: 'LY', name: 'Libia' },
  { code: 'YE', name: 'Yemen' }, { code: 'JP', name: 'Japón' },
  { code: 'KR', name: 'Corea del Sur' }, { code: 'SA', name: 'Arabia Saudí' },
  { code: 'EG', name: 'Egipto' }, { code: 'ZA', name: 'Sudáfrica' },
  { code: 'PL', name: 'Polonia' }, { code: 'RO', name: 'Rumanía' },
  { code: 'NL', name: 'Países Bajos' }, { code: 'CH', name: 'Suiza' },
  { code: 'SE', name: 'Suecia' }, { code: 'NO', name: 'Noruega' },
  { code: 'CA', name: 'Canadá' }, { code: 'AU', name: 'Australia' },
];

const GOV_LEVELS = [
  { value: 'national',             label: 'Nacional' },
  { value: 'autonomous_community', label: 'Comunidad autónoma / Estado' },
  { value: 'region',               label: 'Región / Provincia' },
  { value: 'city',                 label: 'Ciudad' },
  { value: 'municipality',         label: 'Municipio / Pueblo' },
  { value: 'other',                label: 'Otro' },
];

const JOURNALIST_TYPES = [
  { value: 'independent',      label: 'Periodista independiente' },
  { value: 'press_agency',     label: 'Pertenece a un medio / agencia' },
  { value: 'war_correspondent', label: 'Corresponsal de guerra' },
];

const ORG_TYPES = [
  { value: 'ngo',                  label: 'ONG' },
  { value: 'un_agency',            label: 'Agencia de la ONU' },
  { value: 'humanitarian',         label: 'Organización humanitaria' },
  { value: 'red_cross_affiliated', label: 'Cruz Roja / Media Luna Roja' },
  { value: 'government_agency',    label: 'Agencia gubernamental' },
  { value: 'other',                label: 'Otra' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componentes de UI
// ─────────────────────────────────────────────────────────────────────────────
function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-zinc-600 mt-1">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', maxLength }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; maxLength?: number;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} maxLength={maxLength}
      className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
    />
  );
}

function Select({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-zinc-500">
      {children}
    </select>
  );
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void;
  label: string; description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 w-full text-left"
    >
      <div className={`relative flex-shrink-0 w-10 h-6 rounded-full transition-colors mt-0.5 ${checked ? 'bg-white' : 'bg-zinc-700'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-transform ${checked ? 'translate-x-4 bg-black' : 'translate-x-0.5 bg-zinc-400'}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{description}</p>}
      </div>
    </button>
  );
}

function DocInput({ label, name, onChange }: {
  label: string; name: string; onChange: (name: string, v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 border-dashed hover:border-zinc-500 transition text-sm text-zinc-500 hover:text-zinc-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <span className={fileName ? 'text-green-400 truncate' : 'truncate'}>
          {fileName || 'Seleccionar archivo...'}
        </span>
        {fileName && <span className="ml-auto text-green-500 flex-shrink-0">✓</span>}
      </button>
      <input
        ref={ref} type="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) { setFileName(f.name); onChange(name, f.name); }
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export default function EditProfilePage() {
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState('none');
  const [verifOpen, setVerifOpen] = useState(false);
  const [verifSent, setVerifSent] = useState(false);
  const [verifSending, setVerifSending] = useState(false);
  const [verifError, setVerifError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>({
    displayName: '', username: '', bio: '', city: '',
    region: '', country: '', language: 'es', phone: '',
    warCrimesAccess: false,
  });

  const [verif, setVerif] = useState<VerifForm>({
    requestType: 'government',
    governmentLevel: '', governmentEntity: '', position: '', territory: '',
    journalistType: 'independent', pressAgencyName: '', licenseNumber: '',
    requestsWarCrime: false,
    orgName: '', orgType: 'ngo', orgCountry: '', orgRegNumber: '',
    doc1Name: '', doc2Name: '', doc3Name: '',
  });

  // ── Carga datos del usuario ────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) { window.location.href = '/auth/login'; return; }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setForm({
            displayName: d.displayName || '',
            username:    d.username    || '',
            bio:         d.bio         || '',
            city:        d.city        || '',
            region:      d.region      || '',
            country:     d.country     || '',
            language:    d.language    || 'es',
            phone:       d.phone       || '',
            warCrimesAccess: d.warCrimesAccess || false,
          });
          setVerificationStatus(d.verificationStatus || 'none');
          if (d.profilePicture) setAvatarPreview(d.profilePicture);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    });
    return unsub;
  }, []);

  const setF = (field: keyof FormData) => (v: any) =>
    setForm(prev => ({ ...prev, [field]: v }));

  const setV = (field: keyof VerifForm) => (v: any) =>
    setVerif(prev => ({ ...prev, [field]: v }));

  // ── Guardar perfil ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError(''); setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No autenticado');
      if (!form.displayName.trim()) throw new Error('El nombre es obligatorio');
      if (!form.username.trim())    throw new Error('El usuario es obligatorio');

      await updateProfile(user, { displayName: form.displayName });
      await updateDoc(doc(db, 'users', user.uid), {
        displayName:     form.displayName,
        username:        form.username.toLowerCase().replace(/\s+/g, ''),
        bio:             form.bio,
        city:            form.city,
        region:          form.region,
        country:         form.country,
        language:        form.language,
        phone:           form.phone,
        warCrimesAccess: form.warCrimesAccess,
      });

      setSuccess(true);
      setTimeout(() => { setSuccess(false); window.location.href = '/profile/me'; }, 1500);
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // ── Enviar solicitud de verificación ──────────────────────────────────────
  const handleVerifSubmit = async () => {
    setVerifError(''); setVerifSending(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No autenticado');

      // Validaciones mínimas por tipo
      if (verif.requestType === 'government' && (!verif.governmentEntity || !verif.position))
        throw new Error('Rellena la entidad gubernamental y el cargo');
      if (verif.requestType === 'journalist' && !verif.licenseNumber)
        throw new Error('Introduce el número de licencia o credencial');
      if (verif.requestType === 'organization' && (!verif.orgName || !verif.orgRegNumber))
        throw new Error('Rellena el nombre y número de registro de la organización');
      if (!verif.doc1Name)
        throw new Error('Debes adjuntar al menos el documento de identidad / credencial principal');

      const docData: any = {
        userId:      user.uid,
        requestType: verif.requestType,
        status:      'pending',
        submittedAt: serverTimestamp(),
        // Nota: en producción los docs se subirían a Storage y aquí irían las URLs
        documents:   [verif.doc1Name, verif.doc2Name, verif.doc3Name].filter(Boolean),
      };

      if (verif.requestType === 'government') {
        docData.governmentLevel  = verif.governmentLevel;
        docData.governmentEntity = verif.governmentEntity;
        docData.position         = verif.position;
        docData.territory        = verif.territory;
        docData.country          = form.country;
      }
      if (verif.requestType === 'journalist') {
        docData.journalistType           = verif.journalistType;
        docData.pressAgencyName          = verif.pressAgencyName;
        docData.journalistLicenseNumber  = verif.licenseNumber;
        docData.requestsWarCrimePosting  = verif.requestsWarCrime;
      }
      if (verif.requestType === 'organization') {
        docData.orgName             = verif.orgName;
        docData.orgType             = verif.orgType;
        docData.orgCountry          = verif.orgCountry || form.country;
        docData.orgRegistrationNumber = verif.orgRegNumber;
      }

      await addDoc(collection(db, 'verificationRequests'), docData);
      await updateDoc(doc(db, 'users', user.uid), { verificationStatus: 'pending' });

      setVerificationStatus('pending');
      setVerifSent(true);
      setVerifOpen(false);
    } catch (e: any) {
      setVerifError(e.message || 'Error al enviar la solicitud');
    } finally {
      setVerifSending(false);
    }
  };

  const initials = form.displayName.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() || '?';

  const STATUS_INFO: Record<string, { label: string; color: string; icon: string }> = {
    none:         { label: 'Sin solicitud',   color: 'text-zinc-500',  icon: '○' },
    pending:      { label: 'Pendiente de revisión', color: 'text-yellow-400', icon: '⏳' },
    under_review: { label: 'En revisión',     color: 'text-blue-400',  icon: '🔍' },
    approved:     { label: 'Verificado ✓',   color: 'text-green-400', icon: '✓' },
    rejected:     { label: 'Rechazado',       color: 'text-red-400',   icon: '✕' },
  };
  const statusInfo = STATUS_INFO[verificationStatus] || STATUS_INFO.none;

  if (loading) return (
    <div className="max-w-xl mx-auto px-4 py-12 animate-pulse space-y-4">
      <div className="w-20 h-20 rounded-full bg-zinc-800 mx-auto" />
      {[1,2,3,4].map(i => <div key={i} className="h-10 bg-zinc-800 rounded-xl" />)}
    </div>
  );

  return (
    <div className="max-w-xl mx-auto px-4 py-6">

      {/* ── Cabecera ── */}
      <div className="flex items-center gap-3 mb-6">
        <a href="/profile/me" className="p-2 rounded-full hover:bg-zinc-900 transition text-zinc-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </a>
        <h1 className="text-lg font-bold text-white">Editar perfil</h1>
        <button onClick={handleSave} disabled={saving}
          className="ml-auto px-4 py-1.5 rounded-full bg-white text-black text-sm font-semibold hover:opacity-90 transition disabled:opacity-50">
          {saving ? 'Guardando...' : success ? '✓ Guardado' : 'Guardar'}
        </button>
      </div>

      {/* ── Avatar ── */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative cursor-pointer group" onClick={() => fileRef.current?.click()}>
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar"
              className="w-24 h-24 rounded-full object-cover border-2 border-zinc-700 group-hover:opacity-80 transition" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-white text-3xl font-bold group-hover:opacity-80 transition">
              {initials}
            </div>
          )}
          <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 5*1024*1024) { setError('La imagen no puede superar 5 MB'); return; }
            const reader = new FileReader();
            reader.onload = ev => setAvatarPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
          }} />
        <p className="text-xs text-zinc-500 mt-2">Toca para cambiar · Máx. 5 MB</p>
        <p className="text-xs text-zinc-700 mt-0.5">(Subida requiere plan Blaze)</p>
      </div>

      <div className="flex flex-col gap-4">

        {/* ── Información básica ── */}
        <Field label="Nombre completo" required>
          <Input value={form.displayName} onChange={setF('displayName')} placeholder="Nombre Apellido" maxLength={60} />
        </Field>

        <Field label="Usuario" required>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">@</span>
            <input type="text" value={form.username} onChange={e => setF('username')(e.target.value)}
              maxLength={30} placeholder="tuusuario"
              className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" />
          </div>
        </Field>

        <Field label="Biografía" hint={`${form.bio.length}/160`}>
          <textarea value={form.bio} onChange={e => setF('bio')(e.target.value)}
            maxLength={160} rows={3} placeholder="Cuéntanos sobre ti..."
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none" />
        </Field>

        <Field label="Teléfono" hint="Necesario para actividades de voluntariado">
          <Input value={form.phone} onChange={setF('phone')} placeholder="+34 600 000 000" type="tel" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ciudad">
            <Input value={form.city} onChange={setF('city')} placeholder="Madrid" />
          </Field>
          <Field label="Región">
            <Input value={form.region} onChange={setF('region')} placeholder="Com. de Madrid" />
          </Field>
        </div>

        <Field label="País">
          <Select value={form.country} onChange={setF('country')}>
            <option value="">Selecciona un país</option>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select>
        </Field>

        <Field label="Idioma preferido">
          <div className="flex flex-wrap gap-2">
            {LANGUAGES_OPTIONS.map(l => (
              <button key={l.code} type="button" onClick={() => setF('language')(l.code)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition border ${
                  form.language === l.code
                    ? 'bg-white text-black border-white'
                    : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-white'
                }`}>
                {l.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="h-px bg-zinc-800" />

        {/* ── Acceso a crímenes de guerra ── */}
        <div className="bg-zinc-900 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">⚠️</span>
            <h3 className="text-sm font-semibold text-white">Sección de crímenes de guerra</h3>
          </div>
          <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
            Esta sección contiene documentación de posibles crímenes de guerra, conflictos armados y violaciones del Derecho Internacional Humanitario. El contenido puede ser perturbador. Al activar el acceso confirmas que eres mayor de edad y que deseas ver este contenido de forma consciente y voluntaria.
          </p>
          <Toggle
            checked={form.warCrimesAccess}
            onChange={setF('warCrimesAccess')}
            label="Activar acceso a crímenes de guerra"
            description={form.warCrimesAccess
              ? 'Tienes acceso activado. Puedes ver la sección de crímenes de guerra.'
              : 'Acceso desactivado. La sección no será visible para ti.'}
          />
          {form.warCrimesAccess && (
            <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-red-900/20 border border-red-800/30 rounded-lg">
              <span className="text-red-400 text-xs mt-0.5 flex-shrink-0">⚠</span>
              <p className="text-xs text-red-400 leading-relaxed">
                Al guardar confirmas que eres mayor de edad y aceptas ver contenido de naturaleza violenta o perturbadora relacionado con conflictos armados.
              </p>
            </div>
          )}
        </div>

        <div className="h-px bg-zinc-800" />

        {/* ── Verificación de cuenta ── */}
        <div className="bg-zinc-900 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.491 4.491 0 01-3.497-1.307 4.491 4.491 0 01-1.307-3.497A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.492 4.492 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
              </svg>
              <h3 className="text-sm font-semibold text-white">Verificación de cuenta</h3>
            </div>
            <span className={`text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.icon} {statusInfo.label}
            </span>
          </div>

          <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
            Solo cuentas verificadas pueden publicar posts. Puedes solicitar verificación como representante de un gobierno, periodista oficial u organización humanitaria.
          </p>

          {/* Badges explicativos */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { icon: '🏛️', label: 'Gobierno', desc: 'Representante oficial' },
              { icon: '📰', label: 'Periodista', desc: 'Prensa acreditada' },
              { icon: '🤝', label: 'Organización', desc: 'ONG / entidad' },
            ].map(b => (
              <div key={b.label} className="flex flex-col items-center gap-1 p-2 bg-zinc-800 rounded-lg text-center">
                <span className="text-xl">{b.icon}</span>
                <span className="text-xs font-medium text-white">{b.label}</span>
                <span className="text-xs text-zinc-500">{b.desc}</span>
              </div>
            ))}
          </div>

          {verifSent && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 border border-green-800/30 rounded-lg mb-3">
              <span className="text-green-400 text-sm">✓</span>
              <p className="text-xs text-green-400">Solicitud enviada. Un moderador de GloVol la revisará en 24-72 horas.</p>
            </div>
          )}

          {verificationStatus === 'approved' ? (
            <p className="text-xs text-green-400 font-medium">✓ Tu cuenta está verificada. Puedes publicar posts.</p>
          ) : verificationStatus === 'pending' || verificationStatus === 'under_review' ? (
            <p className="text-xs text-yellow-400">Tu solicitud está siendo revisada. Te notificaremos cuando haya novedades.</p>
          ) : verificationStatus === 'rejected' ? (
            <div>
              <p className="text-xs text-red-400 mb-2">Tu solicitud anterior fue rechazada. Puedes volver a intentarlo con documentación actualizada.</p>
              <button onClick={() => setVerifOpen(!verifOpen)}
                className="text-xs text-blue-400 hover:text-blue-300 transition font-medium">
                {verifOpen ? 'Cerrar formulario ↑' : 'Nueva solicitud →'}
              </button>
            </div>
          ) : (
            <button onClick={() => setVerifOpen(!verifOpen)}
              className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition font-medium">
              {verifOpen ? 'Cerrar ↑' : 'Solicitar verificación →'}
            </button>
          )}
        </div>

        {/* ── Formulario de verificación (expandible) ── */}
        {verifOpen && verificationStatus !== 'approved' && (
          <div className="border border-zinc-700 rounded-xl p-4 flex flex-col gap-4 bg-zinc-950">
            <h3 className="text-sm font-semibold text-white">Solicitud de verificación</h3>

            {/* Tipo de cuenta */}
            <Field label="Tipo de cuenta a verificar" required>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'government',   icon: '🏛️', label: 'Gobierno' },
                  { value: 'journalist',   icon: '📰', label: 'Periodista' },
                  { value: 'organization', icon: '🤝', label: 'Organización' },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setV('requestType')(opt.value as VerifType)}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-medium transition ${
                      verif.requestType === opt.value
                        ? 'border-white bg-zinc-800 text-white'
                        : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
                    }`}>
                    <span className="text-xl">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>

            {/* ── Campos específicos por tipo ── */}

            {verif.requestType === 'government' && (
              <>
                <Field label="Nivel administrativo" required>
                  <Select value={verif.governmentLevel} onChange={setV('governmentLevel')}>
                    <option value="">Selecciona el nivel</option>
                    {GOV_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </Select>
                </Field>
                <Field label="Nombre de la entidad gubernamental" required hint="Ej: Ministerio del Interior, Comunidad de Madrid...">
                  <Input value={verif.governmentEntity} onChange={setV('governmentEntity')} placeholder="Ministerio del Interior" />
                </Field>
                <Field label="Territorio o jurisdicción" hint="Ej: España, Comunidad de Madrid, Valencia...">
                  <Input value={verif.territory} onChange={setV('territory')} placeholder="España" />
                </Field>
                <Field label="Cargo oficial" required hint="Tu puesto en la entidad">
                  <Input value={verif.position} onChange={setV('position')} placeholder="Director General de Protección Civil" />
                </Field>
                <Field label="Documentos requeridos">
                  <div className="flex flex-col gap-2">
                    <DocInput label="Documento de identidad oficial *" name="doc1" onChange={(_, v) => setV('doc1Name')(v)} />
                    <DocInput label="Autorización firmada por el gobierno *" name="doc2" onChange={(_, v) => setV('doc2Name')(v)} />
                    <DocInput label="Credencial adicional (opcional)" name="doc3" onChange={(_, v) => setV('doc3Name')(v)} />
                  </div>
                </Field>
              </>
            )}

            {verif.requestType === 'journalist' && (
              <>
                <Field label="Tipo de periodista" required>
                  <Select value={verif.journalistType} onChange={setV('journalistType')}>
                    {JOURNALIST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </Select>
                </Field>
                {verif.journalistType === 'press_agency' && (
                  <Field label="Nombre del medio o agencia" hint="Ej: El País, Reuters, AFP...">
                    <Input value={verif.pressAgencyName} onChange={setV('pressAgencyName')} placeholder="El País" />
                  </Field>
                )}
                <Field label="Número de licencia o colegiatura" required hint="Número de tu carnet de prensa o registro profesional">
                  <Input value={verif.licenseNumber} onChange={setV('licenseNumber')} placeholder="MAD-2024-001234" />
                </Field>
                <div className="bg-zinc-900 rounded-xl p-3">
                  <Toggle
                    checked={verif.requestsWarCrime}
                    onChange={setV('requestsWarCrime')}
                    label="Solicitar permiso para publicar en crímenes de guerra"
                    description="Requiere acreditación adicional como corresponsal de guerra o periodista en zonas de conflicto activo."
                  />
                </div>
                <Field label="Documentos requeridos">
                  <div className="flex flex-col gap-2">
                    <DocInput label="Carnet de prensa / credencial oficial *" name="doc1" onChange={(_, v) => setV('doc1Name')(v)} />
                    <DocInput label="Carta de acreditación del medio (si aplica)" name="doc2" onChange={(_, v) => setV('doc2Name')(v)} />
                    {verif.requestsWarCrime && (
                      <DocInput label="Acreditación como corresponsal de guerra *" name="doc3" onChange={(_, v) => setV('doc3Name')(v)} />
                    )}
                  </div>
                </Field>
              </>
            )}

            {verif.requestType === 'organization' && (
              <>
                <Field label="Nombre de la organización" required>
                  <Input value={verif.orgName} onChange={setV('orgName')} placeholder="Cruz Roja Española" />
                </Field>
                <Field label="Tipo de organización" required>
                  <Select value={verif.orgType} onChange={setV('orgType')}>
                    {ORG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </Select>
                </Field>
                <Field label="País de registro">
                  <Select value={verif.orgCountry || form.country} onChange={setV('orgCountry')}>
                    <option value="">Mismo que mi país</option>
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </Select>
                </Field>
                <Field label="Número de registro oficial" required hint="Número con el que la organización está registrada legalmente">
                  <Input value={verif.orgRegNumber} onChange={setV('orgRegNumber')} placeholder="G-28000000" />
                </Field>
                <Field label="Documentos requeridos">
                  <div className="flex flex-col gap-2">
                    <DocInput label="Certificado de registro oficial *" name="doc1" onChange={(_, v) => setV('doc1Name')(v)} />
                    <DocInput label="Estatutos de la organización" name="doc2" onChange={(_, v) => setV('doc2Name')(v)} />
                    <DocInput label="Documento adicional (opcional)" name="doc3" onChange={(_, v) => setV('doc3Name')(v)} />
                  </div>
                </Field>
              </>
            )}

            {/* Aviso legal */}
            <div className="flex items-start gap-2 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg">
              <span className="text-zinc-500 text-xs mt-0.5 flex-shrink-0">ℹ</span>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Un moderador de GloVol revisará tu solicitud y los documentos adjuntos en un plazo de 24-72 horas. La información facilitada se usará exclusivamente para verificar tu identidad y no se compartirá con terceros. Proporcionar documentación falsa implica la suspensión permanente de la cuenta.
              </p>
            </div>

            {verifError && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-800/30 rounded-lg">
                <span className="text-red-400 flex-shrink-0">✕</span>
                <p className="text-xs text-red-400">{verifError}</p>
              </div>
            )}

            <button onClick={handleVerifSubmit} disabled={verifSending}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition disabled:opacity-50">
              {verifSending ? 'Enviando...' : 'Enviar solicitud de verificación'}
            </button>
          </div>
        )}

        {/* ── Feedback guardar ── */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-900/20 border border-red-800/40">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-900/20 border border-green-800/40">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-green-400">Perfil actualizado. Redirigiendo...</p>
          </div>
        )}

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 rounded-xl bg-white text-black font-semibold text-sm hover:opacity-90 transition disabled:opacity-50 mt-2">
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}
