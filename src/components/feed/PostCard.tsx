import { useState, useRef, useEffect } from 'react';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, updateDoc, increment, setDoc, deleteDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { t, type LangCode } from '../../lib/i18n';
import { InlineBadge, type BadgeType } from '../profile/ProfileBadge';

interface Post {
  postId: string; disasterId: string; authorId: string; authorType: string;
  title: string; content: string; contentType: string; urgencyLevel: string;
  media: {url:string;type:string;caption?:string}[];
  locationName?: string; isPinned?: boolean;
  likesCount: number; sharesCount: number; commentsCount: number;
  volunteerCount: number; donationCount: number; totalRaisedEUR: number;
  needsDonations: boolean; needsVolunteers: boolean;
  donationApprovalStatus: string; stripePaymentLinkUrl?: string;
  isAdminVerified: boolean; isWarCrimeReport: boolean; createdAt: any;
  authorName?: string; authorBadge?: BadgeType; authorAvatar?: string;
}

const URGENCY_COLOR: Record<string,string> = {
  critical:'#ef4444', high:'#f97316', medium:'#eab308', low:'#22c55e',
};

function timeAgo(ts: any, lang: LangCode = 'es'): string {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return t('post.now', lang);
  if (diff < 3600) return t('post.minutesAgo', lang, { n: Math.floor(diff / 60) });
  if (diff < 86400) return t('post.hoursAgo', lang, { n: Math.floor(diff / 3600) });
  return t('post.daysAgo', lang, { n: Math.floor(diff / 86400) });
}
function fmt(n: number) {
  if (n >= 1000000) return (n/1000000).toFixed(1)+'M';
  if (n >= 1000) return (n/1000).toFixed(1)+'K';
  return String(n);
}

function ActionPill({ icon, label, onClick, active, disabled, accent }: {
  icon: React.ReactNode; label?: string | number; onClick?: () => void;
  active?: boolean; disabled?: boolean; accent?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
      style={{
        background: accent ? 'var(--gv-accent)' : active ? '#22c55e22' : 'var(--bg-pill)',
        color:      accent ? '#fff'              : active ? '#22c55e'   : 'var(--pill-text)',
        border:     'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}>
      {icon}
      {label !== undefined && <span>{label}</span>}
    </button>
  );
}

// ── Modal de Share ─────────────────────────────────────────────────────────
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
    {
      label: 'WhatsApp',
      icon: '💬',
      onClick: () => window.open(`https://wa.me/?text=${encodeURIComponent(title + '\n' + postUrl)}`, '_blank'),
    },
    {
      label: 'X / Twitter',
      icon: '✖',
      onClick: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(postUrl)}`, '_blank'),
    },
    {
      label: 'Telegram',
      icon: '✈',
      onClick: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(title)}`, '_blank'),
    },
    {
      label: 'Facebook',
      icon: 'f',
      onClick: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`, '_blank'),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 z-10"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Compartir post</h3>
          <button onClick={onClose} className="text-lg leading-none hover:opacity-60 transition" style={{ color: 'var(--text-3)' }}>✕</button>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {shareOptions.map(opt => (
            <button
              key={opt.label}
              onClick={opt.onClick}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:opacity-80 transition"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
            >
              <span className="text-xl">{opt.icon}</span>
              <span className="text-xs" style={{ color: 'var(--text-2)' }}>{opt.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
          <span className="text-xs truncate flex-1" style={{ color: 'var(--text-3)' }}>{postUrl}</span>
          <button
            onClick={copyLink}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 transition hover:opacity-80"
            style={{ background: copied ? '#22c55e22' : 'var(--bg-pill)', color: copied ? '#22c55e' : 'var(--text)' }}
          >
            {copied ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de Reporte ───────────────────────────────────────────────────────
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
        postId,
        reportedBy: user.uid,
        reason: selected,
        extra: extra.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setSent(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 z-10"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {sent ? (
          <div className="text-center py-6">
            <p className="text-3xl mb-3">✅</p>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>Reporte enviado</p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>Nuestro equipo lo revisará en breve. Gracias por ayudarnos a mantener GloVol seguro.</p>
            <button onClick={onClose} className="text-xs px-4 py-2 rounded-xl font-semibold hover:opacity-80 transition" style={{ background: 'var(--bg-pill)', color: 'var(--text)' }}>Cerrar</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Reportar post</h3>
              <button onClick={onClose} className="text-lg leading-none hover:opacity-60 transition" style={{ color: 'var(--text-3)' }}>✕</button>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-3)' }}>¿Por qué quieres reportar este post?</p>
            <div className="flex flex-col gap-2 mb-4">
              {reasons.map(r => (
                <button
                  key={r}
                  onClick={() => setSelected(r)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs transition hover:opacity-80"
                  style={{
                    background: selected === r ? '#ef444422' : 'var(--bg-input)',
                    border: `1px solid ${selected === r ? '#ef4444' : 'var(--border)'}`,
                    color: selected === r ? '#ef4444' : 'var(--text-2)',
                  }}
                >
                  <span className="w-3 h-3 rounded-full border flex-shrink-0 flex items-center justify-center"
                    style={{ borderColor: selected === r ? '#ef4444' : 'var(--border)' }}>
                    {selected === r && <span className="w-1.5 h-1.5 rounded-full bg-red-400 block" />}
                  </span>
                  {r}
                </button>
              ))}
            </div>
            {selected === 'Otro motivo' && (
              <textarea
                value={extra}
                onChange={e => setExtra(e.target.value)}
                placeholder="Describe el problema..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl resize-none mb-4 outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            )}
            <button
              onClick={handleSend}
              disabled={!selected || sending}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition hover:opacity-80 disabled:opacity-40"
              style={{ background: '#ef444430', color: '#ef4444', border: '1px solid #ef444440' }}
            >
              {sending ? 'Enviando...' : 'Enviar reporte'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Menú tres puntos ───────────────────────────────────────────────────────
function DotsMenu({ postId, onReport }: { postId: string; onReport: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs px-1 transition hover:opacity-60"
        style={{ color: 'var(--text-3)' }}
      >
        •••
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 rounded-xl py-1 z-30 min-w-[160px] shadow-xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <a
            href={`/posts/${postId}`}
            className="flex items-center gap-2 px-4 py-2.5 text-xs hover:opacity-70 transition"
            style={{ color: 'var(--text-2)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            Ver post completo
          </a>
          <div style={{ height: '1px', background: 'var(--border)', margin: '2px 12px' }} />
          <button
            onClick={() => { setOpen(false); onReport(); }}
            className="flex items-center gap-2 px-4 py-2.5 text-xs w-full text-left hover:opacity-70 transition"
            style={{ color: '#ef4444' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
            </svg>
            Reportar post
          </button>
        </div>
      )}
    </div>
  );
}

export default function PostCard({ post, compact = false, lang = 'es' }: {
  post: Post; compact?: boolean; lang?: LangCode;
}) {
  const [liked,  setLiked]  = useState(false);
  const [likes,  setLikes]  = useState(post.likesCount);
  const [shares, setShares] = useState(post.sharesCount);
  const [joined, setJoined] = useState(false);
  const [joining,setJoining]= useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  // Cargar estado inicial (like, voluntario) al iniciar sesión o al montar
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setCurrentUser(u);
      if (!u) { setLiked(false); setJoined(false); return; }
      try {
        const likeSnap = await getDoc(doc(db, 'posts', post.postId, 'likes', u.uid));
        setLiked(likeSnap.exists());
        const volSnap = await getDoc(doc(db, 'volunteers', `${post.disasterId}_${u.uid}`));
        setJoined(volSnap.exists());
      } catch {}
    });
    return () => unsub();
  }, [post.postId, post.disasterId]);

  const user = currentUser;

  const handleLike = async () => {
    if (!user) { window.location.href = '/auth/login'; return; }
    setLiked(!liked); setLikes(l => liked ? l-1 : l+1);
    try {
      const ref = doc(db, 'posts', post.postId, 'likes', user.uid);
      if (liked) { await deleteDoc(ref); await updateDoc(doc(db,'posts',post.postId),{likesCount:increment(-1)}); }
      else       { await setDoc(ref,{userId:user.uid,likedAt:new Date()}); await updateDoc(doc(db,'posts',post.postId),{likesCount:increment(1)}); }
    } catch {}
  };

  const handleVolunteer = async () => {
    if (!user) { window.location.href = '/auth/login'; return; }
    setJoining(true);
    try {
      await setDoc(doc(db,'volunteers',`${post.disasterId}_${user.uid}`), {
        volunteerId:`${post.disasterId}_${user.uid}`, userId:user.uid,
        disasterId:post.disasterId, postId:post.postId,
        status:'registered', registeredAt:new Date(), updatedAt:new Date(),
        userPhone:'', userCountry:'', userCity:'', distanceToDisasterKm:0,
        skills:[], languages:[], availabilityStart:new Date(),
      });
      setJoined(true);
    } catch {} finally { setJoining(false); }
  };

  const handleDonate = () => {
    if (!user) { window.location.href = '/auth/login'; return; }
    if (post.stripePaymentLinkUrl && post.donationApprovalStatus === 'approved')
      window.open(post.stripePaymentLinkUrl, '_blank');
  };

  const handleShare = async () => {
    setShowShare(true);
    try {
      await updateDoc(doc(db, 'posts', post.postId), { sharesCount: increment(1) });
      setShares(s => s + 1);
    } catch {}
  };

  const donationActive = post.donationApprovalStatus === 'approved' && post.stripePaymentLinkUrl;
  const initials = (post.authorName || '?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const urgencyColor = URGENCY_COLOR[post.urgencyLevel];

  // ── Vista compacta ──────────────────────────────────────────────────────
  if (compact) return (
    <>
      <div className="rounded-xl overflow-hidden transition-opacity hover:opacity-90"
        style={{ border:'1px solid var(--border)', background:'var(--bg-card)' }}>
        <a href={`/posts/${post.postId}`} className="flex gap-3 p-3">
          {post.media?.[0] && (
            <img src={post.media[0].url} alt="" className="w-20 h-16 object-cover rounded-lg flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background:'#22c55e', color:'#fff' }}>{initials.charAt(0)}</div>
              <span className="text-xs truncate" style={{ color:'var(--text-2)' }}>{post.authorName}</span>
              {post.isAdminVerified && <span style={{ color:'#3b82f6', fontSize:10 }}>✓</span>}
              <span className="text-xs ml-auto flex-shrink-0" style={{ color:'var(--text-3)' }}>{timeAgo(post.createdAt, lang)}</span>
            </div>
            <p className="text-sm font-semibold leading-tight truncate mb-2" style={{ color:'var(--text)' }}>{post.title}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <ActionPill icon={<span>★</span>} label={fmt(likes)} onClick={handleLike} active={liked} />
              <ActionPill
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"/></svg>}
                label={fmt(shares)}
                onClick={e => { e?.stopPropagation(); handleShare(); }}
              />
              <ActionPill icon={<span>💬</span>} label={fmt(post.commentsCount)} />
              {post.needsDonations && (
                <ActionPill icon={<span>$</span>} label="Donar" onClick={handleDonate} disabled={!donationActive} accent={donationActive || false} />
              )}
              {post.needsVolunteers && !joined && (
                <ActionPill icon={<span>🙋</span>} label={joining ? '...' : t('post.volunteer', lang)} onClick={handleVolunteer} />
              )}
              {joined && <span className="text-xs" style={{ color:'#22c55e' }}>✓ {t('post.joined', lang)}</span>}
            </div>
          </div>
        </a>
      </div>
      {showShare && <ShareModal postId={post.postId} title={post.title} onClose={() => setShowShare(false)} />}
      {showReport && <ReportModal postId={post.postId} onClose={() => setShowReport(false)} />}
    </>
  );

  // ── Vista tarjeta completa ──────────────────────────────────────────────
  return (
    <>
      <div className="rounded-2xl overflow-hidden" style={{ border:'1px solid var(--border)', background:'var(--bg-card)' }}>

        {/* Header del post */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          {post.authorAvatar
            ? <img src={post.authorAvatar} className="w-9 h-9 rounded-full object-cover flex-shrink-0" alt="" />
            : <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white" style={{ background:'#22c55e' }}>{initials}</div>
          }
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <a href={`/profile/${post.authorId}`} className="text-sm font-semibold hover:underline truncate" style={{ color:'var(--text)' }}>
                {post.authorName || 'Organización'}
              </a>
              {post.authorBadge && <InlineBadge type={post.authorBadge} />}
              {post.isAdminVerified && (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="#3b82f6">
                  <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.491 4.491 0 01-3.497-1.307 4.491 4.491 0 01-1.307-3.497A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.492 4.492 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                </svg>
              )}
              {urgencyColor && post.urgencyLevel !== 'low' && (
                <span className="text-xs font-semibold" style={{ color: urgencyColor }}>
                  {post.urgencyLevel === 'critical' ? '⚡' : post.urgencyLevel === 'high' ? '🔴' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs" style={{ color:'var(--text-3)' }}>{timeAgo(post.createdAt, lang)}</span>
              {post.locationName && <><span style={{ color:'var(--border-2)' }}>·</span><span className="text-xs truncate" style={{ color:'var(--text-3)' }}>{post.locationName}</span></>}
              <a href={`/disasters/${post.disasterId}`} onClick={e => e.stopPropagation()}
                className="text-xs font-mono transition hover:opacity-80" style={{ color:'#3b82f6' }}>
                #{post.disasterId}
              </a>
            </div>
          </div>

          {/* Cabecera derecha */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {post.needsVolunteers && !joined && (
              <button onClick={handleVolunteer} disabled={joining}
                className="text-xs px-3 py-1.5 rounded-full font-semibold transition hover:opacity-80 disabled:opacity-50"
                style={{ border:'1px solid var(--border)', color:'var(--text)', background:'var(--bg-input)' }}>
                {joining ? '...' : t('post.volunteer', lang)}
              </button>
            )}
            {joined && <span className="text-xs font-semibold" style={{ color:'#22c55e' }}>✓</span>}
            <DotsMenu postId={post.postId} onReport={() => setShowReport(true)} />
          </div>
        </div>

        {/* Título y contenido */}
        <div className="px-4 pb-2">
          <a href={`/posts/${post.postId}`}
            className="block text-sm font-semibold mb-1 leading-snug hover:underline" style={{ color:'var(--text)' }}>
            {post.title}
          </a>
          <p className="text-sm leading-relaxed line-clamp-2" style={{ color:'var(--text-2)' }}>{post.content}</p>
        </div>

        {/* Imagen */}
        {post.media?.[0] && (
          <div className="mx-4 mb-3 rounded-xl overflow-hidden" style={{ background:'var(--bg-input)' }}>
            <img src={post.media[0].url} alt={post.media[0].caption || post.title} className="w-full h-48 object-cover" />
          </div>
        )}

        {/* Barra de acciones */}
        <div className="flex items-center gap-2 px-3 py-2.5 flex-wrap" style={{ borderTop:'1px solid var(--border)' }}>
          <ActionPill
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill={liked?'currentColor':'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/></svg>}
            label={fmt(likes)} onClick={handleLike} active={liked}
          />
          <ActionPill
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"/></svg>}
            label={fmt(shares)}
            onClick={handleShare}
          />
          {/* Comentarios — lleva al detalle del post */}
          <a href={`/posts/${post.postId}#comentarios`} style={{ textDecoration: 'none' }}>
            <ActionPill
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/></svg>}
              label={fmt(post.commentsCount)}
            />
          </a>

          <div className="ml-auto flex items-center gap-2">
            {post.needsDonations && (
              <ActionPill
                icon={<span className="font-bold">$</span>}
                label={donationActive ? t('post.donate', lang) : t('post.donationPending', lang)}
                onClick={handleDonate}
                disabled={!donationActive}
                accent={donationActive || false}
              />
            )}
          </div>
        </div>
      </div>

      {showShare && <ShareModal postId={post.postId} title={post.title} onClose={() => setShowShare(false)} />}
      {showReport && <ReportModal postId={post.postId} onClose={() => setShowReport(false)} />}
    </>
  );
}
