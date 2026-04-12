import { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import {
  collection, query, where, orderBy, limit,
  getDocs, doc, getDoc, startAfter, type QueryDocumentSnapshot,
} from 'firebase/firestore';
import PostCard from './PostCard';
import { t } from '../../lib/i18n';
import { useLang } from '../../hooks/useLang';
import { getBadgeType } from '../profile/ProfileBadge';

// ─────────────────────────────────────────────────────────────────────────────
// Países del mundo
// ─────────────────────────────────────────────────────────────────────────────
const ALL_COUNTRIES = [
  {code:'AF',name:'Afganistán'},{code:'AL',name:'Albania'},{code:'DE',name:'Alemania'},
  {code:'AD',name:'Andorra'},{code:'AO',name:'Angola'},{code:'SA',name:'Arabia Saudí'},
  {code:'DZ',name:'Argelia'},{code:'AR',name:'Argentina'},{code:'AM',name:'Armenia'},
  {code:'AU',name:'Australia'},{code:'AT',name:'Austria'},{code:'AZ',name:'Azerbaiyán'},
  {code:'BE',name:'Bélgica'},{code:'BZ',name:'Belice'},{code:'BY',name:'Bielorrusia'},
  {code:'MM',name:'Birmania'},{code:'BO',name:'Bolivia'},{code:'BA',name:'Bosnia'},
  {code:'BW',name:'Botsuana'},{code:'BR',name:'Brasil'},{code:'BG',name:'Bulgaria'},
  {code:'BF',name:'Burkina Faso'},{code:'BI',name:'Burundi'},{code:'CV',name:'Cabo Verde'},
  {code:'KH',name:'Camboya'},{code:'CM',name:'Camerún'},{code:'CA',name:'Canadá'},
  {code:'QA',name:'Catar'},{code:'TD',name:'Chad'},{code:'CL',name:'Chile'},
  {code:'CN',name:'China'},{code:'CY',name:'Chipre'},{code:'CO',name:'Colombia'},
  {code:'KR',name:'Corea del Sur'},{code:'CR',name:'Costa Rica'},{code:'HR',name:'Croacia'},
  {code:'CU',name:'Cuba'},{code:'DK',name:'Dinamarca'},{code:'EC',name:'Ecuador'},
  {code:'EG',name:'Egipto'},{code:'SV',name:'El Salvador'},{code:'AE',name:'Emiratos Árabes'},
  {code:'ER',name:'Eritrea'},{code:'SK',name:'Eslovaquia'},{code:'SI',name:'Eslovenia'},
  {code:'ES',name:'España'},{code:'US',name:'Estados Unidos'},{code:'EE',name:'Estonia'},
  {code:'ET',name:'Etiopía'},{code:'PH',name:'Filipinas'},{code:'FI',name:'Finlandia'},
  {code:'FR',name:'Francia'},{code:'GE',name:'Georgia'},{code:'GH',name:'Ghana'},
  {code:'GR',name:'Grecia'},{code:'GT',name:'Guatemala'},{code:'GN',name:'Guinea'},
  {code:'HT',name:'Haití'},{code:'HN',name:'Honduras'},{code:'HU',name:'Hungría'},
  {code:'IN',name:'India'},{code:'ID',name:'Indonesia'},{code:'IQ',name:'Irak'},
  {code:'IR',name:'Irán'},{code:'IE',name:'Irlanda'},{code:'IS',name:'Islandia'},
  {code:'IL',name:'Israel'},{code:'IT',name:'Italia'},{code:'JP',name:'Japón'},
  {code:'JO',name:'Jordania'},{code:'KZ',name:'Kazajistán'},{code:'KE',name:'Kenia'},
  {code:'KW',name:'Kuwait'},{code:'LB',name:'Líbano'},{code:'LY',name:'Libia'},
  {code:'LT',name:'Lituania'},{code:'LU',name:'Luxemburgo'},{code:'MK',name:'Macedonia del Norte'},
  {code:'MY',name:'Malasia'},{code:'MW',name:'Malaui'},{code:'ML',name:'Mali'},
  {code:'MA',name:'Marruecos'},{code:'MX',name:'México'},{code:'MD',name:'Moldavia'},
  {code:'MN',name:'Mongolia'},{code:'ME',name:'Montenegro'},{code:'MZ',name:'Mozambique'},
  {code:'NA',name:'Namibia'},{code:'NP',name:'Nepal'},{code:'NI',name:'Nicaragua'},
  {code:'NE',name:'Níger'},{code:'NG',name:'Nigeria'},{code:'NO',name:'Noruega'},
  {code:'NZ',name:'Nueva Zelanda'},{code:'NL',name:'Países Bajos'},{code:'PK',name:'Pakistán'},
  {code:'PA',name:'Panamá'},{code:'PY',name:'Paraguay'},{code:'PE',name:'Perú'},
  {code:'PL',name:'Polonia'},{code:'PT',name:'Portugal'},{code:'GB',name:'Reino Unido'},
  {code:'CF',name:'Rep. Centroafricana'},{code:'CZ',name:'Rep. Checa'},{code:'DO',name:'Rep. Dominicana'},
  {code:'RO',name:'Rumanía'},{code:'RW',name:'Ruanda'},{code:'RU',name:'Rusia'},
  {code:'SN',name:'Senegal'},{code:'RS',name:'Serbia'},{code:'SL',name:'Sierra Leona'},
  {code:'SG',name:'Singapur'},{code:'SY',name:'Siria'},{code:'SO',name:'Somalia'},
  {code:'LK',name:'Sri Lanka'},{code:'ZA',name:'Sudáfrica'},{code:'SD',name:'Sudán'},
  {code:'SS',name:'Sudán del Sur'},{code:'SE',name:'Suecia'},{code:'CH',name:'Suiza'},
  {code:'TH',name:'Tailandia'},{code:'TW',name:'Taiwán'},{code:'TZ',name:'Tanzania'},
  {code:'TN',name:'Túnez'},{code:'TR',name:'Turquía'},{code:'UA',name:'Ucrania'},
  {code:'UG',name:'Uganda'},{code:'UY',name:'Uruguay'},{code:'VE',name:'Venezuela'},
  {code:'VN',name:'Vietnam'},{code:'YE',name:'Yemen'},{code:'ZM',name:'Zambia'},
  {code:'ZW',name:'Zimbabue'},
];

type ViewMode    = 'cards' | 'compact';
type FilterFeatured = 'all' | 'pinned' | 'trending' | 'recent' | 'needs_volunteers' | 'needs_donations';
type FilterType  = 'all' | 'natural_disaster' | 'war' | 'armed_conflict' | 'epidemic' | 'humanitarian_crisis' | 'industrial_accident';
type FilterUrgency = 'all' | 'critical' | 'high' | 'medium' | 'low';

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
  authorName?: string; authorBadge?: any;
}

const PAGE_SIZE = 10;

function FilterDropdown({
  label, options, value, onChange, searchable = false,
}: {
  label: string;
  options: {value:string;label:string}[];
  value: string;
  onChange: (v:string) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find(o => o.value === value);
  const filtered = searchable && search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setSearch('');
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setOpen(!open); setSearch(''); }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-700 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white transition bg-zinc-900/50">
        <span className="max-w-[120px] truncate">{current?.label ?? label}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-30 overflow-hidden" style={{minWidth:'200px',maxWidth:'280px'}}>
          {searchable && (
            <div className="p-2 border-b border-zinc-800">
              <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600" />
            </div>
          )}
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0
              ? <p className="text-zinc-600 text-sm text-center py-3">Sin resultados</p>
              : filtered.map(opt => (
                <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); setSearch(''); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition truncate ${
                    value === opt.value ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}>
                  {opt.label}
                </button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

export default function DisasterFeed() {
  const lang = useLang();
  const [posts, setPosts]       = useState<Post[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc]   = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore]   = useState(true);
  const [queryError, setQueryError] = useState('');

  const [viewMode,       setViewMode]       = useState<ViewMode>('cards');
  const [filterFeatured, setFilterFeatured] = useState<FilterFeatured>('all');
  const [filterType,     setFilterType]     = useState<FilterType>('all');
  const [filterCountry,  setFilterCountry]  = useState('all');
  const [filterUrgency,  setFilterUrgency]  = useState<FilterUrgency>('all');

  useEffect(() => {
    setPosts([]); setLastDoc(null); setHasMore(true); setQueryError('');
    loadPosts(null, true, filterFeatured, filterType, filterCountry, filterUrgency);
  }, [filterFeatured, filterType, filterCountry, filterUrgency]);

  const enrichPost = async (p: any): Promise<Post> => {
    let authorName = 'Organización'; let authorBadge = null;
    try {
      const vpSnap = await getDoc(doc(db, 'verifiedProfiles', p.authorId));
      if (vpSnap.exists()) {
        const vp = vpSnap.data();
        authorName = vp.entityName || authorName;
        authorBadge = getBadgeType({ role:'verified', isVerified:true, verifiedProfileType:vp.type, volunteerEventsCount:0, totalDonatedEUR:0 });
      }
    } catch {}
    return { ...p, authorName, authorBadge };
  };

  const loadPosts = async (
    after: QueryDocumentSnapshot | null,
    reset = false,
    featuredF = filterFeatured,
    typeF = filterType,
    countryF = filterCountry,
    urgencyF = filterUrgency,
  ) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      // NOTA: La query base usa solo isWarCrimeReport + orderBy para evitar
      // índices compuestos complejos. Los demás filtros se aplican en cliente.
      const constraints: any[] = [
        where('isWarCrimeReport', '==', false),
      ];

      // Solo añadir filtros de Firestore que tengan índice disponible
      if (featuredF === 'pinned')           constraints.push(where('isPinned', '==', true));
      if (featuredF === 'needs_volunteers') constraints.push(where('needsVolunteers', '==', true));
      if (featuredF === 'needs_donations')  constraints.push(where('needsDonations', '==', true));
      if (urgencyF !== 'all')               constraints.push(where('urgencyLevel', '==', urgencyF));

      // Orden
      if (featuredF === 'trending') constraints.push(orderBy('likesCount', 'desc'));
      else constraints.push(orderBy('createdAt', 'desc'));

      // Para filtros de tipo y país necesitamos traer más para compensar el filtrado cliente
      const fetchLimit = (typeF !== 'all' || countryF !== 'all') ? PAGE_SIZE * 5 : PAGE_SIZE;
      constraints.push(limit(fetchLimit));
      if (after) constraints.push(startAfter(after));

      const snap = await getDocs(query(collection(db, 'posts'), ...constraints));

      // Filtros en cliente (isActive, tipo de desastre, país)
      let raw = snap.docs.map(d => ({ postId: d.id, ...d.data() } as any));
      raw = raw.filter((p: any) => p.isActive !== false);

      // Filtro por tipo de catástrofe (campo disasterType o type en el post/disaster)
      if (typeF !== 'all') {
        raw = raw.filter((p: any) =>
          p.disasterType === typeF || p.type === typeF
        );
      }

      // Filtro por país
      if (countryF !== 'all') {
        raw = raw.filter((p: any) =>
          p.country === countryF ||
          p.countryCode === countryF ||
          (p.locationName && p.locationName.includes(countryF))
        );
      }

      // Limitar al tamaño de página real tras filtrado
      const paginated = raw.slice(0, PAGE_SIZE);
      const enriched = await Promise.all(paginated.map(enrichPost));

      if (reset) setPosts(enriched); else setPosts(prev => [...prev, ...enriched]);
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === fetchLimit);
    } catch (e: any) {
      console.error('Error cargando posts:', e);
      if (e?.code === 'failed-precondition' || e?.message?.includes('index')) {
        setQueryError('Faltan índices en Firestore. Ejecuta: firebase deploy --only firestore:indexes');
      }
    } finally {
      setLoading(false); setLoadingMore(false);
    }
  };

  const featuredOptions = [
    {value:'all',              label: t('feed.featured', lang)},
    {value:'pinned',           label: t('feed.pinned', lang)},
    {value:'trending',         label: t('feed.trending', lang)},
    {value:'recent',           label: t('feed.recent', lang)},
    {value:'needs_volunteers', label: t('feed.needsVolunteers', lang)},
    {value:'needs_donations',  label: t('feed.needsDonations', lang)},
  ];
  const typeOptions = [
    {value:'all',                 label: t('feed.allTypes', lang)},
    {value:'natural_disaster',    label: t('feed.naturalDisaster', lang)},
    {value:'war',                 label: t('feed.war', lang)},
    {value:'epidemic',            label: t('feed.epidemic', lang)},
    {value:'humanitarian_crisis', label: t('feed.humanitarianCrisis', lang)},
    {value:'industrial_accident', label: t('feed.industrialAccident', lang)},
  ];
  const countryOptions = [
    {value:'all', label: t('feed.allCountries', lang)},
    ...ALL_COUNTRIES.map(c => ({value:c.code, label:c.name})),
  ];
  const urgencyOptions = [
    {value:'all',      label: t('feed.allUrgency', lang)},
    {value:'critical', label: t('feed.critical', lang)},
    {value:'high',     label: t('feed.high', lang)},
    {value:'medium',   label: t('feed.medium', lang)},
    {value:'low',      label: t('feed.low', lang)},
  ];
  const viewOptions = [
    {value:'cards',   label: t('feed.viewCards', lang)},
    {value:'compact', label: t('feed.viewCompact', lang)},
  ];

  return (
    <div className="max-w-2xl mx-auto px-0 py-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-5 px-1">
        <FilterDropdown label={t('feed.featured',lang)} options={featuredOptions} value={filterFeatured} onChange={v => setFilterFeatured(v as FilterFeatured)} />
        <FilterDropdown label={t('feed.disaster',lang)} options={typeOptions} value={filterType} onChange={v => setFilterType(v as FilterType)} />
        <FilterDropdown label={t('feed.country',lang)} options={countryOptions} value={filterCountry} onChange={setFilterCountry} searchable />
        <FilterDropdown label={t('feed.urgency',lang)} options={urgencyOptions} value={filterUrgency} onChange={v => setFilterUrgency(v as FilterUrgency)} />
        <FilterDropdown label={t('feed.view',lang)} options={viewOptions} value={viewMode} onChange={v => setViewMode(v as ViewMode)} />
      </div>

      {queryError && (
        <div className="mx-1 mb-4 px-4 py-3 bg-yellow-900/20 border border-yellow-700/30 rounded-xl text-xs text-yellow-400">
          ⚠ {queryError}
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="border border-zinc-800 rounded-2xl p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-zinc-800" />
                <div className="flex-1"><div className="h-3 bg-zinc-800 rounded w-32 mb-1.5" /><div className="h-2.5 bg-zinc-800 rounded w-20" /></div>
              </div>
              <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2" />
              <div className="h-3 bg-zinc-800 rounded w-full mb-1" />
              <div className="h-3 bg-zinc-800 rounded w-2/3 mb-3" />
              <div className="h-36 bg-zinc-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-4xl mb-4">🌍</div>
          <h3 className="text-white font-semibold mb-2">{t('feed.empty', lang)}</h3>
          <p className="text-zinc-500 text-sm max-w-xs">{t('feed.emptyDesc', lang)}</p>
        </div>
      ) : (
        <div className={`flex flex-col ${viewMode === 'compact' ? 'gap-2' : 'gap-4'}`}>
          {posts.map(post => (
            <PostCard key={post.postId} post={post} compact={viewMode === 'compact'} lang={lang} />
          ))}
        </div>
      )}

      {!loading && hasMore && posts.length > 0 && (
        <div className="flex justify-center mt-6">
          <button onClick={() => loadPosts(lastDoc, false, filterFeatured, filterType, filterCountry, filterUrgency)} disabled={loadingMore}
            className="px-6 py-2.5 rounded-full border border-zinc-700 text-sm text-zinc-400 hover:border-zinc-500 hover:text-white transition disabled:opacity-50">
            {loadingMore ? t('feed.loading', lang) : t('feed.showMore', lang)}
          </button>
        </div>
      )}
      {!loading && !hasMore && posts.length > 0 && (
        <p className="text-center text-xs text-zinc-700 mt-6">{t('feed.end', lang)}</p>
      )}
    </div>
  );
}
