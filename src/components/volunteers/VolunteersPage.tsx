import { useState, useEffect } from 'react';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface VolunteerEntry {
  volunteerId: string; userId: string; disasterId: string; postId: string;
  status: string; registeredAt: any; userDisplayName?: string;
  userCity?: string; userCountry?: string; skills?: string[];
  disasterTitle?: string;
}

function timeAgo(ts: any) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' });
}

const STATUS_COLOR: Record<string,string> = {
  registered: 'text-blue-400 bg-blue-900/20 border-blue-800/40',
  deployed:   'text-green-400 bg-green-900/20 border-green-800/40',
  completed:  'text-zinc-400 bg-zinc-800 border-zinc-700',
  cancelled:  'text-red-400 bg-red-900/20 border-red-800/40',
};
const STATUS_LABEL: Record<string,string> = {
  registered:'Registrado', deployed:'Desplegado', completed:'Completado', cancelled:'Cancelado',
};

export default function VolunteersPage() {
  const [entries, setEntries]     = useState<VolunteerEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, u => { setCurrentUser(u); setAuthResolved(true); });
  }, []);

  useEffect(() => {
    if (authResolved) load();
  }, [authResolved, currentUser]);

  const load = async () => {
    setLoading(true);
    try {
      if (!currentUser) { setLoading(false); return; }
      const snap = await getDocs(query(
        collection(db, 'volunteers'),
        where('userId', '==', currentUser.uid)
      ));
      const raw = snap.docs.map(d => ({ volunteerId: d.id, ...d.data() } as VolunteerEntry));
      raw.sort((a, b) => {
        const ta = a.registeredAt?.toMillis?.() ?? 0;
        const tb = b.registeredAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
      const enriched = await Promise.all(raw.map(async v => {
        try {
          const dis = await getDoc(doc(db, 'disasters', v.disasterId));
          if (dis.exists()) v.disasterTitle = dis.data().title;
        } catch {}
        try {
          const u = await getDoc(doc(db, 'users', v.userId));
          if (u.exists()) { v.userDisplayName = u.data().displayName; v.userCity = u.data().city; v.userCountry = u.data().country; }
        } catch {}
        return v;
      }));
      setEntries(enriched);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (!authResolved || loading) return (
    <div className="max-w-2xl mx-auto pt-2 flex flex-col gap-3">
      {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-zinc-900 animate-pulse"/>)}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-5 pt-2">
        <h1 className="text-xl font-bold text-white">Voluntariado</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Tus inscripciones como voluntario en catástrofes</p>
      </div>

      {!currentUser ? (
        <div className="text-center py-20 bg-zinc-900 rounded-2xl border border-zinc-800">
          <p className="text-4xl mb-3">🙋</p>
          <p className="text-zinc-400 text-sm mb-4">Inicia sesión para ver tu actividad de voluntariado.</p>
          <a href="/auth/login"
            className="inline-block px-5 py-2 rounded-full bg-white text-black text-sm font-semibold hover:opacity-90 transition">
            Iniciar sesión
          </a>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900 rounded-2xl border border-zinc-800">
          <p className="text-4xl mb-3">🙋</p>
          <p className="text-zinc-400 text-sm mb-4">Aún no te has apuntado como voluntario en ninguna catástrofe.</p>
          <a href="/"
            className="inline-block px-5 py-2 rounded-full bg-white text-black text-sm font-semibold hover:opacity-90 transition">
            Ver catástrofes activas
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-zinc-600">{entries.length} inscripción{entries.length !== 1 ? 'es' : ''}</p>
          {entries.map(v => (
            <a key={v.volunteerId} href={`/posts/${v.postId}`}
              className="block p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-semibold text-white">{v.disasterTitle || v.disasterId}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 font-mono">#{v.disasterId}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${STATUS_COLOR[v.status] || 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
                  {STATUS_LABEL[v.status] || v.status}
                </span>
              </div>
              {v.skills && v.skills.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-2">
                  {v.skills.slice(0, 4).map(s => (
                    <span key={s} className="text-xs px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded">{s}</span>
                  ))}
                </div>
              )}
              <p className="text-xs text-zinc-600">Inscrito el {timeAgo(v.registeredAt)}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}