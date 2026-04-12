import { useState, useEffect } from 'react';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface Donation {
  donationId: string; donorId: string; postId?: string; disasterId?: string;
  amountEUR: number; verificationStatus: string; createdAt: any;
  postTitle?: string; disasterTitle?: string;
}

function fmtEUR(n: number) {
  return (n||0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' €';
}
function timeAgo(ts: any) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' });
}

const STATUS_COLOR: Record<string,string> = {
  pending:  'text-yellow-400 bg-yellow-900/20 border-yellow-800/40',
  verified: 'text-green-400 bg-green-900/20 border-green-800/40',
  rejected: 'text-red-400 bg-red-900/20 border-red-800/40',
};
const STATUS_LABEL: Record<string,string> = {
  pending:'Pendiente', verified:'Verificada', rejected:'Rechazada',
};

export default function DonationsPage() {
  const [donations, setDonations]     = useState<Donation[]>([]);
  const [loading, setLoading]         = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [total, setTotal]             = useState(0);

  useEffect(() => {
    return onAuthStateChanged(auth, u => { setCurrentUser(u); setAuthResolved(true); });
  }, []);

  useEffect(() => { if (authResolved) load(); }, [authResolved, currentUser]);

  const load = async () => {
    setLoading(true);
    try {
      if (!currentUser) { setLoading(false); return; }
      const snap = await getDocs(query(
        collection(db, 'donations'),
        where('donorId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      ));
      const raw = snap.docs.map(d => ({ donationId: d.id, ...d.data() } as Donation));
      const enriched = await Promise.all(raw.map(async don => {
        try {
          if (don.postId) {
            const p = await getDoc(doc(db, 'posts', don.postId));
            if (p.exists()) don.postTitle = p.data().title;
          }
          if (don.disasterId) {
            const dis = await getDoc(doc(db, 'disasters', don.disasterId));
            if (dis.exists()) don.disasterTitle = dis.data().title;
          }
        } catch {}
        return don;
      }));
      setDonations(enriched);
      setTotal(enriched.filter(d => d.verificationStatus === 'verified').reduce((s, d) => s + (d.amountEUR || 0), 0));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (!authResolved || loading) return (
    <div className="max-w-2xl mx-auto pt-2 flex flex-col gap-3">
      {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-zinc-900 animate-pulse"/>)}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-5 pt-2">
        <h1 className="text-xl font-bold text-white">Donaciones</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Historial de tus donaciones en GloVol</p>
      </div>

      {!currentUser ? (
        <div className="text-center py-20 bg-zinc-900 rounded-2xl border border-zinc-800">
          <p className="text-4xl mb-3">💚</p>
          <p className="text-zinc-400 text-sm mb-4">Inicia sesión para ver tu historial de donaciones.</p>
          <a href="/auth/login"
            className="inline-block px-5 py-2 rounded-full bg-white text-black text-sm font-semibold hover:opacity-90 transition">
            Iniciar sesión
          </a>
        </div>
      ) : (
        <>
          {donations.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-green-400">{fmtEUR(total)}</p>
                <p className="text-xs text-zinc-500 mt-1">Total donado (verificado)</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{donations.length}</p>
                <p className="text-xs text-zinc-500 mt-1">Donaciones realizadas</p>
              </div>
            </div>
          )}

          {donations.length === 0 ? (
            <div className="text-center py-20 bg-zinc-900 rounded-2xl border border-zinc-800">
              <p className="text-4xl mb-3">💚</p>
              <p className="text-zinc-400 text-sm mb-4">Aún no has realizado ninguna donación.</p>
              <a href="/"
                className="inline-block px-5 py-2 rounded-full bg-white text-black text-sm font-semibold hover:opacity-90 transition">
                Ver catástrofes activas
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {donations.map(d => (
                <div key={d.donationId}
                  className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {d.postTitle || d.disasterTitle || 'Donación'}
                      </p>
                      {d.disasterTitle && d.postTitle && (
                        <p className="text-xs text-zinc-600 mt-0.5">{d.disasterTitle}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-green-400">{fmtEUR(d.amountEUR)}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${STATUS_COLOR[d.verificationStatus] || 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
                        {STATUS_LABEL[d.verificationStatus] || d.verificationStatus}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-600">{timeAgo(d.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
