import { useState, useEffect } from 'react';
import { db, auth } from '../../lib/firebase';
import {
  collection, getDocs, doc, getDoc, setDoc, deleteDoc, updateDoc, increment,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { InlineBadge, getBadgeType, type BadgeType } from './ProfileBadge';

interface UserItem {
  uid: string; displayName: string; username: string;
  profilePicture: string | null; isVerified: boolean;
  country: string; followersCount: number; badge: BadgeType;
}
interface Props { userId: string; mode: 'followers' | 'following'; }

export default function FollowList({ userId, mode }: Props) {
  const [users, setUsers]             = useState<UserItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [following, setFollowing]     = useState<Record<string, boolean>>({});
  const [busy, setBusy]               = useState<Record<string, boolean>>({});
  const [debugMsg, setDebugMsg]       = useState('');

  useEffect(() => { return onAuthStateChanged(auth, u => setCurrentUser(u)); }, []);
  useEffect(() => { load(); }, [userId, mode]);
  useEffect(() => { if (currentUser && users.length > 0) checkFollowing(); }, [currentUser, users]);

  const checkFollowing = async () => {
    if (!currentUser) return;
    const result: Record<string, boolean> = {};
    await Promise.all(users.map(async u => {
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid, 'following', u.uid));
        result[u.uid] = snap.exists();
      } catch { result[u.uid] = false; }
    }));
    setFollowing(result);
  };

  const load = async () => {
    setLoading(true);
    try {
      const subCol = mode === 'followers' ? 'followers' : 'following';
      const subSnap = await getDocs(collection(db, 'users', userId, subCol));
      setDebugMsg(`${subCol}: ${subSnap.docs.length} docs`);
      console.log('[FollowList] userId=' + userId + ' mode=' + mode + ' docs=' + subSnap.docs.length);
      subSnap.docs.forEach(d => console.log('  id:', d.id, JSON.stringify(d.data())));

      const ids = subSnap.docs.map(d => {
        const data = d.data();
        return (mode === 'followers' ? (data.followerId || d.id) : (data.followingId || d.id)) as string;
      }).filter(id => !!id);

      const items: UserItem[] = (await Promise.all(ids.map(async uid => {
        try {
          const uSnap = await getDoc(doc(db, 'users', uid));
          if (!uSnap.exists()) return null;
          const u = uSnap.data();
          let verifiedProfileType: string | undefined;
          try { const vp = await getDoc(doc(db, 'verifiedProfiles', uid)); if (vp.exists()) verifiedProfileType = vp.data().type; } catch {}
          return {
            uid, displayName: u.displayName || 'Usuario', username: u.username || uid,
            profilePicture: u.profilePicture || null, isVerified: u.isVerified || false,
            country: u.country || '', followersCount: u.followersCount || 0,
            badge: getBadgeType({ role: u.role, isVerified: u.isVerified, verifiedProfileType, volunteerEventsCount: u.volunteerEventsCount || 0, totalDonatedEUR: u.totalDonatedEUR || 0 }),
          } as UserItem;
        } catch { return null; }
      }))).filter((u): u is UserItem => u !== null);

      setUsers(items);
    } catch (e) { console.error('[FollowList]', e); setDebugMsg('Error: ' + String(e)); }
    finally { setLoading(false); }
  };

  const handleFollowToggle = async (targetUid: string) => {
    if (!currentUser) { window.location.href = '/auth/login'; return; }
    if (currentUser.uid === targetUid) return;
    setBusy(b => ({ ...b, [targetUid]: true }));
    try {
      const followRef   = doc(db, 'users', currentUser.uid, 'following', targetUid);
      const followerRef = doc(db, 'users', targetUid, 'followers', currentUser.uid);
      if (following[targetUid]) {
        await deleteDoc(followRef); await deleteDoc(followerRef);
        await updateDoc(doc(db, 'users', targetUid),       { followersCount: increment(-1) });
        await updateDoc(doc(db, 'users', currentUser.uid), { followingCount: increment(-1) });
        setFollowing(f => ({ ...f, [targetUid]: false }));
      } else {
        await setDoc(followRef,   { followingId: targetUid,      followedAt: new Date() });
        await setDoc(followerRef, { followerId: currentUser.uid, followedAt: new Date() });
        await updateDoc(doc(db, 'users', targetUid),       { followersCount: increment(1) });
        await updateDoc(doc(db, 'users', currentUser.uid), { followingCount: increment(1) });
        setFollowing(f => ({ ...f, [targetUid]: true }));
      }
    } catch (e) { console.error('[FollowList] toggle error:', e); }
    finally { setBusy(b => ({ ...b, [targetUid]: false })); }
  };

  const filtered = search
    ? users.filter(u => u.displayName.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()))
    : users;

  if (loading) return (
    <div className="px-4 py-4 flex flex-col gap-3">
      {[1,2,3].map(i => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0"/>
          <div className="flex-1"><div className="h-3.5 bg-zinc-800 rounded w-32 mb-1.5"/><div className="h-3 bg-zinc-800 rounded w-20"/></div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      {debugMsg && (
        <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800">
          <p className="text-xs text-zinc-500 font-mono">[debug] {debugMsg}</p>
        </div>
      )}
      {users.length > 5 && (
        <div className="px-4 py-3 border-b border-zinc-800">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full px-4 py-2 rounded-full bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"/>
        </div>
      )}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">{mode === 'followers' ? '👥' : '👤'}</p>
          <p className="text-zinc-500 text-sm">
            {search ? 'Sin resultados' : mode === 'followers' ? 'Todavía no hay seguidores.' : 'No sigue a nadie todavía.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-zinc-800/50">
          {filtered.map(u => (
            <div key={u.uid} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900/50 transition">
              <a href={`/profile/${u.uid}`} className="flex-shrink-0">
                {u.profilePicture
                  ? <img src={u.profilePicture} alt={u.displayName} className="w-10 h-10 rounded-full object-cover"/>
                  : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center text-white text-sm font-bold">{u.displayName.charAt(0).toUpperCase()}</div>
                }
              </a>
              <a href={`/profile/${u.uid}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-white truncate">{u.displayName}</span>
                  {u.isVerified && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.491 4.491 0 01-3.497-1.307 4.491 4.491 0 01-1.307-3.497A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.492 4.492 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd"/>
                    </svg>
                  )}
                  {u.badge && <InlineBadge type={u.badge}/>}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-zinc-500">@{u.username}</span>
                  {u.country && <span className="text-xs text-zinc-600">· {u.country}</span>}
                  <span className="text-xs text-zinc-600">· {u.followersCount.toLocaleString()} seg.</span>
                </div>
              </a>
              {currentUser && currentUser.uid !== u.uid && (
                <button
                  onClick={() => handleFollowToggle(u.uid)}
                  disabled={!!busy[u.uid]}
                  className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-semibold border transition disabled:opacity-50 ${
                    following[u.uid]
                      ? 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-red-900/20 hover:text-red-400 hover:border-red-800/50'
                      : 'bg-white text-black border-transparent hover:opacity-80'
                  }`}>
                  {busy[u.uid] ? '...' : following[u.uid] ? 'Siguiendo' : 'Seguir'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
