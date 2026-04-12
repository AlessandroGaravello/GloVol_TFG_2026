import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import {
  doc, getDoc, collection, query, where, orderBy, getDocs, limit,
} from 'firebase/firestore';
import { InlineBadge, getBadgeType } from '../profile/ProfileBadge';

interface Disaster {
  disasterId: string; title: string; type: string; severity: string;
  country: string; affectedArea: string; status: string; description?: string;
  totalDonationsEUR: number; totalDonorsCount: number;
  totalVolunteersRegistered: number; totalVolunteersActive: number;
  postsCount: number; createdAt: any; updatedAt: any;
}
interface Post {
  postId: string; title: string; content: string; authorId: string;
  authorName?: string; authorBadge?: any;
  likesCount: number; commentsCount: number; urgencyLevel: string;
  needsDonations: boolean; needsVolunteers: boolean; createdAt: any;
}

const SEVERITY_COLOR: Record<string,string> = {
  critical:'text-red-400 bg-red-900/20 border-red-800/40',
  high:'text-orange-400 bg-orange-900/20 border-orange-800/40',
  medium:'text-yellow-400 bg-yellow-900/20 border-yellow-800/40',
  low:'text-green-400 bg-green-900/20 border-green-800/40',
};
const TYPE_ICON: Record<string,string> = {
  earthquake:'🌍',flood:'🌊',hurricane:'🌀',war:'⚔️',drought:'🏜️',
  wildfire:'🔥',pandemic:'🦠',tsunami:'🌊',volcano:'🌋',other:'⚠️',
};
function fmtEUR(n: number) {
  return (n||0).toLocaleString('es-ES',{minimumFractionDigits:0,maximumFractionDigits:0}) + ' €';
}
function timeAgo(ts: any) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 3600) return `Hace ${Math.floor(s/60)}m`;
  if (s < 86400) return `Hace ${Math.floor(s/3600)}h`;
  return d.toLocaleDateString('es-ES', {day:'numeric',month:'short'});
}

export default function DisasterDetailPage({ disasterId }: { disasterId: string }) {
  const [disaster, setDisaster] = useState<Disaster | null>(null);
  const [posts, setPosts]       = useState<Post[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => { load(); }, [disasterId]);

  const load = async () => {
    setLoading(true);
    try {
      const dSnap = await getDoc(doc(db, 'disasters', disasterId));
      if (!dSnap.exists()) { setLoading(false); return; }
      setDisaster({ disasterId: dSnap.id, ...dSnap.data() } as Disaster);

      const pSnap = await getDocs(query(
        collection(db, 'posts'),
        where('disasterId', '==', disasterId),
        where('isWarCrimeReport', '==', false),
        orderBy('createdAt', 'desc'),
        limit(20)
      ));
      const rawPosts = pSnap.docs.map(d => ({ postId: d.id, ...d.data() } as Post));
      const enriched = await Promise.all(rawPosts.map(async p => {
        try {
          const vp = await getDoc(doc(db, 'verifiedProfiles', p.authorId));
          if (vp.exists()) {
            p.authorName = vp.data().entityName || 'Organización';
            p.authorBadge = getBadgeType({ role:'verified', isVerified:true, verifiedProfileType:vp.data().type, volunteerEventsCount:0, totalDonatedEUR:0 });
          }
        } catch {}
        return p;
      }));
      setPosts(enriched);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto animate-pulse space-y-4 pt-2">
      <div className="h-8 bg-zinc-800 rounded w-2/3"/>
      <div className="h-32 bg-zinc-800 rounded-2xl"/>
      <div className="h-24 bg-zinc-800 rounded-2xl"/>
    </div>
  );
  if (!disaster) return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <p className="text-4xl mb-3">🔍</p>
      <p className="text-zinc-500">Catástrofe no encontrada.</p>
      <a href="/disasters" className="text-xs text-blue-400 hover:underline mt-2 inline-block">← Volver a catástrofes</a>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back */}
      <div className="flex items-center gap-2 mb-4 pt-2">
        <a href="/disasters" className="p-1.5 text-zinc-500 hover:text-white transition rounded-lg hover:bg-zinc-900">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
          </svg>
        </a>
        <span className="text-sm text-zinc-500">Catástrofes</span>
      </div>

      {/* Header card */}
      <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 mb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{TYPE_ICON[disaster.type] || '⚠️'}</span>
            <div>
              <h1 className="text-lg font-bold text-white">{disaster.title}</h1>
              <p className="text-xs text-zinc-500 mt-0.5">{disaster.country} · {disaster.affectedArea}</p>
            </div>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full border font-medium flex-shrink-0 ${SEVERITY_COLOR[disaster.severity] || 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
            {disaster.severity}
          </span>
        </div>
        {disaster.description && (
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">{disaster.description}</p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="bg-zinc-800/60 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-green-400">{fmtEUR(disaster.totalDonationsEUR)}</p>
            <p className="text-xs text-zinc-600 mt-0.5">Recaudado</p>
          </div>
          <div className="bg-zinc-800/60 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-blue-400">{disaster.totalDonorsCount || 0}</p>
            <p className="text-xs text-zinc-600 mt-0.5">Donantes</p>
          </div>
          <div className="bg-zinc-800/60 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-purple-400">{disaster.totalVolunteersRegistered || 0}</p>
            <p className="text-xs text-zinc-600 mt-0.5">Voluntarios</p>
          </div>
          <div className="bg-zinc-800/60 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-white">{disaster.postsCount || 0}</p>
            <p className="text-xs text-zinc-600 mt-0.5">Posts</p>
          </div>
        </div>
        <p className="text-xs text-zinc-700 mt-3 font-mono">#{disaster.disasterId}</p>
      </div>

      {/* Posts */}
      <h2 className="text-sm font-semibold text-white mb-3">
        {posts.length > 0 ? `${posts.length} publicaciones sobre esta catástrofe` : 'Publicaciones'}
      </h2>
      {posts.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900 rounded-2xl border border-zinc-800">
          <p className="text-3xl mb-3">📭</p>
          <p className="text-zinc-500 text-sm">Aún no hay posts sobre esta catástrofe.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map(p => (
            <a key={p.postId} href={`/posts/${p.postId}`}
              className="block p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-zinc-500 truncate">{p.authorName || 'Organización'}</span>
                {p.authorBadge && <InlineBadge type={p.authorBadge}/>}
                <span className="ml-auto text-xs text-zinc-600">{timeAgo(p.createdAt)}</span>
              </div>
              <h3 className="text-sm font-semibold text-white mb-1 leading-snug">{p.title}</h3>
              <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{p.content}</p>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs text-zinc-600">⭐ {p.likesCount || 0}</span>
                <span className="text-xs text-zinc-600">💬 {p.commentsCount || 0}</span>
                {p.needsDonations && <span className="text-xs text-green-600">💚 Donaciones</span>}
                {p.needsVolunteers && <span className="text-xs text-purple-600">🙋 Voluntarios</span>}
              </div>
            </a>
          ))}
        </div>
      )}
      <div className="h-8"/>
    </div>
  );
}
