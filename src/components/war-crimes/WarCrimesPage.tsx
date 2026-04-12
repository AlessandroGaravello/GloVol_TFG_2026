import { useState, useEffect } from 'react';
import { db, auth } from '../../lib/firebase';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface WarCrimeReport {
  reportId: string; authorId: string; title: string; content: string;
  location?: string; date?: string; evidenceUrls?: string[];
  createdAt: any; authorName?: string;
}

function timeAgo(ts: any) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' });
}

export default function WarCrimesPage() {
  const [reports, setReports]         = useState<WarCrimeReport[]>([]);
  const [loading, setLoading]         = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hasAccess, setHasAccess]     = useState(false);
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      setCurrentUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          if (snap.exists()) setHasAccess(snap.data().warCrimesAccess === true);
        } catch {}
      } else {
        setHasAccess(false);
      }
      setAuthResolved(true);
    });
  }, []);

  useEffect(() => { if (authResolved && hasAccess) load(); }, [authResolved, hasAccess]);

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, 'warCrimeReports'),
        orderBy('createdAt', 'desc')
      ));
      const raw = snap.docs.map(d => ({ reportId: d.id, ...d.data() } as WarCrimeReport));
      const enriched = await Promise.all(raw.map(async r => {
        try {
          const vp = await getDoc(doc(db, 'verifiedProfiles', r.authorId));
          if (vp.exists()) r.authorName = vp.data().entityName;
        } catch {}
        return r;
      }));
      setReports(enriched);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (!authResolved) return (
    <div className="max-w-2xl mx-auto pt-8 flex flex-col gap-3">
      {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-zinc-900 animate-pulse"/>)}
    </div>
  );

  // No auth
  if (!currentUser) return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <p className="text-4xl mb-4">🔒</p>
      <h1 className="text-lg font-bold text-white mb-2">Acceso restringido</h1>
      <p className="text-zinc-500 text-sm mb-6">Debes iniciar sesión para acceder a esta sección.</p>
      <a href="/auth/login"
        className="inline-block px-5 py-2 rounded-full bg-white text-black text-sm font-semibold hover:opacity-90 transition">
        Iniciar sesión
      </a>
    </div>
  );

  // Auth but no access
  if (!hasAccess) return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <p className="text-4xl mb-4">🚫</p>
      <h1 className="text-lg font-bold text-white mb-2">Sin acceso</h1>
      <p className="text-zinc-400 text-sm max-w-sm mx-auto">
        Esta sección contiene reportes verificados de crímenes de guerra. 
        El acceso está reservado a periodistas, organizaciones humanitarias y 
        entidades verificadas autorizadas por GloVol.
      </p>
      <p className="text-xs text-zinc-600 mt-4">
        Si eres un periodista o representante de una ONG, puedes solicitar acceso 
        a través del proceso de verificación.
      </p>
      <a href="/auth/login"
        className="inline-block mt-4 px-5 py-2 rounded-full border border-zinc-700 text-zinc-400 text-sm font-medium hover:text-white hover:border-zinc-500 transition">
        ← Volver
      </a>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-5 pt-2">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-white">Crímenes de Guerra</h1>
          <span className="text-xs bg-red-900/30 text-red-400 border border-red-800/40 px-2 py-0.5 rounded-full">🔒 Acceso restringido</span>
        </div>
        <p className="text-xs text-zinc-500">Reportes verificados de violaciones del derecho internacional humanitario</p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-zinc-900 animate-pulse"/>)}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900 rounded-2xl border border-zinc-800">
          <p className="text-3xl mb-3">📋</p>
          <p className="text-zinc-500 text-sm">No hay reportes disponibles.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map(r => (
            <div key={r.reportId}
              className="p-4 rounded-2xl bg-zinc-900 border border-red-900/30">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-sm font-semibold text-white leading-snug">{r.title}</h2>
                <span className="text-xs text-zinc-600 flex-shrink-0">{timeAgo(r.createdAt)}</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 mb-3">{r.content}</p>
              <div className="flex items-center gap-3">
                {r.authorName && <span className="text-xs text-zinc-500">{r.authorName}</span>}
                {r.location && <span className="text-xs text-zinc-600">📍 {r.location}</span>}
                {r.evidenceUrls && r.evidenceUrls.length > 0 && (
                  <span className="text-xs text-zinc-600">📎 {r.evidenceUrls.length} adjunto{r.evidenceUrls.length !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
