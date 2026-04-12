import { useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, GeoPoint } from 'firebase/firestore';

interface Props {
  onClose: () => void;
  onCreated: (disasterId: string) => void;
}

const DISASTER_TYPES = [
  { value: 'natural_disaster', label: '🌊 Catástrofe natural' },
  { value: 'war',              label: '⚔️ Conflicto armado' },
  { value: 'epidemic',         label: '🦠 Epidemia / Pandemia' },
  { value: 'humanitarian_crisis', label: '🆘 Crisis humanitaria' },
  { value: 'industrial_accident', label: '🏭 Accidente industrial' },
];

const SUBTYPES: Record<string, { value: string; label: string }[]> = {
  natural_disaster: [
    { value: 'flood',     label: 'Inundación' },
    { value: 'earthquake',label: 'Terremoto' },
    { value: 'wildfire',  label: 'Incendio forestal' },
    { value: 'hurricane', label: 'Huracán / Tifón' },
    { value: 'drought',   label: 'Sequía' },
    { value: 'landslide', label: 'Corrimiento de tierra' },
    { value: 'tsunami',   label: 'Tsunami' },
    { value: 'volcano',   label: 'Erupción volcánica' },
    { value: 'other',     label: 'Otro' },
  ],
  war: [
    { value: 'armed_conflict',     label: 'Conflicto armado' },
    { value: 'civil_war',          label: 'Guerra civil' },
    { value: 'occupation',         label: 'Ocupación' },
    { value: 'border_conflict',    label: 'Conflicto fronterizo' },
  ],
  epidemic: [
    { value: 'pandemic',   label: 'Pandemia' },
    { value: 'outbreak',   label: 'Brote epidémico' },
  ],
  humanitarian_crisis: [
    { value: 'refugee',    label: 'Crisis de refugiados' },
    { value: 'famine',     label: 'Hambruna' },
    { value: 'displacement', label: 'Desplazamiento masivo' },
  ],
  industrial_accident: [
    { value: 'chemical',   label: 'Accidente químico' },
    { value: 'nuclear',    label: 'Accidente nuclear' },
    { value: 'explosion',  label: 'Explosión' },
    { value: 'oil_spill',  label: 'Derrame de petróleo' },
  ],
};

const SEVERITIES = [
  { value: 'critical', label: '⚡ Crítico', color: 'text-red-400 border-red-700 bg-red-900/20' },
  { value: 'high',     label: '🔴 Alto',    color: 'text-orange-400 border-orange-700 bg-orange-900/20' },
  { value: 'medium',   label: '🟡 Medio',   color: 'text-yellow-400 border-yellow-700 bg-yellow-900/20' },
  { value: 'low',      label: '🟢 Bajo',    color: 'text-green-400 border-green-700 bg-green-900/20' },
];

const COUNTRIES = [
  'AF','AL','DE','AD','AO','SA','DZ','AR','AM','AU','AT','AZ','BE','BO','BA','BR',
  'BG','CA','CL','CN','CO','KR','CR','HR','CU','DK','EC','EG','SV','AE','SK','SI',
  'ES','US','EE','ET','PH','FI','FR','GE','GH','GR','GT','HN','HU','IN','ID','IQ',
  'IR','IE','IL','IT','JP','JO','KZ','KE','KW','LV','LB','LY','LT','LU','MK','MY',
  'MA','MX','MD','MN','ME','MZ','NA','NP','NI','NG','NO','NZ','NL','PK','PA','PY',
  'PE','PL','PT','QA','GB','CZ','DO','RO','RU','RS','SG','SY','SO','LK','ZA','SD',
  'SE','CH','TH','TW','TZ','TN','TR','UA','UG','UY','VE','VN','YE','ZM','ZW',
];

const COUNTRY_NAMES: Record<string, string> = {
  ES:'España', UA:'Ucrania', US:'Estados Unidos', TR:'Turquía', MA:'Marruecos',
  SY:'Siria', IQ:'Irak', AF:'Afganistán', GB:'Reino Unido', FR:'Francia',
  DE:'Alemania', IT:'Italia', PT:'Portugal', MX:'México', AR:'Argentina',
  BR:'Brasil', CO:'Colombia', IN:'India', CN:'China', JP:'Japón',
  RU:'Rusia', PL:'Polonia', NG:'Nigeria', ET:'Etiopía', EG:'Egipto',
  SA:'Arabia Saudí', SO:'Somalia', SD:'Sudán', YE:'Yemen', LY:'Libia',
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function CreateDisasterModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    title: '',
    type: 'natural_disaster',
    subtype: '',
    severity: 'high',
    country: 'ES',
    region: '',
    affectedArea: '',
    affectedPopulation: '',
    lat: '',
    lng: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async () => {
    setError('');
    if (!form.title.trim()) { setError('El título es obligatorio.'); return; }
    if (!form.subtype)       { setError('Selecciona un subtipo.'); return; }
    if (!form.affectedArea.trim()) { setError('Indica el área afectada.'); return; }

    const user = auth.currentUser;
    if (!user) { window.location.href = '/auth/login'; return; }

    setLoading(true);
    try {
      const id = `${form.country}-${new Date().getFullYear()}-${form.subtype.toUpperCase().slice(0,4)}-${Date.now().toString().slice(-4)}`;

      const data: any = {
        disasterId: id,
        title: form.title.trim(),
        type: form.type,
        subtype: form.subtype,
        status: 'active',
        severity: form.severity,
        isWarRelated: form.type === 'war',
        verifiedByAdmin: false,
        country: form.country,
        region: form.region.trim(),
        affectedArea: form.affectedArea.trim(),
        affectedPopulation: parseInt(form.affectedPopulation) || 0,
        casualties: 0,
        displacedPeople: 0,
        startDate: serverTimestamp(),
        endDate: null,
        donationProvider: 'stripe',
        stripePaymentLinkUrl: '',
        stripePaymentLinkId: '',
        totalDonationsEUR: 0,
        totalDonorsCount: 0,
        totalVolunteersRegistered: 0,
        totalVolunteersActive: 0,
        postsCount: 0,
        tags: [form.type, form.subtype, form.country.toLowerCase()],
        relatedDisasterIds: [],
        coverImage: '',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      };

      if (form.lat && form.lng) {
        data.coordinates = new GeoPoint(parseFloat(form.lat), parseFloat(form.lng));
        data.radiusKm = 50;
      }

      await addDoc(collection(db, 'disasters'), data);
      onCreated(id);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Error al crear la catástrofe. Comprueba tus permisos.');
    } finally {
      setLoading(false);
    }
  };

  const subtypes = SUBTYPES[form.type] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl z-10"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div>
            <h2 className="text-base font-bold text-white">🌍 Nueva catástrofe</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Registra un nuevo evento de emergencia</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition text-xl leading-none">✕</button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Título */}
          <Field label="Título" required>
            <input type="text" value={form.title} onChange={set('title')} maxLength={100}
              placeholder="Ej: Inundaciones en el sur de España — 2025"
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
          </Field>

          {/* Tipo + Subtipo */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo" required>
              <select value={form.type} onChange={e => { set('type')(e); setForm(p => ({ ...p, subtype: '' })); }}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                {DISASTER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Subtipo" required>
              <select value={form.subtype} onChange={set('subtype')}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                <option value="">Seleccionar...</option>
                {subtypes.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </div>

          {/* Severidad */}
          <Field label="Severidad" required>
            <div className="grid grid-cols-4 gap-2">
              {SEVERITIES.map(s => (
                <button key={s.value} type="button" onClick={() => setForm(p => ({ ...p, severity: s.value }))}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    form.severity === s.value ? s.color : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </Field>

          {/* País + Región */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="País" required>
              <select value={form.country} onChange={set('country')}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                {COUNTRIES.sort((a,b) => (COUNTRY_NAMES[a]||a).localeCompare(COUNTRY_NAMES[b]||b)).map(c => (
                  <option key={c} value={c}>{COUNTRY_NAMES[c] || c}</option>
                ))}
              </select>
            </Field>
            <Field label="Región / Provincia">
              <input type="text" value={form.region} onChange={set('region')} placeholder="Ej: Comunitat Valenciana"
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
            </Field>
          </div>

          {/* Área afectada */}
          <Field label="Área afectada" required>
            <input type="text" value={form.affectedArea} onChange={set('affectedArea')}
              placeholder="Ej: Valencia, Castellón, sur de Tarragona"
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
          </Field>

          {/* Población afectada */}
          <Field label="Población afectada (aprox.)">
            <input type="number" value={form.affectedPopulation} onChange={set('affectedPopulation')} placeholder="120000"
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
          </Field>

          {/* Coordenadas */}
          <Field label="Coordenadas (opcional)">
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={form.lat} onChange={set('lat')} placeholder="Latitud: 39.47"
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
              <input type="text" value={form.lng} onChange={set('lng')} placeholder="Longitud: -0.37"
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
            </div>
          </Field>

          {error && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-900/20 border border-red-800/40">
              <span className="text-red-400 flex-shrink-0">✕</span>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white transition border border-zinc-700 hover:border-zinc-500">
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--gv-accent)' }}>
              {loading ? 'Creando...' : '🌍 Crear catástrofe'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
