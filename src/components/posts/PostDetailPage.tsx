import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../../lib/firebase';
import {
  doc, getDoc, collection, query, where, orderBy,
  limit, getDocs, updateDoc, increment, setDoc, deleteDoc,
  addDoc, serverTimestamp, onSnapshot, type Unsubscribe,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { InlineBadge, getBadgeType, type BadgeType } from '../profile/ProfileBadge';
import { useLang } from '../../hooks/useLang';
import { t } from '../../lib/i18n';

// ── Helpers ────────────────────────────────────────────────────────────────
function timeAgo(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return 'Ahora';
  if (s < 3600) return `Hace ${Math.floor(s/60)}m`;
  if (s < 86400) return `Hace ${Math.floor(s/3600)}h`;
  return d.toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' });
}
function fmtEUR(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
}

const SEVERITY_COLOR: Record<string,string> = {
  critical:'text-red-400 bg-red-900/20 border-red-800/30',
  high:'text-orange-400 bg-orange-900/20 border-orange-800/30',
  medium:'text-yellow-400 bg-yellow-900/20 border-yellow-800/30',
  low:'text-green-400 bg-green-900/20 border-green-800/30',
};

// ── Tipos ──────────────────────────────────────────────────────────────────
interface PostData {
  postId: string; disasterId: string; authorId: string; authorType: string;
  title: string; content: string; contentType: string; urgencyLevel: string;
  media: {url:string;type:string;caption?:string}[];
  locationName?: string; isPinned?: boolean;
  likesCount: number; sharesCount: number; commentsCount: number;
  volunteerCount: number; donationCount: number; totalRaisedEUR: number;
  needsDonations: boolean; needsVolunteers: boolean;
  donationApprovalStatus: string; stripePaymentLinkUrl?: string;
  isAdminVerified: boolean; isWarCrimeReport: boolean; createdAt: any;
}
interface DisasterData {
  disasterId: string; title: string; type: string; severity: string;
  country: string; affectedArea: string; totalDonationsEUR: number;
  totalDonorsCount: number; totalVolunteersRegistered: number; totalVolunteersActive: number;
  postsCount: number;
}
interface VolunteerData {
  volunteerId: string; userId: string; userCity: string; userCountry: string;
  userPhone?: string; skills: string[]; status: string; registeredAt: any;
  userDisplayName?: string;
}
interface RelatedPost {
  postId: string; title: string; authorName: string; createdAt: any;
  likesCount: number; urgencyLevel: string; authorBadge?: BadgeType;
}
interface Comment {
  commentId: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: any;
  likesCount: number;
}

type Tab = 'info' | 'comments' | 'volunteers' | 'donations' | 'related';

// ── Modal Share ────────────────────────────────────────────────────────────
function ShareModal({ postId, title, onClose }: { postId: string; title: string; onClose: () => void }) {
  const postUrl = `${window.location.origin}/posts/${postId}`;
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
    } catch {
      const el = document.createElement('textarea');
      el.value = postUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOptions = [
    { label: 'WhatsApp', icon: '💬', onClick: () => window.open(`https://wa.me/?text=${encodeURIComponent(title + '\n' + postUrl)}`, '_blank') },
    { label: 'X / Twitter', icon: '✖', onClick: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(postUrl)}`, '_blank') },
    { label: 'Telegram', icon: '✈', onClick: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(title)}`, '_blank') },
    { label: 'Facebook', icon: 'f', onClick: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`, '_blank') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 z-10 bg-zinc-900 border border-zinc-800" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Compartir post</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition text-lg leading-none">✕</button>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {shareOptions.map(opt => (
            <button key={opt.label} onClick={opt.onClick}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition">
              <span className="text-xl">{opt.icon}</span>
              <span className="text-xs text-zinc-400">{opt.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-800 border border-zinc-700">
          <span className="text-xs text-zinc-500 truncate flex-1">{postUrl}</span>
          <button onClick={copyLink}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 transition ${copied ? 'bg-green-900/30 text-green-400' : 'bg-zinc-700 text-white hover:bg-zinc-600'}`}>
            {copied ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Reporte ──────────────────────────────────────────────────────────
function ReportModal({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [selected, setSelected] = useState('');
  const [extra, setExtra] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const reasons = [
    'Información falsa o engañosa',
    'Contenido inapropiado u ofensivo',
    'Spam o publicidad no solicitada',
    'Contenido que incita al odio',
    'Solicitud de donaciones fraudulenta',
    'Otro motivo',
  ];

  const handleSend = async () => {
    if (!selected) return;
    const user = auth.currentUser;
    if (!user) { window.location.href = '/auth/login'; return; }
    setSending(true);
    try {
      await addDoc(collection(db, 'reports'), {
        postId, reportedBy: user.uid, reason: selected,
        extra: extra.trim(), status: 'pending', createdAt: serverTimestamp(),
      });
      setSent(true);
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 z-10 bg-zinc-900 border border-zinc-800" onClick={e => e.stopPropagation()}>
        {sent ? (
          <div className="text-center py-6">
            <p className="text-3xl mb-3">✅</p>
            <p className="text-sm font-semibold text-white mb-1">Reporte enviado</p>
            <p className="text-xs text-zinc-500 mb-4">Nuestro equipo lo revisará en breve. Gracias por ayudarnos a mantener GloVol seguro.</p>
            <button onClick={onClose} className="text-xs px-4 py-2 rounded-xl bg-zinc-800 text-white font-semibold hover:bg-zinc-700 transition">Cerrar</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Reportar post</h3>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition text-lg leading-none">✕</button>
            </div>
            <p className="text-xs text-zinc-500 mb-3">¿Por qué quieres reportar este post?</p>
            <div className="flex flex-col gap-2 mb-4">
              {reasons.map(r => (
                <button key={r} onClick={() => setSelected(r)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs transition hover:opacity-80"
                  style={{
                    background: selected === r ? '#ef444422' : 'rgb(39 39 42)',
                    border: `1px solid ${selected === r ? '#ef4444' : 'rgb(63 63 70)'}`,
                    color: selected === r ? '#ef4444' : 'rgb(161 161 170)',
                  }}>
                  <span className="w-3 h-3 rounded-full border flex-shrink-0 flex items-center justify-center"
                    style={{ borderColor: selected === r ? '#ef4444' : 'rgb(63 63 70)' }}>
                    {selected === r && <span className="w-1.5 h-1.5 rounded-full bg-red-400 block" />}
                  </span>
                  {r}
                </button>
              ))}
            </div>
            {selected === 'Otro motivo' && (
              <textarea value={extra} onChange={e => setExtra(e.target.value)}
                placeholder="Describe el problema..." rows={3}
                className="w-full text-xs p-3 rounded-xl resize-none mb-4 outline-none bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600"
              />
            )}
            <button onClick={handleSend} disabled={!selected || sending}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition hover:opacity-80 disabled:opacity-40"
              style={{ background: '#ef444430', color: '#ef4444', border: '1px solid #ef444440' }}>
              {sending ? 'Enviando...' : 'Enviar reporte'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Modal Reporte de Comentario ────────────────────────────────────────────
function ReportCommentModal({ commentId, postId, onClose }: { commentId: string; postId: string; onClose: () => void }) {
  const [selected, setSelected] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const reasons = [
    'Contenido inapropiado u ofensivo',
    'Acoso o amenazas',
    'Información falsa',
    'Spam',
    'Otro motivo',
  ];

  const handleSend = async () => {
    if (!selected) return;
    const user = auth.currentUser;
    if (!user) { window.location.href = '/auth/login'; return; }
    setSending(true);
    try {
      await addDoc(collection(db, 'reports'), {
        type: 'comment', commentId, postId,
        reportedBy: user.uid, reason: selected,
        status: 'pending', createdAt: serverTimestamp(),
      });
      setSent(true);
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 z-10 bg-zinc-900 border border-zinc-800" onClick={e => e.stopPropagation()}>
        {sent ? (
          <div className="text-center py-6">
            <p className="text-3xl mb-3">✅</p>
            <p className="text-sm font-semibold text-white mb-1">Reporte enviado</p>
            <p className="text-xs text-zinc-500 mb-4">Nuestro equipo lo revisará en breve.</p>
            <button onClick={onClose} className="text-xs px-4 py-2 rounded-xl bg-zinc-800 text-white font-semibold hover:bg-zinc-700 transition">Cerrar</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Reportar comentario</h3>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition text-lg leading-none">✕</button>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              {reasons.map(r => (
                <button key={r} onClick={() => setSelected(r)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs transition hover:opacity-80"
                  style={{
                    background: selected === r ? '#ef444422' : 'rgb(39 39 42)',
                    border: `1px solid ${selected === r ? '#ef4444' : 'rgb(63 63 70)'}`,
                    color: selected === r ? '#ef4444' : 'rgb(161 161 170)',
                  }}>
                  <span className="w-3 h-3 rounded-full border flex-shrink-0 flex items-center justify-center"
                    style={{ borderColor: selected === r ? '#ef4444' : 'rgb(63 63 70)' }}>
                    {selected === r && <span className="w-1.5 h-1.5 rounded-full bg-red-400 block" />}
                  </span>
                  {r}
                </button>
              ))}
            </div>
            <button onClick={handleSend} disabled={!selected || sending}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition hover:opacity-80 disabled:opacity-40"
              style={{ background: '#ef444430', color: '#ef4444', border: '1px solid #ef444440' }}>
              {sending ? 'Enviando...' : 'Enviar reporte'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sección de Comentarios ─────────────────────────────────────────────────
function CommentsSection({ postId, currentUser, onCommentAdded }: {
  postId: string;
  currentUser: any;
  onCommentAdded: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );
    const unsub = onSnapshot(q, async snap => {
      const raw = snap.docs.map(d => ({ commentId: d.id, ...d.data() } as Comment));
      const enriched = await Promise.all(raw.map(async c => {
        if (c.authorName) return c;
        try {
          const uSnap = await getDoc(doc(db, 'users', c.authorId));
          if (uSnap.exists()) c.authorName = uSnap.data().displayName || 'Usuario';
        } catch {}
        return c;
      }));
      setComments(enriched);
      setLoading(false);
    }, (err) => {
      console.warn('onSnapshot comments error:', err);
      setLoading(false);
    });
    return () => unsub();
  }, [postId]);

  const handleSend = async () => {
    if (!text.trim()) return;
    if (!currentUser) { window.location.href = '/auth/login'; return; }
    if (text.trim().length > 2000) {
      setSendError('El comentario no puede superar 2000 caracteres.');
      return;
    }
    setSending(true);
    setSendError('');
    try {
      let authorName = currentUser.displayName || 'Usuario';
      try {
        const uSnap = await getDoc(doc(db, 'users', currentUser.uid));
        if (uSnap.exists()) authorName = uSnap.data().displayName || authorName;
      } catch {}

      await addDoc(collection(db, 'posts', postId, 'comments'), {
        postId,
        authorId: currentUser.uid,
        authorName,
        content: text.trim(),
        createdAt: serverTimestamp(),
        likesCount: 0,
      });
      await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(1) });
      setText('');
      onCommentAdded();
      textareaRef.current?.focus();
    } catch (e: any) {
      console.error('Error enviando comentario:', e);
      if (e?.code === 'permission-denied') {
        setSendError('Sin permisos. Asegúrate de que las reglas de Firestore están desplegadas correctamente.');
      } else if (e?.code === 'failed-precondition') {
        setSendError('Falta un índice en Firestore. Ejecuta: firebase deploy --only firestore:indexes');
      } else {
        setSendError('No se pudo enviar el comentario. Inténtalo de nuevo.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div id="comentarios" className="px-4 pt-4">
      <h2 className="text-sm font-semibold text-white mb-4">
        {comments.length > 0 ? `${comments.length} comentario${comments.length !== 1 ? 's' : ''}` : 'Comentarios'}
      </h2>

      <div className="flex gap-3 mb-5">
        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-800 dark:text-white text-xs font-bold flex-shrink-0">
          {currentUser ? (currentUser.displayName?.charAt(0) || currentUser.email?.charAt(0) || '?').toUpperCase() : '?'}
        </div>
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentUser ? 'Escribe un comentario... (Ctrl+Enter para enviar)' : 'Inicia sesión para comentar'}
            rows={2}
            disabled={!currentUser}
            className="w-full text-sm p-3 rounded-xl resize-none outline-none bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-600 transition disabled:opacity-50"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-zinc-600">{text.length > 0 ? `${text.length} caracteres` : ''}</span>
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending || !currentUser}
              className="text-xs px-4 py-1.5 rounded-full font-semibold transition hover:opacity-80 disabled:opacity-40"
              style={{ background: 'white', color: 'black' }}
            >
              {sending ? '...' : 'Comentar'}
            </button>
          </div>
          {sendError && (
            <p className="text-xs text-red-400 mt-2 px-1">{sendError}</p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-zinc-800 rounded w-24" />
                <div className="h-3 bg-zinc-800 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-3">💬</p>
          <p className="text-zinc-500 text-sm">Sé el primero en comentar.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {comments.map(c => (
            <div key={c.commentId} className="flex gap-3">
              <a href={`/profile/${c.authorId}`} className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-800 dark:text-white text-xs font-bold hover:opacity-80 transition">
                  {(c.authorName || '?').charAt(0).toUpperCase()}
                </div>
              </a>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <a href={`/profile/${c.authorId}`}
                    className="text-sm font-semibold text-white hover:underline">
                    {c.authorName || 'Usuario'}
                  </a>
                  <span className="text-xs text-zinc-600">{timeAgo(c.createdAt)}</span>
                  {currentUser && currentUser.uid !== c.authorId && (
                    <button
                      onClick={() => setReportingCommentId(c.commentId)}
                      className="ml-2 p-1 rounded text-zinc-600 hover:text-red-400 transition"
                      title="Reportar comentario">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
                      </svg>
                    </button>
                  )}
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {reportingCommentId && (
        <ReportCommentModal
          commentId={reportingCommentId}
          postId={postId}
          onClose={() => setReportingCommentId(null)}
        />
      )}
    </div>
  );
}

// ── Componente Principal ───────────────────────────────────────────────────
export default function PostDetailPage({ postId }: { postId: string }) {
  const lang = useLang();
  const [post,       setPost]       = useState<PostData | null>(null);
  const [disaster,   setDisaster]   = useState<DisasterData | null>(null);
  const [authorName, setAuthorName] = useState('');
  const [authorBadge, setAuthorBadge] = useState<BadgeType>(null);
  const [volunteers, setVolunteers] = useState<VolunteerData[]>([]);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [liked,   setLiked]   = useState(false);
  const [joined,  setJoined]  = useState(false);
  const [joining, setJoining] = useState(false);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);
  const [followingAuthor, setFollowingAuthor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('info');
  const [showShare, setShowShare] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [shares, setShares] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);

  useEffect(() => { return onAuthStateChanged(auth, setCurrentUser); }, []);

  useEffect(() => {
    if (window.location.hash === '#comentarios') {
      setTab('comments');
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [postId]);

  // ── Voluntarios en tiempo real (deduplicado por usuario) ──────────────────
  useEffect(() => {
    if (!postId) return;
    const q = query(
      collection(db, 'volunteers'),
      where('postId', '==', postId),
      limit(100)
    );
    const unsub = onSnapshot(q, async snap => {
      const map = new Map<string, VolunteerData>();
      for (const docSnap of snap.docs) {
        const v = { volunteerId: docSnap.id, ...docSnap.data() } as VolunteerData;
        const existing = map.get(v.userId);
        const currentTime = v.registeredAt?.toMillis?.() ?? 0;
        const existingTime = existing?.registeredAt?.toMillis?.() ?? 0;
        if (!existing || currentTime > existingTime) {
          try {
            const uSnap = await getDoc(doc(db, 'users', v.userId));
            if (uSnap.exists()) v.userDisplayName = uSnap.data().displayName;
          } catch {}
          map.set(v.userId, v);
        }
      }
      const uniqueVols = Array.from(map.values());
      uniqueVols.sort((a, b) => (b.registeredAt?.toMillis?.() ?? 0) - (a.registeredAt?.toMillis?.() ?? 0));
      setVolunteers(uniqueVols);
      setPost(p => p ? { ...p, volunteerCount: uniqueVols.length } : p);
    }, err => console.error('onSnapshot volunteers:', err));
    return () => unsub();
  }, [postId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const postSnap = await getDoc(doc(db, 'posts', postId));
      if (!postSnap.exists()) { setLoading(false); return; }
      const p = { postId: postSnap.id, ...postSnap.data() } as PostData;
      setPost(p);
      setShares(p.sharesCount || 0);
      setCommentsCount(p.commentsCount || 0);

      const vpSnap = await getDoc(doc(db, 'verifiedProfiles', p.authorId));
      if (vpSnap.exists()) {
        const vp = vpSnap.data();
        setAuthorName(vp.entityName || 'Organización');
        setAuthorBadge(getBadgeType({ role:'verified', isVerified:true, verifiedProfileType:vp.type, volunteerEventsCount:0, totalDonatedEUR:0 }));
      }

      const disSnap = await getDoc(doc(db, 'disasters', p.disasterId));
      if (disSnap.exists()) setDisaster({ disasterId: disSnap.id, ...disSnap.data() } as DisasterData);

      const relSnap = await getDocs(query(
        collection(db, 'posts'),
        where('disasterId', '==', p.disasterId),
        where('isActive', '==', true),
        where('isWarCrimeReport', '==', false),
        orderBy('createdAt', 'desc'),
        limit(6)
      ));
      const related: RelatedPost[] = await Promise.all(
        relSnap.docs
          .filter(d => d.id !== postId)
          .map(async d => {
            const rp = { postId: d.id, ...d.data() } as any;
            let aName = 'Organización'; let aBadge: BadgeType = null;
            try {
              const rvp = await getDoc(doc(db, 'verifiedProfiles', rp.authorId));
              if (rvp.exists()) {
                aName = rvp.data().entityName || aName;
                aBadge = getBadgeType({ role:'verified', isVerified:true, verifiedProfileType:rvp.data().type, volunteerEventsCount:0, totalDonatedEUR:0 });
              }
            } catch {}
            return { postId: rp.postId, title: rp.title, authorName: aName, authorBadge: aBadge, createdAt: rp.createdAt, likesCount: rp.likesCount || 0, urgencyLevel: rp.urgencyLevel };
          })
      );
      setRelatedPosts(related);

      if (auth.currentUser) {
        const likeSnap = await getDoc(doc(db, 'posts', postId, 'likes', auth.currentUser.uid));
        setLiked(likeSnap.exists());
        const volCheckSnap = await getDoc(doc(db, 'volunteers', `${postId}_${auth.currentUser.uid}`));
        setJoined(volCheckSnap.exists());
        try {
          const followSnap = await getDoc(doc(db, 'users', auth.currentUser.uid, 'following', p.authorId));
          setIsFollowingAuthor(followSnap.exists());
        } catch {}
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleFollowAuthor = async () => {
    if (!currentUser || !post) { window.location.href = '/auth/login'; return; }
    if (currentUser.uid === post.authorId) return;
    setFollowingAuthor(true);
    try {
      const followRef   = doc(db, 'users', currentUser.uid, 'following', post.authorId);
      const followerRef = doc(db, 'users', post.authorId, 'followers', currentUser.uid);
      if (isFollowingAuthor) {
        await deleteDoc(followRef);
        await deleteDoc(followerRef);
        await updateDoc(doc(db, 'users', post.authorId),    { followersCount: increment(-1) });
        await updateDoc(doc(db, 'users', currentUser.uid),  { followingCount: increment(-1) });
        setIsFollowingAuthor(false);
      } else {
        await setDoc(followRef,   { followingId: post.authorId, followedAt: new Date() });
        await setDoc(followerRef, { followerId: currentUser.uid, followedAt: new Date() });
        await updateDoc(doc(db, 'users', post.authorId),    { followersCount: increment(1) });
        await updateDoc(doc(db, 'users', currentUser.uid),  { followingCount: increment(1) });
        setIsFollowingAuthor(true);
      }
    } catch (e) { console.error(e); }
    finally { setFollowingAuthor(false); }
  };

  const handleLike = async () => {
    if (!currentUser || !post) { window.location.href = '/auth/login'; return; }
    setLiked(!liked);
    setPost(p => p ? { ...p, likesCount: liked ? p.likesCount - 1 : p.likesCount + 1 } : p);
    try {
      const likeRef = doc(db, 'posts', postId, 'likes', currentUser.uid);
      if (liked) { await deleteDoc(likeRef); await updateDoc(doc(db, 'posts', postId), { likesCount: increment(-1) }); }
      else        { await setDoc(likeRef, { userId: currentUser.uid, likedAt: new Date() }); await updateDoc(doc(db, 'posts', postId), { likesCount: increment(1) }); }
    } catch {}
  };

  const handleShare = async () => {
    setShowShare(true);
    try {
      await updateDoc(doc(db, 'posts', postId), { sharesCount: increment(1) });
      setShares(s => s + 1);
    } catch {}
  };

  const handleVolunteer = async () => {
    if (!currentUser || !post) { window.location.href = '/auth/login'; return; }
    setJoining(true);
    try {
      await setDoc(doc(db, 'volunteers', `${postId}_${currentUser.uid}`), {
        volunteerId: `${postId}_${currentUser.uid}`,
        userId: currentUser.uid, disasterId: post.disasterId, postId,
        status: 'registered', registeredAt: new Date(), updatedAt: new Date(),
        userPhone: '', userCountry: '', userCity: '', distanceToDisasterKm: 0,
        skills: [], languages: [], availabilityStart: new Date(),
      });
      setJoined(true);
      setPost(p => p ? { ...p, volunteerCount: p.volunteerCount + 1 } : p);
    } catch (e) { console.error(e); }
    finally { setJoining(false); }
  };

  const handleDonate = () => {
    if (!currentUser) { window.location.href = '/auth/login'; return; }
    if (post?.stripePaymentLinkUrl && post.donationApprovalStatus === 'approved') {
      window.open(post.stripePaymentLinkUrl, '_blank');
    }
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse space-y-4">
      <div className="flex gap-3"><div className="w-10 h-10 rounded-full bg-zinc-800"/><div className="flex-1 space-y-2"><div className="h-4 bg-zinc-800 rounded w-40"/><div className="h-3 bg-zinc-800 rounded w-24"/></div></div>
      <div className="h-6 bg-zinc-800 rounded w-3/4"/>
      <div className="h-40 bg-zinc-800 rounded-xl"/>
    </div>
  );
  if (!post) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center"><p className="text-zinc-500">Post no encontrado</p></div>
  );

  const donationActive = post.donationApprovalStatus === 'approved' && post.stripePaymentLinkUrl;
  const initials = authorName.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?';

  const TABS: {key:Tab;label:string;badge?:number}[] = [
    {key:'info', label:'Post'},
    {key:'comments', label:'Comentarios', badge: commentsCount},
    {key:'volunteers', label:'Voluntarios', badge: volunteers.length},
    {key:'donations', label:'Donaciones'},
    {key:'related', label:`#${post.disasterId}`, badge: relatedPosts.length},
  ];

  return (
    <div className="max-w-2xl mx-auto">

      <div className="px-4 pt-4 pb-2 flex items-center gap-2 border-b border-zinc-800">
        <a href="/" className="p-1.5 text-zinc-500 hover:text-white transition rounded-lg hover:bg-zinc-900">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
          </svg>
        </a>
        <span className="text-sm font-medium text-white">Post</span>
        <a href={`/disasters/${post.disasterId}`} className="ml-auto text-xs font-mono text-blue-400/70 hover:text-blue-400 transition">
          #{post.disasterId}
        </a>
        <button onClick={() => setShowReport(true)}
          className="ml-2 p-1.5 text-zinc-600 hover:text-red-400 transition rounded-lg hover:bg-zinc-900"
          title="Reportar post">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
          </svg>
        </button>
      </div>

      <div className="flex border-b border-zinc-800 overflow-x-auto">
        {TABS.map(tab_ => (
          <button key={tab_.key} onClick={() => setTab(tab_.key)}
            className={`flex-shrink-0 py-3 px-3 text-sm font-medium transition relative ${tab === tab_.key ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <span className="flex items-center justify-center gap-1.5">
              {tab_.label}
              {tab_.badge !== undefined && tab_.badge > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{tab_.badge}</span>
              )}
            </span>
            {tab === tab_.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full"/>}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="px-4 pt-4">
          <div className="flex items-center gap-3 mb-4">
            <a href={`/profile/${post.authorId}`} className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-800 dark:text-white text-sm font-bold hover:opacity-80 transition">
                {initials}
              </div>
            </a>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <a href={`/profile/${post.authorId}`} className="text-sm font-semibold text-white hover:underline">{authorName}</a>
                {authorBadge && <InlineBadge type={authorBadge}/>}
                {post.isAdminVerified && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.491 4.491 0 01-3.497-1.307 4.491 4.491 0 01-1.307-3.497A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.492 4.492 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd"/>
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-zinc-500">{timeAgo(post.createdAt)}</span>
                {post.locationName && <><span className="text-zinc-700">·</span><span className="text-xs text-zinc-500">{post.locationName}</span></>}
              </div>
            </div>
            {currentUser && post.authorId && currentUser.uid !== post.authorId && (
              <button
                onClick={handleFollowAuthor}
                disabled={followingAuthor}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-semibold border transition disabled:opacity-50 ${
                  isFollowingAuthor
                    ? 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-red-900/20 hover:text-red-400 hover:border-red-800/50'
                    : 'bg-white text-black border-transparent hover:opacity-80'
                }`}>
                {isFollowingAuthor ? 'Siguiendo' : 'Seguir'}
              </button>
            )}
          </div>

          <h1 className="text-xl font-bold text-white leading-snug mb-3">{post.title}</h1>
          <p className="text-zinc-300 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>

          {post.media && post.media.length > 0 && (
            <div className={`mb-4 grid gap-2 ${post.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {post.media.map((m, i) => (
                m.type === 'image' ? (
                  <div key={i} className="rounded-xl overflow-hidden bg-zinc-900">
                    <img src={m.url} alt={m.caption || post.title} className="w-full object-cover max-h-80"/>
                    {m.caption && <p className="text-xs text-zinc-500 px-3 py-2">{m.caption}</p>}
                  </div>
                ) : (
                  <div key={i} className="rounded-xl bg-zinc-900 p-3 flex items-center gap-2">
                    <span className="text-2xl">📎</span>
                    <span className="text-xs text-zinc-400">{m.caption || 'Adjunto'}</span>
                  </div>
                )
              ))}
            </div>
          )}

          {disaster && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className={`rounded-xl border p-3 text-center ${SEVERITY_COLOR[disaster.severity] || 'text-zinc-400 bg-zinc-900 border-zinc-700'}`}>
                <p className="text-lg font-bold">{fmtEUR(disaster.totalDonationsEUR)}</p>
                <p className="text-xs opacity-70 mt-0.5">recaudados (pool)</p>
              </div>
              <div className="rounded-xl border border-purple-800/30 bg-purple-900/20 p-3 text-center">
                <p className="text-lg font-bold text-purple-300">{disaster.totalVolunteersRegistered}</p>
                <p className="text-xs text-purple-400/70 mt-0.5">voluntarios (pool)</p>
              </div>
              <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-center">
                <p className="text-lg font-bold text-zinc-300">{fmtEUR(post.totalRaisedEUR)}</p>
                <p className="text-xs text-zinc-500 mt-0.5">este post</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 py-3 border-t border-zinc-800">
            <button onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition ${liked ? 'text-yellow-400' : 'text-zinc-500 hover:text-yellow-400 hover:bg-zinc-900'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill={liked?'currentColor':'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
              </svg>
              {post.likesCount}
            </button>
            <button onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-blue-400 hover:bg-zinc-900 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"/>
              </svg>
              {shares}
            </button>
            <button onClick={() => setTab('comments')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/>
              </svg>
              {commentsCount} comentarios
            </button>

            <div className="ml-auto flex items-center gap-2">
              {post.needsVolunteers && !joined && (
                <button onClick={handleVolunteer} disabled={joining}
                  className="px-3 py-2 rounded-lg border border-zinc-600 text-xs font-semibold text-white hover:bg-zinc-900 transition disabled:opacity-50">
                  {joining ? '...' : t('post.volunteer', lang)}
                </button>
              )}
              {joined && <span className="text-xs text-green-400 font-medium">{t('post.joined', lang)}</span>}
              {post.needsDonations && (
                <button onClick={handleDonate} disabled={!donationActive}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${donationActive ? 'bg-green-900/30 text-green-400 border border-green-800/50 hover:bg-green-900/50' : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'}`}>
                  {donationActive ? t('post.donate', lang) : t('post.donationPending', lang)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'comments' && (
        <CommentsSection
          postId={postId}
          currentUser={currentUser}
          onCommentAdded={() => setCommentsCount(c => c + 1)}
        />
      )}

      {tab === 'volunteers' && (
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">{volunteers.length} voluntarios apuntados</h2>
            {!joined && (
              <button onClick={handleVolunteer} disabled={joining}
                className="text-xs px-3 py-1.5 rounded-full bg-white text-black font-semibold hover:opacity-90 transition">
                {joining ? '...' : 'Apuntarme'}
              </button>
            )}
            {joined && <span className="text-xs text-green-400 font-medium">✓ Ya estás apuntado</span>}
          </div>

          {volunteers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-3">🙋</p>
              <p className="text-zinc-500 text-sm">Sé el primero en apuntarte como voluntario.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {volunteers.map(v => (
                <div key={v.volunteerId} className="flex items-center gap-3 px-3 py-2.5 bg-zinc-900 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-800 dark:text-white text-xs font-bold flex-shrink-0">
                    {v.userDisplayName?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{v.userDisplayName || 'Voluntario'}</p>
                    <p className="text-xs text-zinc-500">{v.userCity} · {v.status === 'registered' ? '📝 Registrado' : v.status === 'deployed' ? '🚀 Desplegado' : v.status}</p>
                  </div>
                  {v.skills?.length > 0 && (
                    <div className="flex gap-1 flex-wrap justify-end">
                      {v.skills.slice(0,2).map(s => (
                        <span key={s} className="text-xs px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded">{s}</span>
                      ))}
                    </div>
                  )}
                  <span className="text-xs text-zinc-600 flex-shrink-0">{timeAgo(v.registeredAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'donations' && (
        <div className="px-4 pt-4">
          <h2 className="text-sm font-semibold text-white mb-4">Donaciones del pool #{post.disasterId}</h2>
          {disaster && (
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-zinc-900 rounded-xl p-4 text-center border border-zinc-800">
                <p className="text-2xl font-bold text-green-400">{fmtEUR(disaster.totalDonationsEUR)}</p>
                <p className="text-xs text-zinc-500 mt-1">Total recaudado (pool)</p>
                <p className="text-xs text-zinc-600 mt-0.5">entre todos los posts</p>
              </div>
              <div className="bg-zinc-900 rounded-xl p-4 text-center border border-zinc-800">
                <p className="text-2xl font-bold text-blue-400">{disaster.totalDonorsCount}</p>
                <p className="text-xs text-zinc-500 mt-1">Donantes únicos</p>
              </div>
              <div className="bg-zinc-900 rounded-xl p-4 text-center border border-zinc-800">
                <p className="text-2xl font-bold text-white">{fmtEUR(post.totalRaisedEUR)}</p>
                <p className="text-xs text-zinc-500 mt-1">Este post</p>
              </div>
              <div className="bg-zinc-900 rounded-xl p-4 text-center border border-zinc-800">
                <p className="text-2xl font-bold text-zinc-300">{post.donationCount}</p>
                <p className="text-xs text-zinc-500 mt-1">Donaciones</p>
              </div>
            </div>
          )}
          {donationActive ? (
            <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-green-400 mb-1">Donaciones activas</p>
              <p className="text-xs text-zinc-400 mb-3">El dinero va directamente a {authorName} a través de Stripe.</p>
              <button onClick={handleDonate}
                className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition">
                💚 Donar ahora
              </button>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-zinc-400 mb-1">
                {post.needsDonations ? '⏳ Donaciones pendientes de aprobación' : 'Este post no solicita donaciones'}
              </p>
              {post.needsDonations && (
                <p className="text-xs text-zinc-600">Un moderador de GloVol debe aprobar el link de pago antes de activar las donaciones.</p>
              )}
            </div>
          )}
          <div className="flex items-start gap-2 px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl">
            <span className="text-zinc-500 text-sm mt-0.5 flex-shrink-0">ℹ</span>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Las donaciones de todos los posts sobre <strong className="text-zinc-400">#{post.disasterId}</strong> se contabilizan juntas en el pool de la catástrofe. Cada organización recibe sus propias donaciones de forma independiente.
            </p>
          </div>
        </div>
      )}

      {tab === 'related' && (
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Posts sobre #{post.disasterId}</h2>
              {disaster && <p className="text-xs text-zinc-500 mt-0.5">{disaster.title}</p>}
            </div>
            <a href={`/disasters/${post.disasterId}`} className="text-xs text-blue-400 hover:text-blue-300 transition">Ver pool →</a>
          </div>
          {relatedPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-3">📭</p>
              <p className="text-zinc-500 text-sm">No hay más posts sobre esta catástrofe todavía.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {relatedPosts.map(rp => (
                <a key={rp.postId} href={`/posts/${rp.postId}`}
                  className="flex items-center gap-3 px-3 py-3 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition border border-zinc-800">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs text-zinc-500 truncate">{rp.authorName}</span>
                      {rp.authorBadge && <InlineBadge type={rp.authorBadge}/>}
                    </div>
                    <p className="text-sm text-white font-medium leading-snug truncate">{rp.title}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-zinc-600">{timeAgo(rp.createdAt)}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">⭐ {rp.likesCount}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="h-8"/>

      {showShare && <ShareModal postId={postId} title={post.title} onClose={() => setShowShare(false)} />}
      {showReport && <ReportModal postId={postId} onClose={() => setShowReport(false)} />}
    </div>
  );
}