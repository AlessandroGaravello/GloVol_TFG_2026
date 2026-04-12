import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

interface Disaster {
  disasterId: string; title: string; type: string; severity: string;
  country: string; affectedArea: string; status: string;
  totalDonationsEUR: number; totalVolunteersRegistered: number; postsCount: number;
  createdAt: any;
}

const SEVERITY_COLOR: Record<string,string> = {
  critical: 'text-red-400 bg-red-900/20 border-red-800/40',
  high:     'text-orange-400 bg-orange-900/20 border-orange-800/40',
  medium:   'text-yellow-400 bg-yellow-900/20 border-yellow-800/40',
  low:      'text-green-400 bg-green-900/20 border-green-800/40',
};
const SEVERITY_DOT: Record<string,string> = {
  critical:'bg-red-500', high:'bg-orange-500', medium:'bg-yellow-500', low:'bg-green-500',
};
const SEVERITY_LABEL: Record<string,string> = {
  critical:'Crítica', high:'Alta', medium:'Media', low:'Baja',
};
const TYPE_ICON: Record<string,string> = {
  earthquake:'🌍', flood:'🌊', hurricane:'🌀', war:'⚔️', drought:'🏜️',
  wildfire:'🔥', pandemic:'🦠', tsunami:'🌊', volcano:'🌋', other:'⚠️',
};

function fmtEUR(n: number) {
  return n?.toLocaleString('es-ES', { minimumFractionDigits:0, maximumFractionDigits:0 }) + ' €';
}
function timeAgo(ts: any) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' });
}

export default function DisastersPage() {
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<'all'|'active'|'resolved'>('active');
  const [search, setSearch]       = useState('');

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    try {
      const constraints: any[] = [orderBy('createdAt', 'desc')];
      if (filter !== 'all') constraints.unshift(where('status', '==', filter));
      const snap = await getDocs(query(collection(db, 'disasters'), ...constraints));
      setDisasters(snap.docs.map(d => ({ disasterId: d.id, ...d.data() } as Disaster)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = search
    ? disasters.filter(d =>
        d.title?.toLowerCase().includes(search.toLowerCase()) ||
        d.country?.toLowerCase().includes(search.toLowerCase()) ||
        d.affectedArea?.toLowerCase().includes(search.toLowerCase()))
    : disasters;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pt-2">
        <div>
          <h1 className="text-xl font-bold text-white">Catástrofes</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Todas las emergencias y crisis activas en GloVol</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-full p-1 gap-1">
          {(['active','all','resolved'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${filter === f ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>
              {f === 'active' ? 'Activas' : f === 'all' ? 'Todas' : 'Resueltas'}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, país..."
          className="flex-1 min-w-40 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"/>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl bg-zinc-900 animate-pulse"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🌍</p>
          <p className="text-zinc-500 text-sm">No hay catástrofes que mostrar.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(d => (
            <a key={d.disasterId} href={`/disasters/${d.disasterId}`}
              className="block p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl flex-shrink-0">{TYPE_ICON[d.type] || '⚠️'}</span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-white truncate">{d.title}</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">{d.country} · {d.affectedArea}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SEVERITY_COLOR[d.severity] || 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
                    {SEVERITY_LABEL[d.severity] || d.severity}
                  </span>
                  {d.status === 'active' && (
                    <span className={`w-2 h-2 rounded-full animate-pulse flex-shrink-0 ${SEVERITY_DOT[d.severity] || 'bg-zinc-500'}`}/>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-zinc-800/50 rounded-xl p-2 text-center">
                  <p className="text-sm font-bold text-green-400">{fmtEUR(d.totalDonationsEUR || 0)}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">Recaudado</p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-2 text-center">
                  <p className="text-sm font-bold text-purple-400">{d.totalVolunteersRegistered || 0}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">Voluntarios</p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-2 text-center">
                  <p className="text-sm font-bold text-blue-400">{d.postsCount || 0}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">Posts</p>
                </div>
              </div>
              <p className="text-xs text-zinc-600 mt-2">#{d.disasterId} · {timeAgo(d.createdAt)}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
