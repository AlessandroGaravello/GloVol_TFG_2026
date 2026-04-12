import { useState, useEffect } from 'react';
import { auth, db } from '../../lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, where, orderBy, limit } from 'firebase/firestore';

interface Props {
  onClose: () => void;
  onCreated: (postId: string) => void;
}

interface DisasterOption {
  id: string;
  title: string;
  country: string;
  severity: string;
  type: string;
}

const CONTENT_TYPES = [
  { value: 'situation_report',  label: '📋 Informe de situación' },
  { value: 'official_statement',label: '📢 Comunicado oficial' },
  { value: 'field_report',      label: '📰 Crónica / Reportaje' },
  { value: 'resource_update',   label: '🏕️ Recursos disponibles' },
  { value: 'volunteer_call',    label: '🙋 Llamada a voluntarios' },
  { value: 'donation_appeal',   label: '💚 Llamada a donaciones' },
  { value: 'war_crime_report',  label: '⚠️ Crimen de guerra' },
];

const URGENCY_LEVELS = [
  { value: 'critical', label: '⚡ Crítico', style: 'border-red-700 text-red-400 bg-red-900/20' },
  { value: 'high',     label: '🔴 Alto',    style: 'border-orange-700 text-orange-400 bg-orange-900/20' },
  { value: 'medium',   label: '🟡 Medio',   style: 'border-yellow-700 text-yellow-400 bg-yellow-900/20' },
  { value: 'low',      label: '🟢 Bajo',    style: 'border-green-700 text-green-400 bg-green-900/20' },
];

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-zinc-600 mt-1">{hint}</p>}
    </div>
  );
}

export default function CreatePostModal({ onClose, onCreated }: Props) {
  const [disasters, setDisasters] = useState<DisasterOption[]>([]);
  const [loadingDisasters, setLoadingDisasters] = useState(true);
  const [disasterSearch, setDisasterSearch] = useState('');

  const [form, setForm] = useState({
    disasterId: '',
    title: '',
    content: '',
    contentType: 'situation_report',
    urgencyLevel: 'high',
    locationName: '',
    needsDonations: false,
    needsVolunteers: false,
    imageUrl: '',
    imageCaption: '',
    language: 'es',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cargar catástrofes activas
  useEffect(() => {
    const load = async () => {
      try {
        const q = query(
          collection(db, 'disasters'),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const snap = await getDocs(q);
        setDisasters(snap.docs.map(d => ({
          id: d.id,
          title: d.data().title,
          country: d.data().country || '',
          severity: d.data().severity || '',
          type: d.data().type || '',
        })));
      } catch (e) {
        console.error('Error cargando catástrofes:', e);
      } finally {
        setLoadingDisasters(false);
      }
    };
    load();
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const toggle = (k: 'needsDonations' | 'needsVolunteers') =>
    setForm(p => ({ ...p, [k]: !p[k] }));

  const filteredDisasters = disasters.filter(d =>
    d.title.toLowerCase().includes(disasterSearch.toLowerCase()) ||
    d.id.toLowerCase().includes(disasterSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    setError('');
    if (!form.disasterId)        { setError('Selecciona una catástrofe.'); return; }
    if (!form.title.trim())      { setError('El título es obligatorio.'); return; }
    if (!form.content.trim())    { setError('El contenido es obligatorio.'); return; }
    if (form.content.length < 20){ setError('El contenido debe tener al menos 20 caracteres.'); return; }

    const user = auth.currentUser;
    if (!user) { window.location.href = '/auth/login'; return; }

    setLoading(true);
    try {
      const media: any[] = [];
      if (form.imageUrl.trim()) {
        media.push({ url: form.imageUrl.trim(), type: 'image', caption: form.imageCaption.trim() });
      }

      const isWarCrime = form.contentType === 'war_crime_report';

      const docRef = await addDoc(collection(db, 'posts'), {
        disasterId: form.disasterId,
        authorId: user.uid,
        authorType: 'organization',
        title: form.title.trim(),
        content: form.content.trim(),
        contentType: form.contentType,
        urgencyLevel: form.urgencyLevel,
        language: form.language,
        locationName: form.locationName.trim(),
        media,
        isActive: true,
        isAdminVerified: false,
        isPinned: false,
        isWarCrimeReport: isWarCrime,
        needsDonations: form.needsDonations,
        needsVolunteers: form.needsVolunteers,
        donationApprovalStatus: 'pending',
        stripePaymentLinkUrl: '',
        stripePaymentLinkId: '',
        // Desnormalizar país y tipo para que los filtros del feed funcionen sin join
        country: disasters.find(d => d.id === form.disasterId)?.country || '',
        disasterType: disasters.find(d => d.id === form.disasterId)?.type || '',
        likesCount: 0,
        sharesCount: 0,
        commentsCount: 0,
        volunteerCount: 0,
        donationCount: 0,
        totalRaisedEUR: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      onCreated(docRef.id);
    } catch (e: any) {
      console.error(e);
      if (e?.code === 'permission-denied') {
        setError('Sin permisos. Asegúrate de que tu cuenta está verificada en Firestore.');
      } else {
        setError(e?.message || 'Error al crear el post.');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedDisaster = disasters.find(d => d.id === form.disasterId);

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
            <h2 className="text-base font-bold text-white">📝 Nuevo post</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Publica información sobre una catástrofe</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition text-xl leading-none">✕</button>
        </div>

        <div className="p-5 flex flex-col gap-4">

          {/* Selector de catástrofe */}
          <Field label="Catástrofe vinculada" required>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Buscar catástrofe..."
                value={disasterSearch}
                onChange={e => setDisasterSearch(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
              />
              {loadingDisasters ? (
                <p className="text-xs text-zinc-500 px-1">Cargando catástrofes...</p>
              ) : filteredDisasters.length === 0 ? (
                <p className="text-xs text-zinc-600 px-1">No se encontraron catástrofes activas.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto flex flex-col gap-1 rounded-xl"
                  style={{ border: '1px solid var(--border)' }}>
                  {filteredDisasters.map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => { setForm(p => ({ ...p, disasterId: d.id })); setDisasterSearch(''); }}
                      className="flex items-center gap-2 px-3 py-2.5 text-left text-sm transition hover:opacity-80"
                      style={{
                        background: form.disasterId === d.id ? 'var(--gv-accent)22' : 'var(--bg-input)',
                        borderLeft: form.disasterId === d.id ? '3px solid var(--gv-accent)' : '3px solid transparent',
                      }}
                    >
                      <span className="text-xs font-mono text-zinc-500 flex-shrink-0">{d.id.slice(0,12)}…</span>
                      <span className="text-white truncate flex-1">{d.title}</span>
                      {form.disasterId === d.id && <span style={{ color: 'var(--gv-accent)' }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
              {selectedDisaster && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                  style={{ background: 'var(--gv-accent)15', border: '1px solid var(--gv-accent)40' }}>
                  <span style={{ color: 'var(--gv-accent)' }}>✓</span>
                  <span className="text-white font-medium">{selectedDisaster.title}</span>
                  <span className="text-zinc-500">· #{selectedDisaster.id}</span>
                </div>
              )}
            </div>
          </Field>

          {/* Tipo de contenido */}
          <Field label="Tipo de contenido" required>
            <select value={form.contentType} onChange={set('contentType')}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              {CONTENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>

          {/* Urgencia */}
          <Field label="Nivel de urgencia" required>
            <div className="grid grid-cols-4 gap-2">
              {URGENCY_LEVELS.map(u => (
                <button key={u.value} type="button"
                  onClick={() => setForm(p => ({ ...p, urgencyLevel: u.value }))}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    form.urgencyLevel === u.value ? u.style : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'
                  }`}>
                  {u.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Título */}
          <Field label="Título" required>
            <input type="text" value={form.title} onChange={set('title')} maxLength={120}
              placeholder="Ej: Situación crítica en Paiporta — necesitamos voluntarios"
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
            <p className="text-xs text-zinc-600 mt-1 text-right">{form.title.length}/120</p>
          </Field>

          {/* Contenido */}
          <Field label="Contenido" required hint="Mínimo 20 caracteres. Sé claro y conciso.">
            <textarea value={form.content} onChange={set('content')} rows={5}
              placeholder="Describe la situación con detalle: qué ha ocurrido, qué se necesita, cómo pueden ayudar..."
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none resize-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
            <p className="text-xs text-zinc-600 mt-1 text-right">{form.content.length} caracteres</p>
          </Field>

          {/* Ubicación */}
          <Field label="Nombre de la ubicación">
            <input type="text" value={form.locationName} onChange={set('locationName')}
              placeholder="Ej: Paiporta, Valencia"
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
          </Field>

          {/* Imagen */}
          <Field label="URL de imagen (opcional)">
            <input type="url" value={form.imageUrl} onChange={set('imageUrl')}
              placeholder="https://ejemplo.com/imagen.jpg"
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none mb-2"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
            {form.imageUrl && (
              <input type="text" value={form.imageCaption} onChange={set('imageCaption')}
                placeholder="Pie de foto (opcional)"
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
            )}
          </Field>

          {/* Idioma */}
          <Field label="Idioma del post">
            <div className="flex gap-2">
              {['es','en','fr','de','ar','zh'].map(l => (
                <button key={l} type="button" onClick={() => setForm(p => ({ ...p, language: l }))}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition border"
                  style={{
                    background: form.language === l ? 'white' : 'var(--bg-input)',
                    color: form.language === l ? 'black' : 'var(--text-2)',
                    borderColor: form.language === l ? 'white' : 'var(--border)',
                  }}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </Field>

          {/* Toggles */}
          <div className="flex flex-col gap-3 px-4 py-3 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold text-zinc-400">Este post necesita:</p>
            <button type="button" onClick={() => toggle('needsVolunteers')}
              className="flex items-center gap-3 text-left">
              <div className={`relative flex-shrink-0 w-10 h-6 rounded-full transition-colors ${form.needsVolunteers ? 'bg-white' : 'bg-zinc-700'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-transform ${form.needsVolunteers ? 'translate-x-4 bg-black' : 'translate-x-0.5 bg-zinc-400'}`} />
              </div>
              <span className="text-sm text-white">🙋 Voluntarios</span>
            </button>
            <button type="button" onClick={() => toggle('needsDonations')}
              className="flex items-center gap-3 text-left">
              <div className={`relative flex-shrink-0 w-10 h-6 rounded-full transition-colors ${form.needsDonations ? 'bg-white' : 'bg-zinc-700'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-transform ${form.needsDonations ? 'translate-x-4 bg-black' : 'translate-x-0.5 bg-zinc-400'}`} />
              </div>
              <div>
                <span className="text-sm text-white">💚 Donaciones</span>
                {form.needsDonations && (
                  <p className="text-xs text-zinc-500">El link de Stripe debe ser aprobado por un moderador.</p>
                )}
              </div>
            </button>
          </div>

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
              style={{ background: '#2563eb' }}>
              {loading ? 'Publicando...' : '📝 Publicar post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
