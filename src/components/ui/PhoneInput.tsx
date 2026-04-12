import { useState, useRef, useEffect } from 'react';

const COUNTRIES = [
  { code: 'AF', name: 'Afganistán', prefix: '+93', flag: '🇦🇫' },
  { code: 'AL', name: 'Albania', prefix: '+355', flag: '🇦🇱' },
  { code: 'DE', name: 'Alemania', prefix: '+49', flag: '🇩🇪' },
  { code: 'AD', name: 'Andorra', prefix: '+376', flag: '🇦🇩' },
  { code: 'AO', name: 'Angola', prefix: '+244', flag: '🇦🇴' },
  { code: 'SA', name: 'Arabia Saudí', prefix: '+966', flag: '🇸🇦' },
  { code: 'DZ', name: 'Argelia', prefix: '+213', flag: '🇩🇿' },
  { code: 'AR', name: 'Argentina', prefix: '+54', flag: '🇦🇷' },
  { code: 'AM', name: 'Armenia', prefix: '+374', flag: '🇦🇲' },
  { code: 'AU', name: 'Australia', prefix: '+61', flag: '🇦🇺' },
  { code: 'AT', name: 'Austria', prefix: '+43', flag: '🇦🇹' },
  { code: 'AZ', name: 'Azerbaiyán', prefix: '+994', flag: '🇦🇿' },
  { code: 'BE', name: 'Bélgica', prefix: '+32', flag: '🇧🇪' },
  { code: 'BO', name: 'Bolivia', prefix: '+591', flag: '🇧🇴' },
  { code: 'BA', name: 'Bosnia', prefix: '+387', flag: '🇧🇦' },
  { code: 'BR', name: 'Brasil', prefix: '+55', flag: '🇧🇷' },
  { code: 'BG', name: 'Bulgaria', prefix: '+359', flag: '🇧🇬' },
  { code: 'CA', name: 'Canadá', prefix: '+1', flag: '🇨🇦' },
  { code: 'CL', name: 'Chile', prefix: '+56', flag: '🇨🇱' },
  { code: 'CN', name: 'China', prefix: '+86', flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia', prefix: '+57', flag: '🇨🇴' },
  { code: 'KR', name: 'Corea del Sur', prefix: '+82', flag: '🇰🇷' },
  { code: 'CR', name: 'Costa Rica', prefix: '+506', flag: '🇨🇷' },
  { code: 'HR', name: 'Croacia', prefix: '+385', flag: '🇭🇷' },
  { code: 'CU', name: 'Cuba', prefix: '+53', flag: '🇨🇺' },
  { code: 'DK', name: 'Dinamarca', prefix: '+45', flag: '🇩🇰' },
  { code: 'EC', name: 'Ecuador', prefix: '+593', flag: '🇪🇨' },
  { code: 'EG', name: 'Egipto', prefix: '+20', flag: '🇪🇬' },
  { code: 'SV', name: 'El Salvador', prefix: '+503', flag: '🇸🇻' },
  { code: 'AE', name: 'Emiratos Árabes', prefix: '+971', flag: '🇦🇪' },
  { code: 'SK', name: 'Eslovaquia', prefix: '+421', flag: '🇸🇰' },
  { code: 'SI', name: 'Eslovenia', prefix: '+386', flag: '🇸🇮' },
  { code: 'ES', name: 'España', prefix: '+34', flag: '🇪🇸' },
  { code: 'US', name: 'Estados Unidos', prefix: '+1', flag: '🇺🇸' },
  { code: 'EE', name: 'Estonia', prefix: '+372', flag: '🇪🇪' },
  { code: 'ET', name: 'Etiopía', prefix: '+251', flag: '🇪🇹' },
  { code: 'PH', name: 'Filipinas', prefix: '+63', flag: '🇵🇭' },
  { code: 'FI', name: 'Finlandia', prefix: '+358', flag: '🇫🇮' },
  { code: 'FR', name: 'Francia', prefix: '+33', flag: '🇫🇷' },
  { code: 'GE', name: 'Georgia', prefix: '+995', flag: '🇬🇪' },
  { code: 'GH', name: 'Ghana', prefix: '+233', flag: '🇬🇭' },
  { code: 'GR', name: 'Grecia', prefix: '+30', flag: '🇬🇷' },
  { code: 'GT', name: 'Guatemala', prefix: '+502', flag: '🇬🇹' },
  { code: 'HN', name: 'Honduras', prefix: '+504', flag: '🇭🇳' },
  { code: 'HU', name: 'Hungría', prefix: '+36', flag: '🇭🇺' },
  { code: 'IN', name: 'India', prefix: '+91', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', prefix: '+62', flag: '🇮🇩' },
  { code: 'IQ', name: 'Irak', prefix: '+964', flag: '🇮🇶' },
  { code: 'IR', name: 'Irán', prefix: '+98', flag: '🇮🇷' },
  { code: 'IE', name: 'Irlanda', prefix: '+353', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel', prefix: '+972', flag: '🇮🇱' },
  { code: 'IT', name: 'Italia', prefix: '+39', flag: '🇮🇹' },
  { code: 'JP', name: 'Japón', prefix: '+81', flag: '🇯🇵' },
  { code: 'JO', name: 'Jordania', prefix: '+962', flag: '🇯🇴' },
  { code: 'KZ', name: 'Kazajistán', prefix: '+7', flag: '🇰🇿' },
  { code: 'KE', name: 'Kenia', prefix: '+254', flag: '🇰🇪' },
  { code: 'KW', name: 'Kuwait', prefix: '+965', flag: '🇰🇼' },
  { code: 'LV', name: 'Letonia', prefix: '+371', flag: '🇱🇻' },
  { code: 'LB', name: 'Líbano', prefix: '+961', flag: '🇱🇧' },
  { code: 'LY', name: 'Libia', prefix: '+218', flag: '🇱🇾' },
  { code: 'LT', name: 'Lituania', prefix: '+370', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxemburgo', prefix: '+352', flag: '🇱🇺' },
  { code: 'MK', name: 'Macedonia del Norte', prefix: '+389', flag: '🇲🇰' },
  { code: 'MY', name: 'Malasia', prefix: '+60', flag: '🇲🇾' },
  { code: 'MA', name: 'Marruecos', prefix: '+212', flag: '🇲🇦' },
  { code: 'MX', name: 'México', prefix: '+52', flag: '🇲🇽' },
  { code: 'MD', name: 'Moldavia', prefix: '+373', flag: '🇲🇩' },
  { code: 'MN', name: 'Mongolia', prefix: '+976', flag: '🇲🇳' },
  { code: 'ME', name: 'Montenegro', prefix: '+382', flag: '🇲🇪' },
  { code: 'MZ', name: 'Mozambique', prefix: '+258', flag: '🇲🇿' },
  { code: 'NA', name: 'Namibia', prefix: '+264', flag: '🇳🇦' },
  { code: 'NP', name: 'Nepal', prefix: '+977', flag: '🇳🇵' },
  { code: 'NI', name: 'Nicaragua', prefix: '+505', flag: '🇳🇮' },
  { code: 'NG', name: 'Nigeria', prefix: '+234', flag: '🇳🇬' },
  { code: 'NO', name: 'Noruega', prefix: '+47', flag: '🇳🇴' },
  { code: 'NZ', name: 'Nueva Zelanda', prefix: '+64', flag: '🇳🇿' },
  { code: 'NL', name: 'Países Bajos', prefix: '+31', flag: '🇳🇱' },
  { code: 'PK', name: 'Pakistán', prefix: '+92', flag: '🇵🇰' },
  { code: 'PA', name: 'Panamá', prefix: '+507', flag: '🇵🇦' },
  { code: 'PY', name: 'Paraguay', prefix: '+595', flag: '🇵🇾' },
  { code: 'PE', name: 'Perú', prefix: '+51', flag: '🇵🇪' },
  { code: 'PL', name: 'Polonia', prefix: '+48', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', prefix: '+351', flag: '🇵🇹' },
  { code: 'QA', name: 'Qatar', prefix: '+974', flag: '🇶🇦' },
  { code: 'GB', name: 'Reino Unido', prefix: '+44', flag: '🇬🇧' },
  { code: 'CZ', name: 'República Checa', prefix: '+420', flag: '🇨🇿' },
  { code: 'DO', name: 'República Dominicana', prefix: '+1', flag: '🇩🇴' },
  { code: 'RO', name: 'Rumanía', prefix: '+40', flag: '🇷🇴' },
  { code: 'RU', name: 'Rusia', prefix: '+7', flag: '🇷🇺' },
  { code: 'RS', name: 'Serbia', prefix: '+381', flag: '🇷🇸' },
  { code: 'SG', name: 'Singapur', prefix: '+65', flag: '🇸🇬' },
  { code: 'SY', name: 'Siria', prefix: '+963', flag: '🇸🇾' },
  { code: 'SO', name: 'Somalia', prefix: '+252', flag: '🇸🇴' },
  { code: 'LK', name: 'Sri Lanka', prefix: '+94', flag: '🇱🇰' },
  { code: 'ZA', name: 'Sudáfrica', prefix: '+27', flag: '🇿🇦' },
  { code: 'SD', name: 'Sudán', prefix: '+249', flag: '🇸🇩' },
  { code: 'SE', name: 'Suecia', prefix: '+46', flag: '🇸🇪' },
  { code: 'CH', name: 'Suiza', prefix: '+41', flag: '🇨🇭' },
  { code: 'TH', name: 'Tailandia', prefix: '+66', flag: '🇹🇭' },
  { code: 'TW', name: 'Taiwán', prefix: '+886', flag: '🇹🇼' },
  { code: 'TZ', name: 'Tanzania', prefix: '+255', flag: '🇹🇿' },
  { code: 'TN', name: 'Túnez', prefix: '+216', flag: '🇹🇳' },
  { code: 'TR', name: 'Turquía', prefix: '+90', flag: '🇹🇷' },
  { code: 'UA', name: 'Ucrania', prefix: '+380', flag: '🇺🇦' },
  { code: 'UG', name: 'Uganda', prefix: '+256', flag: '🇺🇬' },
  { code: 'UY', name: 'Uruguay', prefix: '+598', flag: '🇺🇾' },
  { code: 'UZ', name: 'Uzbekistán', prefix: '+998', flag: '🇺🇿' },
  { code: 'VE', name: 'Venezuela', prefix: '+58', flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnam', prefix: '+84', flag: '🇻🇳' },
  { code: 'YE', name: 'Yemen', prefix: '+967', flag: '🇾🇪' },
  { code: 'ZM', name: 'Zambia', prefix: '+260', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabue', prefix: '+263', flag: '🇿🇼' },
];

interface Props {
  onChange: (phone: string, country: string) => void;
}

export default function PhoneInput({ onChange }: Props) {
  const [selected, setSelected] = useState(COUNTRIES.find(c => c.code === 'ES')!);
  const [number, setNumber] = useState('');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.prefix.includes(search)
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (country: typeof COUNTRIES[0]) => {
    setSelected(country);
    setOpen(false);
    setSearch('');
    onChange(`${country.prefix}${number}`, country.code);
  };

  const handleNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setNumber(val);
    onChange(`${selected.prefix}${val}`, selected.code);
  };

  return (
    <div className="flex items-stretch gap-2 relative" ref={ref}>
      {/* Selector de país */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-500 transition min-w-[64px] justify-center"
      >
        <span className="text-lg leading-none">{selected.flag}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Buscador */}
          <div className="p-2 border-b border-zinc-700">
            <input
              type="text"
              placeholder="Buscar país..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              className="w-full px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>
          {/* Lista */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-3">Sin resultados</p>
            ) : (
              filtered.map(country => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleSelect(country)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-800 transition text-left ${selected.code === country.code ? 'bg-zinc-800' : ''}`}
                >
                  <span className="text-base">{country.flag}</span>
                  <span className="text-white flex-1 truncate">{country.name}</span>
                  <span className="text-zinc-500 text-xs">{country.prefix}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Input número */}
      <input
        type="tel"
        placeholder="600000000"
        value={number}
        onChange={handleNumber}
        className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
      />
    </div>
  );
}