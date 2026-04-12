import { useState, useEffect } from 'react';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { t } from '../../lib/i18n';
import { useLang } from '../../hooks/useLang';

interface VolunteerEntry {
  volunteerId: string; disasterId: string; postId: string;
  status: string; disasterTitle?: string;
}

const NAV_KEYS = [
  { href: '/',          labelKey: 'nav.home',        restricted: false,
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15.75a.75.75 0 01-.75-.75v-4.5h-6V21a.75.75 0 01-.75.75H3.75A.75.75 0 013 21V9.75z" /></svg> },
  { href: '/disasters', labelKey: 'nav.disasters',   restricted: false,
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg> },
  { href: '/volunteers', labelKey: 'nav.volunteers', restricted: false,
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg> },
  { href: '/donations', labelKey: 'nav.donations',   restricted: false,
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { href: '/war-crimes', labelKey: 'nav.warCrimes', restricted: true,
    icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg> },
] as const;

export default function LeftSidebar({ currentPath = '' }: { currentPath?: string }) {
  const [user, setUser] = useState<ReturnType<typeof auth.currentUser>>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [volunteerEntries, setVolunteerEntries] = useState<VolunteerEntry[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const lang = useLang();

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          if (snap.exists()) {
            const role = snap.data().role;
            setIsAdmin(role === 'admin' || role === 'moderator');
          }
        } catch {}
        // Cargar voluntariado del usuario
        try {
          const volSnap = await getDocs(query(
            collection(db, 'volunteers'),
            where('userId', '==', u.uid)
          ));
          const entries = await Promise.all(volSnap.docs.map(async d => {
            const v = { volunteerId: d.id, ...d.data() } as VolunteerEntry;
            try {
              const dis = await getDoc(doc(db, 'disasters', v.disasterId));
              if (dis.exists()) v.disasterTitle = dis.data().title;
            } catch {}
            return v;
          }));
          // Ordenar por registeredAt descendente en cliente
          entries.sort((a: any, b: any) => {
            const ta = a.registeredAt?.toMillis?.() ?? 0;
            const tb = b.registeredAt?.toMillis?.() ?? 0;
            return tb - ta;
          });
          setVolunteerEntries(entries);
        } catch (e) { console.error('[LeftSidebar] Error en query volunteers:', e); }
      } else {
        setIsAdmin(false);
        setVolunteerEntries([]);
      }
    });
  }, []);

  const path = currentPath || (typeof window !== 'undefined' ? window.location.pathname : '');

  return (
    <aside dir="ltr" className="fixed left-0 top-14 bottom-0 w-56 bg-black border-r border-zinc-800 flex flex-col py-3 z-40">
      <nav className="flex flex-col gap-0.5 px-2">
        {NAV_KEYS.map(item => {
          const isActive = path === item.href;
          if (item.restricted && !user) return null;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              } ${item.restricted ? 'text-red-400 hover:text-red-300' : ''}`}
            >
              {item.icon}
              <span>{t(item.labelKey as any, lang)}</span>
              {item.restricted && (
                <span className="ml-auto text-xs bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded">🔒</span>
              )}
            </a>
          );
        })}

        {/* Enlace al panel de administración (solo admins y moderadores) */}
        {isAdmin && (
          <>
            <div className="mx-2 my-1.5 h-px bg-zinc-800" />
            <a
              href="/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                path === '/admin' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span>Panel Admin</span>
              <span className="ml-auto text-xs bg-purple-900/40 text-purple-400 px-1.5 py-0.5 rounded">ADM</span>
            </a>
          </>
        )}
      </nav>

      <div className="mx-4 my-3 h-px bg-zinc-800" />

      <div className="px-4">
        <p className="text-xs text-zinc-600 uppercase tracking-wider font-medium mb-2">
          {t('sidebar.activeNow', lang)}
        </p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <span className="text-xs text-zinc-400 truncate">DANA Valencia</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse flex-shrink-0" />
            <span className="text-xs text-zinc-400 truncate">Conflicto Ucrania</span>
          </div>
        </div>
      </div>

      {/* ── Voluntariado del usuario ── */}
      {!authLoading && user && volunteerEntries.length > 0 && (
        <>
          <div className="mx-4 my-3 h-px bg-zinc-800" />
          <div className="px-4">
            <p className="text-xs text-zinc-600 uppercase tracking-wider font-medium mb-2">
              Mi voluntariado
            </p>
            <div className="flex flex-col gap-1.5">
              {volunteerEntries.slice(0, 3).map(v => (
                <a key={v.volunteerId} href={`/posts/${v.postId}`}
                  className="flex items-center gap-2 hover:opacity-80 transition">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    v.status === 'deployed' ? 'bg-green-500' :
                    v.status === 'registered' ? 'bg-blue-500' : 'bg-zinc-500'
                  }`} />
                  <span className="text-xs text-zinc-400 truncate">
                    {v.disasterTitle || v.disasterId}
                  </span>
                </a>
              ))}
              {volunteerEntries.length > 3 && (
                <a href="/volunteers" className="text-xs text-zinc-600 hover:text-zinc-400 transition mt-0.5">
                  +{volunteerEntries.length - 3} más →
                </a>
              )}
            </div>
          </div>
        </>
      )}

      <div className="mt-auto px-4 pb-2">
        <p className="text-xs text-zinc-700">GloVol © 2025</p>
        <p className="text-xs text-zinc-700">TFG — Alessandro Garavello</p>
      </div>
    </aside>
  );
}