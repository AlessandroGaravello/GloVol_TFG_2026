import { useState, useEffect } from 'react';
import { auth, db } from '../../lib/firebase';
import {
  doc, getDoc, collection, query, where, orderBy, limit, getDocs,
  setDoc, deleteDoc, serverTimestamp, updateDoc, increment,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import ProfileBadge, { BadgeDescription, getBadgeType, type BadgeType } from './ProfileBadge';
import PostCard from '../feed/PostCard';
import { useLang } from '../../hooks/useLang';
import CreateDisasterModal from './CreateDisasterModal';
import CreatePostModal from './CreatePostModal';

interface UserData {
  uid: string; displayName: string; username: string; email: string;
  profilePicture: string | null; role: string; isVerified: boolean;
  verificationStatus: string; warCrimesAccess: boolean;
  country: string; city: string; region: string; language: string;
  followersCount: number; followingCount: number;
  totalDonatedEUR: number; volunteerEventsCount: number;
  createdAt: any; bio?: string;
}
interface VerifiedProfile {
  type: string; entityName: string; entityCountry: string;
  position?: string; pressAgency?: string; orgType?: string;
  displayBadge: string; canPostWarCrimes: boolean;
  postsCount: number; followersCount: number;
}
type TabKey = 'posts' | 'volunteers' | 'donations' | 'about';

const COUNTRY_NAMES: Record<string, string> = {
  ES:'🇪🇸 España', UA:'🇺🇦 Ucrania', US:'🇺🇸 EEUU', FR:'🇫🇷 Francia',
  DE:'🇩🇪 Alemania', GB:'🇬🇧 Reino Unido', MA:'🇲🇦 Marruecos', TR:'🇹🇷 Turquía',
  IT:'🇮🇹 Italia', CN:'🇨🇳 China', JP:'🇯🇵 Japón', BR:'🇧🇷 Brasil',
};

function joinedDate(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

// ─────────────────────────────────────────────────────────────────────────────
// ProfilePage
// ─────────────────────────────────────────────────────────────────────────────
export default function ProfilePage({ userId }: { userId: string }) {
  const lang = useLang();

  // authResolved: false mientras esperamos a Firebase Auth
  // currentUser: null = no autenticado, objeto = autenticado
  const [authResolved, setAuthResolved] = useState(false);
  const [currentUser,  setCurrentUser]  = useState<any>(null);

  const [userData,    setUserData]    = useState<UserData | null>(null);
  const [vpData,      setVpData]      = useState<VerifiedProfile | null>(null);
  const [posts,       setPosts]       = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [notFound,    setNotFound]    = useState(false);
  const [tab,         setTab]         = useState<TabKey>('posts');
  const [isOwn,       setIsOwn]       = useState(false);

  // ── Modales de creación ─────────────────────────────────────────────────
  const [showCreateDisaster, setShowCreateDisaster] = useState(false);
  const [showCreatePost,     setShowCreatePost]     = useState(false);
  const [successMsg,         setSuccessMsg]         = useState('');

  // ── Paso 1: Esperar a que Firebase Auth resuelva ───────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setAuthResolved(true);
    });
    return unsub;
  }, []);

  // ── Paso 2: Cargar datos SOLO cuando auth está resuelto ───────────────
  useEffect(() => {
    if (!authResolved) return; // Aún esperando a Firebase Auth

    loadProfile();
  }, [authResolved, userId]);

  const loadProfile = async () => {
    setLoading(true);
    setNotFound(false);

    try {
      // Resolver el UID objetivo
      let targetId: string;
      if (userId === 'me') {
        if (!auth.currentUser) {
          window.location.href = '/auth/login';
          return;
        }
        targetId = auth.currentUser.uid;
      } else {
        targetId = userId;
      }

      const isSelf = auth.currentUser?.uid === targetId;
      setIsOwn(isSelf);

      // Cargar documento del usuario
      let userSnap = await getDoc(doc(db, 'users', targetId));

      // Auto-crear documento si inició sesión con Google/Apple y no tiene doc
      if (!userSnap.exists() && isSelf && auth.currentUser) {
        const u = auth.currentUser;
        await setDoc(doc(db, 'users', targetId), {
          uid:                  targetId,
          email:                u.email         || '',
          displayName:          u.displayName   || 'Usuario',
          username:             (u.email || targetId).split('@')[0]
                                  .replace(/[^a-z0-9_]/gi, '').toLowerCase()
                                  .slice(0, 20),
          phone:                u.phoneNumber   || '',
          profilePicture:       u.photoURL      || null,
          role:                 'user',
          isVerified:           false,
          isActive:             true,
          verificationStatus:   'none',
          warCrimesAccess:      false,
          country:              '',
          city:                 '',
          region:               '',
          language:             'es',
          bio:                  '',
          followersCount:       0,
          followingCount:       0,
          totalDonatedEUR:      0,
          volunteerEventsCount: 0,
          createdAt:            serverTimestamp(),
          lastLogin:            serverTimestamp(),
        });
        userSnap = await getDoc(doc(db, 'users', targetId));
      }

      if (!userSnap.exists()) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const u = userSnap.data() as UserData;
      setUserData(u);

      // Perfil verificado (puede no existir)
      const vpSnap = await getDoc(doc(db, 'verifiedProfiles', targetId));
      const vp = vpSnap.exists() ? vpSnap.data() as VerifiedProfile : null;
      setVpData(vp);

      // Posts (solo cuentas verificadas)
      if (vp) {
        try {
          const postsSnap = await getDocs(query(
            collection(db, 'posts'),
            where('authorId', '==', targetId),
            where('isWarCrimeReport', '==', false),
            orderBy('createdAt', 'desc'),
            limit(20)
          ));
          setPosts(postsSnap.docs.map(d => ({
            postId: d.id, ...d.data(), authorName: vp.entityName,
          })) as any[]);
        } catch (e) {
          console.warn('Error cargando posts del perfil:', e);
        }
      }

      // ¿Está siguiendo?
      if (auth.currentUser && auth.currentUser.uid !== targetId) {
        try {
          const followSnap = await getDoc(
            doc(db, 'users', auth.currentUser.uid, 'following', targetId)
          );
          setIsFollowing(followSnap.exists());
        } catch {}
      }
    } catch (e) {
      console.error('Error cargando perfil:', e);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  // ── Follow / Unfollow ──────────────────────────────────────────────────
  const handleFollow = async () => {
    if (!auth.currentUser || !userData) return;
    const uid = auth.currentUser.uid;
    const followRef   = doc(db, 'users', uid, 'following', userData.uid);
    const followerRef = doc(db, 'users', userData.uid, 'followers', uid);
    const targetUserRef  = doc(db, 'users', userData.uid);
    const currentUserRef = doc(db, 'users', uid);
    if (isFollowing) {
      await deleteDoc(followRef);
      await deleteDoc(followerRef);
      // Actualizar contadores en Firestore
      await updateDoc(targetUserRef,  { followersCount: increment(-1) });
      await updateDoc(currentUserRef, { followingCount: increment(-1) });
      setIsFollowing(false);
      setUserData(u => u ? { ...u, followersCount: u.followersCount - 1 } : u);
    } else {
      await setDoc(followRef,   { followingId: userData.uid, followedAt: new Date() });
      await setDoc(followerRef, { followerId: uid, followedAt: new Date() });
      // Actualizar contadores en Firestore
      await updateDoc(targetUserRef,  { followersCount: increment(1) });
      await updateDoc(currentUserRef, { followingCount: increment(1) });
      setIsFollowing(true);
      setUserData(u => u ? { ...u, followersCount: u.followersCount + 1 } : u);
    }
  };

  // ── Estados de carga ───────────────────────────────────────────────────
  if (!authResolved || loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="animate-pulse space-y-4">
        <div className="flex gap-4 items-start">
          <div className="w-20 h-20 rounded-full bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-zinc-800 rounded w-40" />
            <div className="h-3 bg-zinc-800 rounded w-24" />
            <div className="h-3 bg-zinc-800 rounded w-56" />
          </div>
        </div>
        <div className="h-px bg-zinc-800" />
        {[1,2,3].map(i => <div key={i} className="h-28 bg-zinc-800 rounded-2xl" />)}
      </div>
    </div>
  );

  if (notFound || !userData) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <p className="text-5xl mb-4">👤</p>
      <h2 className="text-white font-semibold text-lg mb-2">Usuario no encontrado</h2>
      <p className="text-zinc-500 text-sm mb-6">
        {userId === 'me'
          ? 'No se pudo cargar tu perfil. Intenta cerrar sesión e iniciarla de nuevo.'
          : 'Este perfil no existe o ha sido eliminado.'}
      </p>
      {userId === 'me' && (
        <a href="/auth/login" className="inline-block px-4 py-2 bg-white text-black rounded-full text-sm font-semibold hover:opacity-90 transition">
          Iniciar sesión
        </a>
      )}
    </div>
  );

  // ── Renderizado ────────────────────────────────────────────────────────
  const badgeType: BadgeType = getBadgeType({
    role: userData.role,
    isVerified: userData.isVerified,
    verifiedProfileType: vpData?.type,
    volunteerEventsCount: userData.volunteerEventsCount,
    totalDonatedEUR: userData.totalDonatedEUR,
  });

  const canPost = vpData !== null;
  const initials = (userData.displayName || 'U').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: 'posts',      label: 'Posts',       count: canPost ? posts.length : undefined },
    { key: 'volunteers', label: 'Voluntariado', count: userData.volunteerEventsCount },
    { key: 'donations',  label: 'Donaciones' },
    { key: 'about',      label: 'Sobre mí' },
  ];

  return (
    <div className="max-w-2xl mx-auto">

      {/* ── Header del perfil ── */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-start gap-4">

          {/* Avatar con badge superpuesto */}
          <div className="relative flex-shrink-0">
            {userData.profilePicture ? (
              <img src={userData.profilePicture} alt={userData.displayName}
                className="w-20 h-20 rounded-full object-cover border-2 border-zinc-700" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-white text-2xl font-bold">
                {initials}
              </div>
            )}
            {badgeType && (
              <span className="absolute -bottom-1 -right-1 text-base bg-black rounded-full p-0.5 leading-none select-none">
                {badgeType === 'government'    && '🏛️'}
                {badgeType === 'journalist'    && '📰'}
                {badgeType === 'organization'  && '🤝'}
                {badgeType === 'top_volunteer' && '🙋'}
                {badgeType === 'top_donor'     && '💎'}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-white leading-tight">{userData.displayName}</h1>
              {badgeType && <ProfileBadge type={badgeType} size="sm" showLabel />}
              {userData.isVerified && (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.491 4.491 0 01-3.497-1.307 4.491 4.491 0 01-1.307-3.497A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.492 4.492 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                </svg>
              )}
            </div>

            <p className="text-sm text-zinc-500 mt-0.5">@{userData.username}</p>

            {vpData && (
              <p className="text-sm text-zinc-300 mt-1">
                {vpData.entityName}
                {vpData.position && <span className="text-zinc-500"> · {vpData.position}</span>}
              </p>
            )}

            {userData.bio && (
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{userData.bio}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-2">
              {(userData.city || userData.country) && (
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  {userData.city ? `${userData.city}, ` : ''}{COUNTRY_NAMES[userData.country] || userData.country}
                </span>
              )}
              {userData.createdAt && (
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                  </svg>
                  Se unió en {joinedDate(userData.createdAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Estadísticas + badge (fila como en el Figma) ── */}
        <div className="flex items-center gap-5 mt-4 px-1 flex-wrap">
          {/* Badge verificado — aparece como icono en la fila de stats */}
          {badgeType && (
            <ProfileBadge type={badgeType} size="md" showLabel />
          )}
          <a href={`/profile/followers?uid=${userData.uid}`} className="flex flex-col items-center hover:opacity-80 transition">
            <span className="text-white font-bold text-base">{(userData.followersCount || 0).toLocaleString()}</span>
            <span className="text-xs text-zinc-500">Seguidores</span>
          </a>
          <a href={`/profile/following?uid=${userData.uid}`} className="flex flex-col items-center hover:opacity-80 transition">
            <span className="text-white font-bold text-base">{(userData.followingCount || 0).toLocaleString()}</span>
            <span className="text-xs text-zinc-500">Siguiendo</span>
          </a>
          {canPost && (
            <div className="flex flex-col items-center">
              <span className="text-white font-bold text-base">{posts.length}</span>
              <span className="text-xs text-zinc-500">Posts</span>
            </div>
          )}
          <div className="flex flex-col items-center">
            <span className="text-white font-bold text-base">{userData.volunteerEventsCount || 0}</span>
            <span className="text-xs text-zinc-500">Voluntariados</span>
          </div>
          {(userData.totalDonatedEUR || 0) > 0 && (
            <div className="flex flex-col items-center">
              <span className="text-white font-bold text-base">{(userData.totalDonatedEUR).toLocaleString('es-ES')} €</span>
              <span className="text-xs text-zinc-500">Donado</span>
            </div>
          )}
        </div>

        {/* ── Botones ── */}
        <div className="flex flex-col gap-2 mt-4">
          {/* Fila 1: editar / seguir / mensaje */}
          <div className="flex items-center gap-2">
            {isOwn ? (
              <a href="/profile/edit"
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-full border border-zinc-600 text-sm font-medium text-white hover:bg-zinc-900 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                </svg>
                Editar perfil
              </a>
            ) : (
              <>
                <button onClick={handleFollow}
                  className={`flex-1 py-2 rounded-full text-sm font-semibold transition ${
                    isFollowing ? 'border border-zinc-600 text-white hover:bg-zinc-900' : 'bg-white text-black hover:opacity-90'
                  }`}>
                  {isFollowing ? 'Siguiendo' : 'Seguir'}
                </button>
                <button className="px-4 py-2 rounded-full border border-zinc-600 text-sm font-medium text-white hover:bg-zinc-900 transition">
                  Mensaje
                </button>
              </>
            )}
          </div>

          {/* Fila 2: botones de publicación (solo para propietario verificado) */}
          {isOwn && canPost && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateDisaster(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-sm font-semibold transition hover:opacity-90"
                style={{ background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e40' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Nueva catástrofe
              </button>
              <button
                onClick={() => setShowCreatePost(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-sm font-semibold transition hover:opacity-90"
                style={{ background: '#2563eb22', color: '#60a5fa', border: '1px solid #2563eb40' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.982 19.07a4.5 4.5 0 01-1.897 1.13L2 21l.8-2.685a4.5 4.5 0 011.13-1.897l12.932-12.931z" />
                </svg>
                Nuevo post
              </button>
            </div>
          )}

          {/* Toast de éxito */}
          {successMsg && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
              style={{ background: '#22c55e20', border: '1px solid #22c55e40', color: '#4ade80' }}>
              <span>✓</span>
              <span>{successMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Badge description */}
      {badgeType && (
        <div className="px-4 pb-3">
          <BadgeDescription type={badgeType} />
        </div>
      )}

      <div className="h-px bg-zinc-800" />

      {/* ── Tabs ── */}
      <div className="flex border-b border-zinc-800">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-medium transition relative ${tab === t.key ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1 text-xs text-zinc-600">({t.count})</span>
            )}
            {tab === t.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />}
          </button>
        ))}
      </div>

      {/* ── Contenido tabs ── */}
      <div className="px-4 py-4">

        {tab === 'posts' && (
          !canPost ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-3">🔒</p>
              <p className="text-zinc-500 text-sm">Este usuario no puede publicar posts.</p>
              <p className="text-zinc-600 text-xs mt-1">Solo gobiernos, periodistas y organizaciones verificadas pueden hacerlo.</p>
              {isOwn && (
                <a href="/profile/edit" className="inline-block mt-4 text-xs text-blue-400 hover:text-blue-300 transition">
                  Solicitar verificación →
                </a>
              )}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-3">📭</p>
              <p className="text-zinc-500 text-sm">Sin publicaciones todavía.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {posts.map(p => <PostCard key={p.postId} post={p} lang={lang} />)}
            </div>
          )
        )}

        {tab === 'volunteers' && (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">🙋</p>
            <p className="text-white font-semibold mb-1">{userData.volunteerEventsCount} eventos de voluntariado</p>
            <p className="text-zinc-500 text-sm">
              {userData.volunteerEventsCount === 0
                ? 'Todavía no ha participado en ningún evento.'
                : 'Ha participado en emergencias y catástrofes.'}
            </p>
          </div>
        )}

        {tab === 'donations' && (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">💎</p>
            {(userData.totalDonatedEUR || 0) > 0 ? (
              <>
                <p className="text-white font-bold text-2xl mb-1">{userData.totalDonatedEUR.toLocaleString('es-ES')} €</p>
                <p className="text-zinc-500 text-sm">Total donado a causas humanitarias.</p>
              </>
            ) : (
              <p className="text-zinc-500 text-sm">Todavía no ha realizado donaciones.</p>
            )}
          </div>
        )}

        {tab === 'about' && (
          <div className="flex flex-col gap-4">
            {vpData && (
              <div className="bg-zinc-900 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Entidad verificada</h3>
                <div className="flex flex-col gap-2">
                  {[
                    { label: 'Tipo', value: vpData.type === 'government' ? '🏛️ Gobierno' : vpData.type === 'journalist' ? '📰 Periodista' : '🤝 Organización' },
                    { label: 'Nombre', value: vpData.entityName },
                    { label: 'País', value: COUNTRY_NAMES[vpData.entityCountry] || vpData.entityCountry },
                    vpData.position    ? { label: 'Cargo', value: vpData.position }   : null,
                    vpData.pressAgency ? { label: 'Medio', value: vpData.pressAgency } : null,
                    vpData.orgType     ? { label: 'Tipo org.', value: vpData.orgType } : null,
                  ].filter(Boolean).map((row: any) => (
                    <div key={row.label} className="flex items-start gap-2">
                      <span className="text-xs text-zinc-500 w-20 flex-shrink-0">{row.label}</span>
                      <span className="text-xs text-zinc-300">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-zinc-900 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Información</h3>
              <div className="flex flex-col gap-2">
                {[
                  userData.city    && { label: 'Ciudad',  value: userData.city },
                  userData.region  && { label: 'Región',  value: userData.region },
                  userData.country && { label: 'País',    value: COUNTRY_NAMES[userData.country] || userData.country },
                  userData.createdAt && { label: 'Miembro', value: joinedDate(userData.createdAt) },
                  userData.language  && { label: 'Idioma',  value: userData.language.toUpperCase() },
                ].filter(Boolean).map((row: any) => (
                  <div key={row.label} className="flex items-start gap-2">
                    <span className="text-xs text-zinc-500 w-20 flex-shrink-0">{row.label}</span>
                    <span className="text-xs text-zinc-300">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modales de creación ── */}
      {showCreateDisaster && (
        <CreateDisasterModal
          onClose={() => setShowCreateDisaster(false)}
          onCreated={(id) => {
            setShowCreateDisaster(false);
            setSuccessMsg(`✓ Catástrofe "${id}" creada correctamente.`);
            setTimeout(() => setSuccessMsg(''), 5000);
          }}
        />
      )}

      {showCreatePost && (
        <CreatePostModal
          onClose={() => setShowCreatePost(false)}
          onCreated={(postId) => {
            setShowCreatePost(false);
            setSuccessMsg('✓ Post publicado. Puede tardar unos segundos en aparecer en el feed.');
            setTimeout(() => {
              setSuccessMsg('');
              window.location.href = `/posts/${postId}`;
            }, 2000);
          }}
        />
      )}
    </div>
  );
}
