import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { t } from '../../lib/i18n';
import { useLang } from '../../hooks/useLang';

interface Disaster {
  disasterId: string;
  title: string;
  severity: string;
  country: string;
  totalVolunteersRegistered: number;
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'text-red-400 bg-red-900/30',
  high:     'text-orange-400 bg-orange-900/30',
  medium:   'text-yellow-400 bg-yellow-900/30',
  low:      'text-green-400 bg-green-900/30',
};
const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-yellow-500',
  low:      'bg-green-500',
};

export default function RightSidebar() {
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [loading, setLoading] = useState(true);
  const lang = useLang();

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(
          collection(db, 'disasters'),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const snap = await getDocs(q);
        setDisasters(snap.docs.map(d => ({ disasterId: d.id, ...d.data() } as Disaster)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const HOW_IT_WORKS = [
    { icon: '🌍', key: 'sidebar.step1' },
    { icon: '❤️', key: 'sidebar.step2' },
    { icon: '🙋', key: 'sidebar.step3' },
    { icon: '✅', key: 'sidebar.step4' },
  ] as const;

  const FOOTER_LINKS = [
    'general.terms',
    'general.privacy',
    'general.cookies',
    'general.accessibility',
  ] as const;

  return (
    <aside dir="ltr" className="fixed right-0 top-14 bottom-0 w-72 bg-black border-l border-zinc-800 overflow-y-auto py-4 px-3 z-40">

      {/* Catástrofes activas */}
      <div className="mb-5">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1 mb-3">
          {t('sidebar.activeDisasters', lang)}
        </h2>
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-zinc-900 animate-pulse" />)}
          </div>
        ) : disasters.length === 0 ? (
          <p className="text-xs text-zinc-600 px-1">{t('feed.empty', lang)}</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {disasters.map(d => (
              <a key={d.disasterId} href={`/disasters/${d.disasterId}`}
                className="flex flex-col gap-1 px-3 py-2.5 rounded-xl hover:bg-zinc-900 transition group">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse ${SEVERITY_DOT[d.severity] || 'bg-zinc-500'}`} />
                    <span className="text-sm text-white font-medium truncate group-hover:text-zinc-100">{d.title}</span>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${SEVERITY_COLOR[d.severity] || 'text-zinc-400 bg-zinc-800'}`}>
                    {t(('severity.' + d.severity) as any, lang)}
                  </span>
                </div>
                <div className="flex items-center gap-3 pl-3">
                  <span className="text-xs text-zinc-500">{d.country}</span>
                  {d.totalVolunteersRegistered > 0 && (
                    <span className="text-xs text-zinc-600">
                      {d.totalVolunteersRegistered.toLocaleString()} {t('post.volunteers', lang)}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
        <a href="/disasters" className="block mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition px-1">
          {t('sidebar.seeAll', lang)}
        </a>
      </div>

      <div className="h-px bg-zinc-800 mb-5" />

      {/* Cómo funciona */}
      <div className="mb-5">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1 mb-3">
          {t('sidebar.howItWorks', lang)}
        </h2>
        <div className="flex flex-col gap-2 px-1">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.key} className="flex items-start gap-2">
              <span className="text-base leading-5 flex-shrink-0">{item.icon}</span>
              <span className="text-xs text-zinc-400 leading-5">{t(item.key, lang)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-zinc-800 mb-5" />

      {/* Footer */}
      <div className="px-1">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {FOOTER_LINKS.map(key => (
            <a key={key} href="#" className="text-xs text-zinc-700 hover:text-zinc-500 transition">
              {t(key, lang)}
            </a>
          ))}
        </div>
        <p className="text-xs text-zinc-800 mt-2">GloVol · TFG 2025</p>
      </div>
    </aside>
  );
}
