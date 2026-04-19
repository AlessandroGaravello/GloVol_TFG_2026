import { useState, useEffect, useCallback } from 'react';
import { auth, db } from '../../lib/firebase';
import {
  collection, query, where, orderBy, limit, getDocs,
  doc, getDoc, updateDoc, setDoc, deleteDoc,
  serverTimestamp, onSnapshot, addDoc, Timestamp,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────
interface AdminUser { uid: string; role: string; }

interface Report {
  id: string;
  type?: 'post' | 'comment'; // si no existe, asumir 'post'
  postId?: string;
  commentId?: string;
  reportedBy: string;
  reason: string;
  extra?: string;
  status: string;
  createdAt: any;
  // enriched
  postTitle?: string;
  postAuthorId?: string;
  postIsActive?: boolean;
  reporterName?: string;
  // para comentarios
  commentContent?: string;
  commentAuthorName?: string;
}

interface VerifRequest {
  id: string; userId: string; requestType: string; status: string;
  submittedAt: any; documents?: string[];
  // government
  governmentLevel?: string; governmentEntity?: string;
  position?: string; territory?: string; country?: string;
  // journalist
  journalistType?: string; pressAgencyName?: string;
  journalistLicenseNumber?: string; requestsWarCrimePosting?: boolean;
  // organization
  orgName?: string; orgType?: string; orgCountry?: string;
  orgRegistrationNumber?: string;
  // reviewer
  reviewedBy?: string; reviewedAt?: any; rejectionReason?: string;
  // enriched
  userName?: string; userEmail?: string; userCountry?: string;
}

interface PendingDonation {
  id: string; title: string; authorId: string; disasterId: string;
  createdAt: any; needsDonations: boolean; donationApprovalStatus: string;
  stripePaymentLinkUrl?: string;
  // enriched
  authorName?: string;
}

interface UserRow {
  uid: string; displayName: string; username: string; email: string;
  role: string; isVerified: boolean; isActive: boolean;
  verificationStatus: string; createdAt: any;
  followersCount: number;
}

interface Stats {
  pendingVerifs: number; pendingDonations: number;
  openReports: number; totalUsers: number;
  totalPosts: number; totalDisasters: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function timeAgo(ts: any): string {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 3600)  return `Hace ${Math.floor(s/60)}m`;
  if (s < 86400) return `Hace ${Math.floor(s/3600)}h`;
  return d.toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });
}

function Badge({ label, color }: { label: string; color: string }) {
  const map: Record<string, string> = {
    red:    'bg-red-900/30 text-red-400 border-red-800/40',
    orange: 'bg-orange-900/30 text-orange-400 border-orange-800/40',
    yellow: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/40',
    green:  'bg-green-900/30 text-green-400 border-green-800/40',
    blue:   'bg-blue-900/30 text-blue-400 border-blue-800/40',
    zinc:   'bg-zinc-800 text-zinc-400 border-zinc-700',
    purple: 'bg-purple-900/30 text-purple-400 border-purple-800/40',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${map[color] || map.zinc}`}>
      {label}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-zinc-300 animate-spin" />
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <span className="text-4xl mb-3">{icon}</span>
      <p className="text-zinc-500 text-sm">{text}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: Tarjeta de sección con título
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeader({ title, count, subtitle }: { title: string; count?: number; subtitle?: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {count !== undefined && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{count}</span>
        )}
      </div>
      {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function DashboardTab({ stats, loading }: { stats: Stats; loading: boolean }) {
  const cards = [
    { label: 'Verificaciones pendientes', value: stats.pendingVerifs,   color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-800/30', icon: '🔍' },
    { label: 'Donaciones por aprobar',    value: stats.pendingDonations, color: 'text-green-400',  bg: 'bg-green-900/20 border-green-800/30',   icon: '💚' },
    { label: 'Reportes abiertos',         value: stats.openReports,      color: 'text-red-400',    bg: 'bg-red-900/20 border-red-800/30',        icon: '🚩' },
    { label: 'Usuarios totales',          value: stats.totalUsers,       color: 'text-blue-400',   bg: 'bg-blue-900/20 border-blue-800/30',      icon: '👤' },
    { label: 'Posts publicados',          value: stats.totalPosts,       color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-800/30',  icon: '📝' },
    { label: 'Catástrofes activas',       value: stats.totalDisasters,   color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-800/30',  icon: '🌍' },
  ];

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionHeader title="Panel de administración" subtitle="Resumen del estado actual de la plataforma" />
      <div className="grid grid-cols-3 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className={`rounded-2xl p-5 border ${c.bg}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{c.icon}</span>
              <span className={`text-3xl font-bold ${c.color}`}>{c.value}</span>
            </div>
            <p className="text-xs text-zinc-400 font-medium">{c.label}</p>
          </div>
        ))}
      </div>

      {(stats.pendingVerifs > 0 || stats.pendingDonations > 0 || stats.openReports > 0) && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-sm font-semibold text-white mb-3">⚡ Acciones pendientes</p>
          <div className="flex flex-col gap-2">
            {stats.pendingVerifs > 0 && (
              <div className="flex items-center gap-2 text-sm text-yellow-400">
                <span>•</span>
                <span>{stats.pendingVerifs} solicitud{stats.pendingVerifs !== 1 ? 'es' : ''} de verificación esperando revisión</span>
              </div>
            )}
            {stats.pendingDonations > 0 && (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <span>•</span>
                <span>{stats.pendingDonations} enlace{stats.pendingDonations !== 1 ? 's' : ''} de donación pendiente{stats.pendingDonations !== 1 ? 's' : ''} de aprobación</span>
              </div>
            )}
            {stats.openReports > 0 && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <span>•</span>
                <span>{stats.openReports} reporte{stats.openReports !== 1 ? 's' : ''} sin revisar</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. REPORTES (mejorado para mostrar comentarios)
// ─────────────────────────────────────────────────────────────────────────────
function ReportsTab({ adminUid }: { adminUid: string }) {
  const [reports, setReports]   = useState<Report[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter,  setFilter]    = useState<'pending'|'reviewed'|'dismissed'>('pending');
  const [working, setWorking]   = useState<string | null>(null);
  const [toast,   setToast]     = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, 'reports'),
        where('status', '==', filter),
        orderBy('createdAt', 'desc'),
        limit(50)
      ));
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() } as Report));

      // Enriquecer con datos del post o comentario y del reporter
      const enriched = await Promise.all(raw.map(async r => {
        try {
          // Si es reporte de comentario
          if (r.type === 'comment' && r.commentId && r.postId) {
            // Obtener comentario desde subcolección
            const commentRef = doc(db, 'posts', r.postId, 'comments', r.commentId);
            const commentSnap = await getDoc(commentRef);
            if (commentSnap.exists()) {
              const commentData = commentSnap.data();
              r.commentContent = commentData.content;
              r.commentAuthorName = commentData.authorName || 'Usuario';
            }
            // También obtener título del post para contexto
            const postSnap = await getDoc(doc(db, 'posts', r.postId));
            if (postSnap.exists()) {
              r.postTitle = postSnap.data().title;
              r.postAuthorId = postSnap.data().authorId;
              r.postIsActive = postSnap.data().isActive;
            }
          } else if (r.postId) {
            // Reporte de post normal
            const pSnap = await getDoc(doc(db, 'posts', r.postId));
            if (pSnap.exists()) {
              r.postTitle = pSnap.data().title;
              r.postAuthorId = pSnap.data().authorId;
              r.postIsActive = pSnap.data().isActive;
            }
          }
          if (r.reportedBy) {
            const uSnap = await getDoc(doc(db, 'users', r.reportedBy));
            if (uSnap.exists()) r.reporterName = uSnap.data().displayName || uSnap.data().email;
          }
        } catch (err) {
          console.error('Error fetching report details:', err);
        }
        return r;
      }));
      setReports(enriched);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const action = async (reportId: string, type: 'dismiss' | 'hide' | 'ban', report: Report) => {
    setWorking(reportId);
    try {
      if (type === 'dismiss') {
        await updateDoc(doc(db, 'reports', reportId), {
          status: 'dismissed', reviewedBy: adminUid, reviewedAt: serverTimestamp(),
        });
        showToast('Reporte descartado.');
      } else if (type === 'hide') {
        if (report.postId) {
          await updateDoc(doc(db, 'posts', report.postId), { isActive: false });
        }
        await updateDoc(doc(db, 'reports', reportId), {
          status: 'reviewed', reviewedBy: adminUid, reviewedAt: serverTimestamp(),
          action: 'post_hidden',
        });
        showToast('Post ocultado y reporte marcado como revisado.');
      } else if (type === 'ban') {
        if (report.postAuthorId) {
          await updateDoc(doc(db, 'users', report.postAuthorId), { isActive: false });
        }
        await updateDoc(doc(db, 'reports', reportId), {
          status: 'reviewed', reviewedBy: adminUid, reviewedAt: serverTimestamp(),
          action: 'user_banned',
        });
        showToast('Usuario suspendido y reporte marcado como revisado.');
      }
      await loadReports();
    } catch (e) { console.error(e); }
    finally { setWorking(null); }
  };

  const REASON_COLOR: Record<string, string> = {
    'Información falsa o engañosa':    'yellow',
    'Contenido inapropiado u ofensivo': 'orange',
    'Spam o publicidad no solicitada': 'zinc',
    'Contenido que incita al odio':    'red',
    'Solicitud de donaciones fraudulenta': 'red',
    'Otro motivo':                     'zinc',
  };

  return (
    <div>
      <SectionHeader title="Reportes" subtitle="Gestiona los reportes enviados por usuarios sobre posts o comentarios" />

      {/* Filtro */}
      <div className="flex gap-2 mb-5">
        {(['pending','reviewed','dismissed'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition border ${
              filter === s
                ? 'bg-white text-black border-white'
                : 'text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-white'
            }`}>
            { s === 'pending' ? '🚩 Pendientes' : s === 'reviewed' ? '✓ Revisados' : '🗑 Descartados' }
          </button>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-green-900/20 border border-green-800/40 text-sm text-green-400">
          ✓ {toast}
        </div>
      )}

      {loading ? <Spinner /> : reports.length === 0 ? (
        <EmptyState icon="🎉" text={`No hay reportes ${filter === 'pending' ? 'pendientes' : filter === 'reviewed' ? 'revisados' : 'descartados'}.`} />
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map(r => (
            <div key={r.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  {/* Tipo de reporte: Post o Comentario */}
                  <div className="flex items-center gap-2 mb-2">
                    <Badge label={r.type === 'comment' ? '💬 Comentario' : '📄 Post'} color={r.type === 'comment' ? 'blue' : 'purple'} />
                    <span className="text-xs text-zinc-500">ID: {r.id.slice(0,8)}</span>
                  </div>

                  {/* Contenido reportado */}
                  {r.type === 'comment' ? (
                    <>
                      <div className="mb-2">
                        <p className="text-xs text-zinc-500 mb-1">Comentario reportado:</p>
                        <div className="bg-zinc-800 rounded-lg p-2 text-sm text-white">
                          {r.commentContent || 'Comentario no disponible'}
                        </div>
                        {r.commentAuthorName && (
                          <p className="text-xs text-zinc-500 mt-1">Autor del comentario: {r.commentAuthorName}</p>
                        )}
                      </div>
                      {r.postTitle && (
                        <p className="text-xs text-zinc-500">En el post: <span className="text-white">{r.postTitle}</span></p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-white truncate">{r.postTitle || r.postId}</p>
                      {r.postAuthorId && <p className="text-xs text-zinc-500">Autor del post: {r.postAuthorId}</p>}
                    </>
                  )}

                  {/* Motivo */}
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    <Badge label={r.reason} color={REASON_COLOR[r.reason] || 'zinc'} />
                    {r.extra && (
                      <span className="text-xs text-zinc-500 italic">"{r.extra}"</span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-zinc-500">{timeAgo(r.createdAt)}</p>
                  {r.reporterName && <p className="text-xs text-zinc-600 mt-0.5">por {r.reporterName}</p>}
                </div>
              </div>

              {/* Acciones (solo pendientes) */}
              {filter === 'pending' && (
                <div className="flex gap-2 pt-3 border-t border-zinc-800">
                  <button onClick={() => action(r.id, 'dismiss', r)} disabled={working === r.id}
                    className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white disabled:opacity-40">
                    Descartar reporte
                  </button>
                  <button onClick={() => action(r.id, 'hide', r)} disabled={working === r.id || !r.postId || r.postIsActive === false}
                    className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition disabled:opacity-40"
                    style={{ background: '#f97316', color: 'white', opacity: (!r.postId || r.postIsActive === false) ? 0.4 : 1 }}>
                    Ocultar post
                  </button>
                  <button onClick={() => action(r.id, 'ban', r)} disabled={working === r.id || !r.postAuthorId}
                    className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition disabled:opacity-40"
                    style={{ background: '#ef4444', color: 'white' }}>
                    Suspender autor
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. VERIFICACIONES
// ─────────────────────────────────────────────────────────────────────────────
function VerificationsTab({ adminUid }: { adminUid: string }) {
  const [requests, setRequests] = useState<VerifRequest[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<'pending'|'under_review'|'approved'|'rejected'>('pending');
  const [working,  setWorking]  = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, 'verificationRequests'),
        where('status', 'in', filter === 'pending' ? ['pending', 'under_review'] : [filter]),
        orderBy('submittedAt', 'asc'),
        limit(50)
      ));
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() } as VerifRequest));
      const enriched = await Promise.all(raw.map(async r => {
        try {
          const uSnap = await getDoc(doc(db, 'users', r.userId));
          if (uSnap.exists()) {
            r.userName  = uSnap.data().displayName;
            r.userEmail = uSnap.data().email;
            r.userCountry = uSnap.data().country;
          }
        } catch {}
        return r;
      }));
      setRequests(enriched);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const markUnderReview = async (reqId: string) => {
    await updateDoc(doc(db, 'verificationRequests', reqId), {
      status: 'under_review', reviewedBy: adminUid,
    });
    showToast('Solicitud marcada como en revisión.');
    load();
  };

  const approve = async (req: VerifRequest) => {
    setWorking(req.id);
    try {
      const profileData: any = {
        userId: req.userId,
        type: req.requestType,
        displayBadge: req.requestType,
        canPostWarCrimes: req.requestsWarCrimePosting ?? false,
        postsCount: 0,
        followersCount: 0,
        verifiedBy: adminUid,
        verifiedAt: serverTimestamp(),
        entityCountry: req.country || req.orgCountry || '',
      };

      if (req.requestType === 'government') {
        profileData.entityName = req.governmentEntity || '';
        profileData.position   = req.position || '';
        profileData.entityLevel = req.governmentLevel || '';
      } else if (req.requestType === 'journalist') {
        profileData.entityName    = req.pressAgencyName || 'Periodista independiente';
        profileData.journalistType = req.journalistType || 'independent';
        profileData.pressAgency   = req.pressAgencyName || '';
        profileData.position      = 'Periodista';
        if (req.requestsWarCrimePosting) profileData.canPostWarCrimes = true;
      } else if (req.requestType === 'organization') {
        profileData.entityName = req.orgName || '';
        profileData.orgType    = req.orgType || '';
        profileData.position   = 'Representante';
      }

      await setDoc(doc(db, 'verifiedProfiles', req.userId), profileData);
      await updateDoc(doc(db, 'users', req.userId), {
        isVerified: true,
        verificationStatus: 'approved',
        role: 'user',
        ...(req.requestsWarCrimePosting ? { warCrimesAccess: true } : {}),
      });
      await updateDoc(doc(db, 'verificationRequests', req.id), {
        status: 'approved',
        reviewedBy: adminUid,
        reviewedAt: serverTimestamp(),
      });
      showToast(`✓ Cuenta de ${req.userName || req.userId} verificada como ${req.requestType}.`);
      load();
    } catch (e: any) {
      console.error(e);
      showToast('Error al aprobar: ' + (e?.message || 'unknown'));
    } finally { setWorking(null); }
  };

  const reject = async (req: VerifRequest) => {
    if (!rejectReason.trim()) return;
    setWorking(req.id);
    try {
      await updateDoc(doc(db, 'users', req.userId), {
        verificationStatus: 'rejected',
      });
      await updateDoc(doc(db, 'verificationRequests', req.id), {
        status: 'rejected',
        reviewedBy: adminUid,
        reviewedAt: serverTimestamp(),
        rejectionReason: rejectReason.trim(),
      });
      setRejectTarget(null);
      setRejectReason('');
      showToast(`Solicitud de ${req.userName || req.userId} rechazada.`);
      load();
    } catch (e: any) {
      console.error(e);
      showToast('Error al rechazar.');
    } finally { setWorking(null); }
  };

  const TYPE_LABEL: Record<string, string> = {
    government: '🏛️ Gobierno', journalist: '📰 Periodista', organization: '🤝 Organización',
  };
  const TYPE_COLOR: Record<string, string> = {
    government: 'yellow', journalist: 'blue', organization: 'green',
  };

  return (
    <div>
      <SectionHeader title="Solicitudes de verificación"
        subtitle="Revisa la documentación enviada y aprueba o rechaza cada solicitud" />

      <div className="flex gap-2 mb-5">
        {(['pending', 'approved', 'rejected'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition border ${
              filter === s
                ? 'bg-white text-black border-white'
                : 'text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-white'
            }`}>
            { s === 'pending' ? '⏳ Pendientes / En revisión' : s === 'approved' ? '✓ Aprobadas' : '✕ Rechazadas' }
          </button>
        ))}
      </div>

      {toast && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-green-900/20 border border-green-800/40 text-sm text-green-400">
          {toast}
        </div>
      )}

      {loading ? <Spinner /> : requests.length === 0 ? (
        <EmptyState icon="📋" text={`No hay solicitudes ${filter === 'pending' ? 'pendientes' : filter === 'approved' ? 'aprobadas' : 'rechazadas'}.`} />
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map(r => (
            <div key={r.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {(r.userName || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{r.userName || 'Usuario desconocido'}</span>
                    <Badge label={TYPE_LABEL[r.requestType] || r.requestType} color={TYPE_COLOR[r.requestType] || 'zinc'} />
                    <Badge
                      label={r.status === 'pending' ? '⏳ Pendiente' : r.status === 'under_review' ? '🔍 En revisión' : r.status === 'approved' ? '✓ Aprobada' : '✕ Rechazada'}
                      color={r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : r.status === 'under_review' ? 'blue' : 'yellow'}
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{r.userEmail} · Enviado {timeAgo(r.submittedAt)}</p>
                </div>
                <button onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition flex-shrink-0">
                  {expanded === r.id ? 'Cerrar ↑' : 'Ver datos ↓'}
                </button>
              </div>

              {expanded === r.id && (
                <div className="px-4 pb-4 border-t border-zinc-800 pt-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {r.requestType === 'government' && (
                      <>
                        <DataField label="Entidad" value={r.governmentEntity} />
                        <DataField label="Nivel" value={r.governmentLevel} />
                        <DataField label="Cargo" value={r.position} />
                        <DataField label="Territorio" value={r.territory} />
                        <DataField label="País" value={r.country} />
                      </>
                    )}
                    {r.requestType === 'journalist' && (
                      <>
                        <DataField label="Tipo periodista" value={r.journalistType} />
                        <DataField label="Medio / Agencia" value={r.pressAgencyName || 'Independiente'} />
                        <DataField label="N.º licencia" value={r.journalistLicenseNumber} />
                        <DataField label="Pide acceso crímenes de guerra" value={r.requestsWarCrimePosting ? '✓ Sí' : '✗ No'} />
                      </>
                    )}
                    {r.requestType === 'organization' && (
                      <>
                        <DataField label="Nombre org." value={r.orgName} />
                        <DataField label="Tipo" value={r.orgType} />
                        <DataField label="País" value={r.orgCountry} />
                        <DataField label="N.º registro" value={r.orgRegistrationNumber} />
                      </>
                    )}
                  </div>

                  {r.documents && r.documents.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-zinc-400 mb-2">Documentos adjuntos:</p>
                      <div className="flex flex-wrap gap-2">
                        {r.documents.filter(Boolean).map((d, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                            <span>📎</span>
                            <span className="text-zinc-300">{d}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-zinc-600 mt-1.5">
                        Los nombres de fichero se guardaron al enviar el formulario. En producción estarían enlazados a Firebase Storage.
                      </p>
                    </div>
                  )}

                  {r.rejectionReason && (
                    <div className="mb-4 px-3 py-2 rounded-xl bg-red-900/20 border border-red-800/30">
                      <p className="text-xs font-medium text-red-400 mb-0.5">Motivo de rechazo:</p>
                      <p className="text-xs text-zinc-300">{r.rejectionReason}</p>
                    </div>
                  )}

                  {(r.status === 'pending' || r.status === 'under_review') && (
                    <div className="flex flex-col gap-2">
                      {r.status === 'pending' && (
                        <button onClick={() => markUnderReview(r.id)}
                          className="py-2 rounded-xl text-xs font-semibold text-blue-400 border border-blue-800/40 bg-blue-900/20 hover:bg-blue-900/40 transition">
                          🔍 Marcar como en revisión
                        </button>
                      )}

                      {rejectTarget === r.id ? (
                        <div className="flex flex-col gap-2">
                          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                            placeholder="Motivo del rechazo (se mostrará al usuario)..."
                            rows={2} className="w-full text-xs px-3 py-2 rounded-xl resize-none outline-none"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                          <div className="flex gap-2">
                            <button onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                              className="flex-1 py-2 rounded-xl text-xs font-semibold border border-zinc-700 text-zinc-400 hover:text-white transition">
                              Cancelar
                            </button>
                            <button onClick={() => reject(r)} disabled={!rejectReason.trim() || working === r.id}
                              className="flex-1 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-40 transition"
                              style={{ background: '#ef4444' }}>
                              {working === r.id ? 'Rechazando...' : 'Confirmar rechazo'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => { setRejectTarget(r.id); setRejectReason(''); }}
                            disabled={working === r.id}
                            className="flex-1 py-2 rounded-xl text-xs font-semibold transition border border-red-800/40 text-red-400 hover:bg-red-900/20 disabled:opacity-40">
                            ✕ Rechazar
                          </button>
                          <button onClick={() => approve(r)} disabled={working === r.id}
                            className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-40"
                            style={{ background: '#22c55e' }}>
                            {working === r.id ? 'Aprobando...' : '✓ Aprobar y verificar'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DataField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
      <p className="text-sm text-white">{value || <span className="text-zinc-600 italic">—</span>}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DONACIONES
// ─────────────────────────────────────────────────────────────────────────────
function DonationsTab({ adminUid }: { adminUid: string }) {
  const [posts,   setPosts]   = useState<PendingDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<'pending'|'approved'|'rejected'>('pending');
  const [working, setWorking] = useState<string | null>(null);
  const [links,   setLinks]   = useState<Record<string, string>>({});
  const [toast,   setToast]   = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, 'posts'),
        where('needsDonations', '==', true),
        where('donationApprovalStatus', '==', filter),
        orderBy('createdAt', 'desc'),
        limit(40)
      ));
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() } as PendingDonation));
      const enriched = await Promise.all(raw.map(async p => {
        try {
          const vpSnap = await getDoc(doc(db, 'verifiedProfiles', p.authorId));
          if (vpSnap.exists()) p.authorName = vpSnap.data().entityName;
          else {
            const uSnap = await getDoc(doc(db, 'users', p.authorId));
            if (uSnap.exists()) p.authorName = uSnap.data().displayName;
          }
        } catch {}
        return p;
      }));
      setPosts(enriched);
      const initial: Record<string, string> = {};
      enriched.forEach(p => { if (p.stripePaymentLinkUrl) initial[p.id] = p.stripePaymentLinkUrl; });
      setLinks(prev => ({ ...initial, ...prev }));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (postId: string) => {
    const url = links[postId]?.trim();
    if (!url) { showToast('Introduce una URL de Stripe válida.'); return; }
    if (!url.startsWith('https://')) { showToast('La URL debe comenzar con https://'); return; }
    setWorking(postId);
    try {
      await updateDoc(doc(db, 'posts', postId), {
        donationApprovalStatus: 'approved',
        stripePaymentLinkUrl: url,
        approvedBy: adminUid,
        approvedAt: serverTimestamp(),
      });
      showToast('✓ Enlace de donación aprobado y activado.');
      load();
    } catch (e) { console.error(e); }
    finally { setWorking(null); }
  };

  const reject = async (postId: string) => {
    setWorking(postId);
    try {
      await updateDoc(doc(db, 'posts', postId), {
        donationApprovalStatus: 'rejected',
        rejectedBy: adminUid,
        rejectedAt: serverTimestamp(),
      });
      showToast('Enlace de donación rechazado.');
      load();
    } catch (e) { console.error(e); }
    finally { setWorking(null); }
  };

  const revoke = async (postId: string) => {
    setWorking(postId);
    try {
      await updateDoc(doc(db, 'posts', postId), {
        donationApprovalStatus: 'pending',
        stripePaymentLinkUrl: '',
      });
      showToast('Donación revocada y puesta en pendiente.');
      load();
    } catch (e) { console.error(e); }
    finally { setWorking(null); }
  };

  return (
    <div>
      <SectionHeader title="Aprobación de donaciones"
        subtitle="Valida y activa los enlaces de Stripe para los posts que solicitan donaciones" />

      <div className="flex gap-2 mb-5">
        {(['pending','approved','rejected'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition border ${
              filter === s
                ? 'bg-white text-black border-white'
                : 'text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-white'
            }`}>
            { s === 'pending' ? '⏳ Pendientes' : s === 'approved' ? '✓ Aprobados' : '✕ Rechazados' }
          </button>
        ))}
      </div>

      <div className="mb-5 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/30">
        <p className="text-xs text-zinc-500 leading-relaxed">
          <span className="text-zinc-300 font-medium">¿Cómo funciona?</span> Cuando una organización verificada crea un post con donaciones, el botón Donar permanece desactivado hasta que un admin introduce y aprueba el enlace de pago de Stripe. Crea los enlaces en <a href="https://dashboard.stripe.com/payment-links" target="_blank" className="text-blue-400 hover:underline">dashboard.stripe.com/payment-links</a>.
        </p>
      </div>

      {toast && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-green-900/20 border border-green-800/40 text-sm text-green-400">
          {toast}
        </div>
      )}

      {loading ? <Spinner /> : posts.length === 0 ? (
        <EmptyState icon="💚" text={`No hay solicitudes de donación ${filter === 'pending' ? 'pendientes' : filter === 'approved' ? 'aprobadas' : 'rechazadas'}.`} />
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map(p => (
            <div key={p.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <a href={`/posts/${p.id}`} target="_blank"
                      className="text-sm font-semibold text-white hover:text-zinc-300 transition truncate">
                      {p.title}
                    </a>
                    <Badge
                      label={p.donationApprovalStatus === 'approved' ? '✓ Activo' : p.donationApprovalStatus === 'rejected' ? '✕ Rechazado' : '⏳ Pendiente'}
                      color={p.donationApprovalStatus === 'approved' ? 'green' : p.donationApprovalStatus === 'rejected' ? 'red' : 'yellow'}
                    />
                  </div>
                  <p className="text-xs text-zinc-500">
                    {p.authorName || 'Organización'} · #{p.disasterId} · {timeAgo(p.createdAt)}
                  </p>
                </div>
              </div>

              {filter === 'pending' && (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={links[p.id] || ''}
                    onChange={e => setLinks(prev => ({ ...prev, [p.id]: e.target.value }))}
                    placeholder="https://buy.stripe.com/..."
                    className="flex-1 text-xs px-3 py-2 rounded-xl outline-none"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                  <button onClick={() => reject(p.id)} disabled={working === p.id}
                    className="px-3 py-2 rounded-xl text-xs font-semibold border border-red-800/40 text-red-400 hover:bg-red-900/20 transition disabled:opacity-40">
                    Rechazar
                  </button>
                  <button onClick={() => approve(p.id)} disabled={working === p.id || !links[p.id]?.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 transition disabled:opacity-40"
                    style={{ background: '#22c55e' }}>
                    {working === p.id ? '...' : 'Aprobar'}
                  </button>
                </div>
              )}

              {filter === 'approved' && p.stripePaymentLinkUrl && (
                <div className="flex items-center gap-2">
                  <a href={p.stripePaymentLinkUrl} target="_blank"
                    className="flex-1 text-xs text-blue-400 hover:text-blue-300 transition truncate">
                    🔗 {p.stripePaymentLinkUrl}
                  </a>
                  <button onClick={() => revoke(p.id)} disabled={working === p.id}
                    className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-800/40 transition disabled:opacity-40">
                    Revocar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. USUARIOS
// ─────────────────────────────────────────────────────────────────────────────
function UsersTab({ adminUid }: { adminUid: string }) {
  const [users,   setUsers]   = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState<'all'|'verified'|'pending'|'banned'>('all');
  const [working, setWorking] = useState<string | null>(null);
  const [toast,   setToast]   = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q: any;
      if (filter === 'verified') {
        q = query(collection(db, 'users'), where('isVerified', '==', true), limit(100));
      } else if (filter === 'pending') {
        q = query(collection(db, 'users'), where('verificationStatus', '==', 'pending'), limit(100));
      } else if (filter === 'banned') {
        q = query(collection(db, 'users'), where('isActive', '==', false), limit(100));
      } else {
        q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(100));
      }
      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserRow)));
      setCurrentPage(1);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const setRole = async (uid: string, role: string) => {
    setWorking(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { role });
      showToast(`Rol actualizado a "${role}".`);
      load();
    } catch (e) { console.error(e); }
    finally { setWorking(null); }
  };

  const toggleBan = async (uid: string, currentlyActive: boolean) => {
    setWorking(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { isActive: !currentlyActive });
      showToast(currentlyActive ? 'Usuario suspendido.' : 'Usuario reactivado.');
      load();
    } catch (e) { console.error(e); }
    finally { setWorking(null); }
  };

  const revokeVerification = async (uid: string) => {
    setWorking(uid);
    try {
      await updateDoc(doc(db, 'users', uid), {
        isVerified: false, verificationStatus: 'none',
      });
      try { await deleteDoc(doc(db, 'verifiedProfiles', uid)); } catch {}
      showToast('Verificación revocada.');
      load();
    } catch (e) { console.error(e); }
    finally { setWorking(null); }
  };

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.displayName || '').toLowerCase().includes(q)
      || (u.email || '').toLowerCase().includes(q)
      || (u.username || '').toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedUsers = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const ROLE_COLORS: Record<string, string> = {
    admin: 'red', moderator: 'purple', user: 'zinc',
  };

  return (
    <div>
      <SectionHeader title="Gestión de usuarios" subtitle="Busca, cambia roles y gestiona el acceso de los usuarios" />

      <div className="flex flex-col gap-3 mb-5">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o usuario..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </div>
        <div className="flex gap-2">
          {(['all','verified','pending','banned'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                filter === f ? 'bg-white text-black border-white' : 'text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-white'
              }`}>
              { f === 'all' ? 'Todos' : f === 'verified' ? '✓ Verificados' : f === 'pending' ? '⏳ Pendientes' : '🚫 Suspendidos' }
            </button>
          ))}
        </div>
      </div>

      {toast && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-green-900/20 border border-green-800/40 text-sm text-green-400">
          {toast}
        </div>
      )}

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState icon="👤" text="No se encontraron usuarios." />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {paginatedUsers.map(u => (
              <div key={u.uid} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {(u.displayName || '?').charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a href={`/profile/${u.uid}`} target="_blank"
                        className="text-sm font-semibold text-white hover:underline">
                        {u.displayName || 'Sin nombre'}
                      </a>
                      <Badge label={u.role || 'user'} color={ROLE_COLORS[u.role] || 'zinc'} />
                      {u.isVerified && <Badge label="Verificado" color="blue" />}
                      {!u.isActive && <Badge label="Suspendido" color="red" />}
                      {u.verificationStatus === 'pending' && <Badge label="Verif. pendiente" color="yellow" />}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">@{u.username || '—'} · {u.email}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {u.uid !== adminUid && (
                      <>
                        <select
                          value={u.role || 'user'}
                          onChange={e => setRole(u.uid, e.target.value)}
                          disabled={working === u.uid}
                          className="text-xs px-2 py-1.5 rounded-lg outline-none disabled:opacity-40"
                          style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }}
                        >
                          <option value="user">user</option>
                          <option value="moderator">moderator</option>
                          <option value="admin">admin</option>
                        </select>

                        {u.isVerified && (
                          <button onClick={() => revokeVerification(u.uid)} disabled={working === u.uid}
                            className="text-xs px-2 py-1.5 rounded-lg border border-zinc-700 text-zinc-500 hover:text-orange-400 hover:border-orange-800/40 transition disabled:opacity-40"
                            title="Revocar verificación">
                            ✕ Verif.
                          </button>
                        )}

                        <button
                          onClick={() => toggleBan(u.uid, u.isActive !== false)}
                          disabled={working === u.uid}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition font-semibold disabled:opacity-40 ${
                            u.isActive === false
                              ? 'border-green-800/40 text-green-400 hover:bg-green-900/20'
                              : 'border-red-800/40 text-red-400 hover:bg-red-900/20'
                          }`}
                        >
                          {u.isActive === false ? 'Reactivar' : 'Suspender'}
                        </button>
                      </>
                    )}
                    {u.uid === adminUid && (
                      <span className="text-xs text-zinc-600 italic">Tú</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-6">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <span className="text-xs text-zinc-500">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
type Section = 'dashboard' | 'reports' | 'verifications' | 'donations' | 'users';

export default function AdminPanel() {
  const [adminUser,   setAdminUser]   = useState<AdminUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [section,     setSection]     = useState<Section>('dashboard');
  const [stats,       setStats]       = useState<Stats>({
    pendingVerifs: 0, pendingDonations: 0, openReports: 0,
    totalUsers: 0, totalPosts: 0, totalDisasters: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async user => {
      if (!user) { window.location.href = '/auth/login'; return; }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists()) { window.location.href = '/'; return; }
        const role = snap.data().role;
        if (role !== 'admin' && role !== 'moderator') {
          window.location.href = '/';
          return;
        }
        setAdminUser({ uid: user.uid, role });
      } catch (e) {
        console.error(e);
        window.location.href = '/';
      } finally {
        setAuthLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!adminUser) return;
    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const [verifs, donations, reports, users, posts, disasters] = await Promise.all([
          getDocs(query(collection(db, 'verificationRequests'), where('status', 'in', ['pending','under_review']), limit(100))),
          getDocs(query(collection(db, 'posts'), where('needsDonations','==',true), where('donationApprovalStatus','==','pending'), limit(100))),
          getDocs(query(collection(db, 'reports'), where('status','==','pending'), limit(100))),
          getDocs(query(collection(db, 'users'), limit(200))),
          getDocs(query(collection(db, 'posts'), where('isActive','==',true), limit(200))),
          getDocs(query(collection(db, 'disasters'), where('status','==','active'), limit(100))),
        ]);
        setStats({
          pendingVerifs:    verifs.size,
          pendingDonations: donations.size,
          openReports:      reports.size,
          totalUsers:       users.size,
          totalPosts:       posts.size,
          totalDisasters:   disasters.size,
        });
      } catch (e) { console.error(e); }
      finally { setStatsLoading(false); }
    };
    loadStats();
  }, [adminUser]);

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-zinc-300 animate-spin" />
    </div>
  );

  if (!adminUser) return null;

  const NAV: { key: Section; label: string; icon: string; badge?: number }[] = [
    { key: 'dashboard',     label: 'Dashboard',    icon: '📊' },
    { key: 'reports',       label: 'Reportes',     icon: '🚩', badge: stats.openReports },
    { key: 'verifications', label: 'Verificaciones',icon: '🔍', badge: stats.pendingVerifs },
    { key: 'donations',     label: 'Donaciones',   icon: '💚', badge: stats.pendingDonations },
    { key: 'users',         label: 'Usuarios',     icon: '👤' },
  ];

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">

      <aside className="w-52 flex-shrink-0 border-r py-4 px-2"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <div className="px-3 mb-4">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Panel Admin</p>
          <p className="text-xs text-zinc-600 mt-0.5">
            {adminUser.role === 'admin' ? '🛡 Administrador' : '🔧 Moderador'}
          </p>
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map(item => (
            <button key={item.key} onClick={() => setSection(item.key)}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition text-left ${
                section === item.key
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}>
              <span className="text-base leading-none">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-900/60 text-red-300 font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-4 px-3">
          <div className="h-px mb-4" style={{ background: 'var(--border)' }} />
          <a href="/" className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Volver al inicio
          </a>
        </div>
      </aside>

      <main className="flex-1 px-8 py-6 overflow-y-auto" style={{ minWidth: 0 }}>
        {section === 'dashboard' && (
          <DashboardTab stats={stats} loading={statsLoading} />
        )}
        {section === 'reports' && (
          <ReportsTab adminUid={adminUser.uid} />
        )}
        {section === 'verifications' && (
          <VerificationsTab adminUid={adminUser.uid} />
        )}
        {section === 'donations' && (
          <DonationsTab adminUid={adminUser.uid} />
        )}
        {section === 'users' && (
          <UsersTab adminUid={adminUser.uid} />
        )}
      </main>
    </div>
  );
}