/**
 * ═══════════════════════════════════════════════════════════════════════
 * GLOVOL — SCRIPT DE DATOS DE PRUEBA (SEED)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * INSTRUCCIONES:
 *
 * 1. REGISTRA los 8 usuarios en https://glovol-19eb7.firebaseapp.com
 *    usando el formulario de Registro con estos correos y contraseña:
 *
 *    correo                          contraseña        rol
 *    ──────────────────────────────  ────────────────  ──────────────────
 *    admin@glovol.org                GloVol2024!       admin (tú)
 *    proteccioncivil@madrid.gob.es   Demo2024!         gobierno
 *    redcruzes@cruzroja.es           Demo2024!         organización
 *    corresponsal@elpais.com         Demo2024!         periodista
 *    acnur.espana@unhcr.org          Demo2024!         organización
 *    kyiv.reporter@rferl.org         Demo2024!         periodista
 *    voluntario.ana@gmail.com        Demo2024!         usuario normal
 *    donante.carlos@gmail.com        Demo2024!         usuario normal
 *
 * 2. Tras registrarlos, ve a Firebase Console → Authentication y copia
 *    los UIDs de cada usuario. Pégalos en el objeto UIDS de abajo.
 *
 * 3. Ejecuta este script:
 *       npm install firebase-admin
 *       node scripts/seed.js
 *
 * 4. ¡Listo! Tendrás datos de prueba completos.
 * ═══════════════════════════════════════════════════════════════════════
 */

import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json'); // descarga desde Firebase Console → Configuración → Cuentas de servicio

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'glovol-19eb7',
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ── ⚠️  PEGA AQUÍ LOS UIDS QUE COPIES DE FIREBASE AUTH ──────────────────────
const UIDS = {
  admin:      'teBRVICi9zYAL6qbd3lbB9s2iWL2',           // alessandrogaravello04@gmail.com
  madrid_gov: 'XloaLrrS6PQiLOoFJSMGbufJXhF3',   // proteccioncivil@madrid.gob.es
  cruz_roja:  'uo13RFosJxcU2stlkWZ2y9NVOus1',          // redcruzes@cruzroja.es
  el_pais:    'SW2svzsQjFRKYoxv91ukTqpN2oZ2',            // corresponsal@elpais.com
  acnur:      '6CvEE0gLj7OLjvG5dzEnokQxa2p1',              // acnur.espana@unhcr.org
  kyiv_rep:   'Qh6TcBFwY4Mzjgt7jJfcq3S7pZt2',      // kyiv.reporter@rferl.org
  ana:        'vrStikvHt7et3ssWujGvgXmnc1K2',                // voluntario.ana@gmail.com
  carlos:     'JDTQCost5DYZpqUGMefdoYCWVev2',            // donante.carlos@gmail.com
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const now = admin.firestore.Timestamp.now();
const daysAgo = (n) => admin.firestore.Timestamp.fromDate(new Date(Date.now() - n * 86400000));
const hoursAgo = (n) => admin.firestore.Timestamp.fromDate(new Date(Date.now() - n * 3600000));

async function batchWrite(docs) {
  const chunks = [];
  for (let i = 0; i < docs.length; i += 490) chunks.push(docs.slice(i, i + 490));
  for (const chunk of chunks) {
    const batch = db.batch();
    chunk.forEach(({ ref, data }) => batch.set(ref, data, { merge: true }));
    await batch.commit();
    console.log(`  ✓ ${chunk.length} documentos escritos`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// USUARIOS
// ─────────────────────────────────────────────────────────────────────────────
async function seedUsers() {
  console.log('\n👤 Creando usuarios...');
  const docs = [
    {
      ref: db.doc(`users/${UIDS.madrid_gov}`),
      data: {
        uid: UIDS.madrid_gov, email: 'proteccioncivil@madrid.gob.es',
        displayName: 'Protección Civil Madrid', username: 'protcivil_madrid',
        phone: '+34910000001', role: 'user', isVerified: true, isActive: true,
        verificationStatus: 'approved', profilePicture: null,
        country: 'ES', city: 'Madrid', region: 'Comunidad de Madrid',
        language: 'es', warCrimesAccess: false, totalDonatedEUR: 0,
        followersCount: 12400, followingCount: 38, volunteerEventsCount: 0,
        createdAt: daysAgo(180), lastLogin: hoursAgo(2),
        bio: 'Servicio oficial de Protección Civil de la Comunidad de Madrid.',
      }
    },
    {
      ref: db.doc(`users/${UIDS.cruz_roja}`),
      data: {
        uid: UIDS.cruz_roja, email: 'redcruzes@cruzroja.es',
        displayName: 'Cruz Roja España', username: 'cruzroja_es',
        phone: '+34915000001', role: 'user', isVerified: true, isActive: true,
        verificationStatus: 'approved', profilePicture: null,
        country: 'ES', city: 'Madrid', region: 'Comunidad de Madrid',
        language: 'es', warCrimesAccess: false, totalDonatedEUR: 0,
        followersCount: 98500, followingCount: 120, volunteerEventsCount: 0,
        createdAt: daysAgo(365), lastLogin: hoursAgo(1),
        bio: 'Organización humanitaria. Ayuda a quienes más lo necesitan. 🩸',
      }
    },
    {
      ref: db.doc(`users/${UIDS.el_pais}`),
      data: {
        uid: UIDS.el_pais, email: 'corresponsal@elpais.com',
        displayName: 'El País — Corresponsal', username: 'elpais_emergencias',
        phone: '+34913000001', role: 'user', isVerified: true, isActive: true,
        verificationStatus: 'approved', profilePicture: null,
        country: 'ES', city: 'Madrid', region: 'Comunidad de Madrid',
        language: 'es', warCrimesAccess: false, totalDonatedEUR: 0,
        followersCount: 45200, followingCount: 89, volunteerEventsCount: 0,
        createdAt: daysAgo(240), lastLogin: hoursAgo(3),
        bio: 'Cobertura de emergencias y catástrofes naturales. El País.',
      }
    },
    {
      ref: db.doc(`users/${UIDS.acnur}`),
      data: {
        uid: UIDS.acnur, email: 'acnur.espana@unhcr.org',
        displayName: 'ACNUR España', username: 'acnur_es',
        phone: '+34914000001', role: 'user', isVerified: true, isActive: true,
        verificationStatus: 'approved', profilePicture: null,
        country: 'ES', city: 'Madrid', region: 'Comunidad de Madrid',
        language: 'es', warCrimesAccess: true, totalDonatedEUR: 0,
        followersCount: 67800, followingCount: 200, volunteerEventsCount: 0,
        createdAt: daysAgo(400), lastLogin: hoursAgo(5),
        bio: 'Agencia de la ONU para los Refugiados. Protegemos a las personas desplazadas.',
      }
    },
    {
      ref: db.doc(`users/${UIDS.kyiv_rep}`),
      data: {
        uid: UIDS.kyiv_rep, email: 'kyiv.reporter@rferl.org',
        displayName: 'Oleg Marchenko — RFERL', username: 'marchenko_kyiv',
        phone: '+380671000001', role: 'user', isVerified: true, isActive: true,
        verificationStatus: 'approved', profilePicture: null,
        country: 'UA', city: 'Kyiv', region: 'Kyiv Oblast',
        language: 'en', warCrimesAccess: true, totalDonatedEUR: 0,
        followersCount: 8900, followingCount: 45, volunteerEventsCount: 0,
        createdAt: daysAgo(150), lastLogin: hoursAgo(6),
        bio: 'War correspondent based in Kyiv. Covering the conflict since 2022. RFERL.',
      }
    },
    {
      ref: db.doc(`users/${UIDS.ana}`),
      data: {
        uid: UIDS.ana, email: 'voluntario.ana@gmail.com',
        displayName: 'Ana García Ruiz', username: 'ana_garcia_ruiz',
        phone: '+34611222333', role: 'user', isVerified: false, isActive: true,
        verificationStatus: 'none', profilePicture: null,
        country: 'ES', city: 'Valencia', region: 'Comunitat Valenciana',
        language: 'es', warCrimesAccess: false, totalDonatedEUR: 75,
        followersCount: 124, followingCount: 67, volunteerEventsCount: 14,
        createdAt: daysAgo(90), lastLogin: hoursAgo(12),
        bio: '🌍 Apasionada por el voluntariado. #SiempreLista #AyudarNosUne',
      }
    },
    {
      ref: db.doc(`users/${UIDS.carlos}`),
      data: {
        uid: UIDS.carlos, email: 'donante.carlos@gmail.com',
        displayName: 'Carlos Fernández', username: 'carlos_fer',
        phone: '+34622333444', role: 'user', isVerified: false, isActive: true,
        verificationStatus: 'none', profilePicture: null,
        country: 'ES', city: 'Barcelona', region: 'Cataluña',
        language: 'es', warCrimesAccess: false, totalDonatedEUR: 650,
        followersCount: 89, followingCount: 34, volunteerEventsCount: 3,
        createdAt: daysAgo(120), lastLogin: daysAgo(1),
        bio: '💙 Ayudo donde puedo. Donante habitual desde 2020.',
      }
    },
  ];
  await batchWrite(docs);
}

// ─────────────────────────────────────────────────────────────────────────────
// PERFILES VERIFICADOS
// ─────────────────────────────────────────────────────────────────────────────
async function seedVerifiedProfiles() {
  console.log('\n🏛️  Creando perfiles verificados...');
  const docs = [
    {
      ref: db.doc(`verifiedProfiles/${UIDS.madrid_gov}`),
      data: {
        userId: UIDS.madrid_gov, type: 'government', displayBadge: 'government',
        entityName: 'Comunidad de Madrid — Protección Civil',
        entityCountry: 'ES', entityLevel: 'autonomous_community',
        position: 'Director General de Protección Civil y Bomberos',
        canPostWarCrimes: false, postsCount: 8, followersCount: 12400,
        verifiedBy: UIDS.admin, verifiedAt: daysAgo(170),
      }
    },
    {
      ref: db.doc(`verifiedProfiles/${UIDS.cruz_roja}`),
      data: {
        userId: UIDS.cruz_roja, type: 'organization', displayBadge: 'organization',
        entityName: 'Cruz Roja Española', entityCountry: 'ES',
        orgType: 'red_cross_affiliated',
        position: 'Departamento de Comunicación y Emergencias',
        canPostWarCrimes: false, postsCount: 23, followersCount: 98500,
        verifiedBy: UIDS.admin, verifiedAt: daysAgo(360),
      }
    },
    {
      ref: db.doc(`verifiedProfiles/${UIDS.el_pais}`),
      data: {
        userId: UIDS.el_pais, type: 'journalist', displayBadge: 'journalist',
        entityName: 'El País', entityCountry: 'ES',
        journalistType: 'press_agency', pressAgency: 'El País / PRISA Media',
        position: 'Corresponsal de Emergencias y Catástrofes',
        canPostWarCrimes: false, postsCount: 15, followersCount: 45200,
        verifiedBy: UIDS.admin, verifiedAt: daysAgo(230),
      }
    },
    {
      ref: db.doc(`verifiedProfiles/${UIDS.acnur}`),
      data: {
        userId: UIDS.acnur, type: 'organization', displayBadge: 'organization',
        entityName: 'ACNUR — Alto Comisionado de la ONU para los Refugiados',
        entityCountry: 'ES', orgType: 'un_agency',
        position: 'Representación en España',
        canPostWarCrimes: true, postsCount: 31, followersCount: 67800,
        verifiedBy: UIDS.admin, verifiedAt: daysAgo(390),
      }
    },
    {
      ref: db.doc(`verifiedProfiles/${UIDS.kyiv_rep}`),
      data: {
        userId: UIDS.kyiv_rep, type: 'journalist', displayBadge: 'journalist',
        entityName: 'Radio Free Europe / Radio Liberty',
        entityCountry: 'UA', journalistType: 'war_correspondent',
        pressAgency: 'RFERL',
        position: 'Corresponsal de guerra — Kyiv',
        canPostWarCrimes: true, postsCount: 12, followersCount: 8900,
        verifiedBy: UIDS.admin, verifiedAt: daysAgo(140),
      }
    },
  ];
  await batchWrite(docs);
}

// ─────────────────────────────────────────────────────────────────────────────
// CATÁSTROFES
// ─────────────────────────────────────────────────────────────────────────────
async function seedDisasters() {
  console.log('\n🌍 Creando catástrofes...');
  const docs = [
    {
      ref: db.doc('disasters/ES-2025-DANA-001'),
      data: {
        disasterId: 'ES-2025-DANA-001', title: 'DANA Valencia — Noviembre 2024',
        type: 'natural_disaster', subtype: 'flood', status: 'active',
        severity: 'critical', isWarRelated: false, verifiedByAdmin: true,
        country: 'ES', region: 'Comunitat Valenciana',
        affectedArea: 'Valencia, Castellón, sur de Tarragona',
        affectedPopulation: 120000, casualties: 222, displacedPeople: 45000,
        coordinates: new admin.firestore.GeoPoint(39.4699, -0.3763),
        radiusKm: 80, startDate: daysAgo(160), endDate: null,
        donationProvider: 'stripe',
        stripePaymentLinkUrl: 'https://buy.stripe.com/test_bJe4gB4TOd8wbId5IO3Nm00',
        stripePaymentLinkId: 'bJe4gB4TOd8wbId5IO3Nm00',
        totalDonationsEUR: 48750, totalDonorsCount: 312,
        totalVolunteersRegistered: 89, totalVolunteersActive: 34,
        postsCount: 7,
        tags: ['dana', 'inundacion', 'valencia', 'espana', '2024'],
        relatedDisasterIds: [],
        coverImage: 'https://consaludmental.org/wp-content/uploads/2025/05/DANA-Valencia-2024.jpg',
        createdBy: UIDS.admin, createdAt: daysAgo(162),
      }
    },
    {
      ref: db.doc('disasters/UA-2024-WAR-001'),
      data: {
        disasterId: 'UA-2024-WAR-001', title: 'Conflicto armado — Ucrania 2022–presente',
        type: 'war', subtype: 'armed_conflict', status: 'active',
        severity: 'critical', isWarRelated: true, verifiedByAdmin: true,
        country: 'UA', region: null,
        affectedArea: 'Ucrania este, sur y centro',
        affectedPopulation: 8000000, casualties: null, displacedPeople: 8000000,
        coordinates: new admin.firestore.GeoPoint(48.3794, 31.1656),
        radiusKm: 500, startDate: daysAgo(760), endDate: null,
        donationProvider: 'stripe', stripePaymentLinkUrl: '', stripePaymentLinkId: '',
        totalDonationsEUR: 12400, totalDonorsCount: 98,
        totalVolunteersRegistered: 12, totalVolunteersActive: 8,
        postsCount: 5,
        tags: ['guerra', 'ucrania', 'conflicto', 'refugiados'],
        relatedDisasterIds: [],
        coverImage: 'https://www.msf.org.ar/wp-content/uploads/sites/3/2024/02/MSB184488_ucrania.jpg',
        createdBy: UIDS.admin, createdAt: daysAgo(760),
      }
    },
    {
      ref: db.doc('disasters/TR-2025-EQ-001'),
      data: {
        disasterId: 'TR-2025-EQ-001', title: 'Terremoto Turquía — Febrero 2025',
        type: 'natural_disaster', subtype: 'earthquake', status: 'active',
        severity: 'high', isWarRelated: false, verifiedByAdmin: true,
        country: 'TR', region: 'Kahramanmaraş',
        affectedArea: 'Kahramanmaraş, Hatay, Gaziantep, Adıyaman',
        affectedPopulation: 500000, casualties: 1800, displacedPeople: 220000,
        coordinates: new admin.firestore.GeoPoint(37.5858, 36.9371),
        radiusKm: 200, startDate: daysAgo(55), endDate: null,
        donationProvider: 'stripe', stripePaymentLinkUrl: '', stripePaymentLinkId: '',
        totalDonationsEUR: 8900, totalDonorsCount: 67,
        totalVolunteersRegistered: 22, totalVolunteersActive: 15,
        postsCount: 3,
        tags: ['terremoto', 'turquia', 'seismo', '2025'],
        relatedDisasterIds: [],
        coverImage: 'https://e01-elmundo.uecdn.es/assets/multimedia/imagenes/2023/02/08/16758802774841.jpg',
        createdBy: UIDS.admin, createdAt: daysAgo(57),
      }
    },
    {
      ref: db.doc('disasters/MA-2024-EQ-001'),
      data: {
        disasterId: 'MA-2024-EQ-001', title: 'Terremoto Marruecos — Al-Haouz 2024',
        type: 'natural_disaster', subtype: 'earthquake', status: 'resolved',
        severity: 'high', isWarRelated: false, verifiedByAdmin: true,
        country: 'MA', region: 'Al-Haouz',
        affectedArea: 'Al-Haouz, Taroudant, Marrakech',
        affectedPopulation: 300000, casualties: 2960, displacedPeople: 70000,
        coordinates: new admin.firestore.GeoPoint(31.0, -8.5),
        radiusKm: 100, startDate: daysAgo(210), endDate: daysAgo(45),
        donationProvider: 'stripe', stripePaymentLinkUrl: '', stripePaymentLinkId: '',
        totalDonationsEUR: 22300, totalDonorsCount: 178,
        totalVolunteersRegistered: 45, totalVolunteersActive: 0,
        postsCount: 4,
        tags: ['terremoto', 'marruecos', 'alhaouz', '2024'],
        relatedDisasterIds: [],
        coverImage: 'https://www.atalayar.com/media/atalayar/images/2023/09/11/2023091116261038530.jpg',
        createdBy: UIDS.admin, createdAt: daysAgo(212),
      }
    },
  ];
  await batchWrite(docs);
}

// ─────────────────────────────────────────────────────────────────────────────
// POSTS
// ─────────────────────────────────────────────────────────────────────────────
async function seedPosts() {
  console.log('\n📝 Creando posts...');
  const posts = [
    // ── DANA Valencia ─────────────────────────────────────────────────────
    {
      ref: db.doc('posts/post_dana_001'),
      data: {
        postId: 'post_dana_001', disasterId: 'ES-2025-DANA-001',
        country: 'ES', disasterType: 'natural_disaster',
        authorId: UIDS.cruz_roja, authorType: 'organization',
        title: 'Situación DANA Valencia — necesitamos voluntarios urgente',
        content: 'Más de 120.000 personas afectadas en los municipios del sur de Valencia. Se han habilitado albergues en polideportivos de Paiporta, Catarroja y Alfafar. Necesitamos urgentemente:\n\n• Voluntarios con vehículos todo terreno\n• Personal sanitario\n• Psicólogos para atención a afectados\n• Donaciones de ropa de abrigo y alimentos no perecederos\n\nLlamad al 112 si detectáis personas en riesgo.',
        contentType: 'situation_report', urgencyLevel: 'critical',
        language: 'es', isActive: true, isAdminVerified: true, isPinned: true,
        isWarCrimeReport: false, needsDonations: true, needsVolunteers: true,
        donationApprovalStatus: 'approved',
        stripePaymentLinkUrl: 'https://buy.stripe.com/test_bJe4gB4TOd8wbId5IO3Nm00',
        stripePaymentLinkId: 'bJe4gB4TOd8wbId5IO3Nm00',
        locationName: 'Paiporta, Valencia',
        location: new admin.firestore.GeoPoint(39.4282, -0.4141),
        media: [
          { url: 'https://consaludmental.org/wp-content/uploads/2025/05/DANA-Valencia-2024.jpg', type: 'image', caption: 'Vista de las zonas inundadas en l\'Horta Sud — DANA noviembre 2024' },
        ],
        likesCount: 8420, sharesCount: 3100, commentsCount: 342,
        volunteerCount: 67, donationCount: 234, totalRaisedEUR: 18900,
        createdAt: daysAgo(158), updatedAt: daysAgo(140),
      }
    },
    {
      ref: db.doc('posts/post_dana_002'),
      data: {
        postId: 'post_dana_002', disasterId: 'ES-2025-DANA-001',
        country: 'ES', disasterType: 'natural_disaster',
        authorId: UIDS.madrid_gov, authorType: 'government',
        title: 'Activado Plan de Emergencia Especial — 112 coordinando recursos',
        content: 'La Comunidad de Madrid ha movilizado equipos de rescate hacia Valencia. 180 efectivos de Bomberos y SUMMA 112 ya están en zona. Se coordinan con CECOPAL de Valencia.\n\nSi tienes familiares en la zona afectada y no puedes contactar con ellos, llama al 900 365 112 (gratuito, 24h).',
        contentType: 'official_statement', urgencyLevel: 'critical',
        language: 'es', isActive: true, isAdminVerified: true, isPinned: false,
        isWarCrimeReport: false, needsDonations: false, needsVolunteers: true,
        donationApprovalStatus: 'pending',
        stripePaymentLinkUrl: '', stripePaymentLinkId: '',
        locationName: 'Valencia y alrededores',
        location: new admin.firestore.GeoPoint(39.4699, -0.3763),
        media: [],
        likesCount: 5230, sharesCount: 8900, commentsCount: 178,
        volunteerCount: 22, donationCount: 0, totalRaisedEUR: 0,
        createdAt: daysAgo(157), updatedAt: daysAgo(155),
      }
    },
    {
      ref: db.doc('posts/post_dana_003'),
      data: {
        postId: 'post_dana_003', disasterId: 'ES-2025-DANA-001',
        country: 'ES', disasterType: 'natural_disaster',
        authorId: UIDS.el_pais, authorType: 'journalist',
        title: 'Crónica desde Paiporta: "El barro llega al primer piso"',
        content: 'Enviado especial desde Paiporta. Las calles del centro del municipio permanecen anegadas. Los vecinos que pudieron salir relatan escenas dantescas. María, 67 años: "Nunca pensé que el agua subiría tan rápido. En diez minutos el coche flotaba."\n\nLos equipos de rescate trabajan contrarreloj. El barro dificulta enormemente el acceso. Los helicópteros son la única vía para algunos barrios del sur.',
        contentType: 'field_report', urgencyLevel: 'high',
        language: 'es', isActive: true, isAdminVerified: true, isPinned: false,
        isWarCrimeReport: false, needsDonations: false, needsVolunteers: false,
        donationApprovalStatus: 'pending',
        stripePaymentLinkUrl: '', stripePaymentLinkId: '',
        locationName: 'Paiporta, Valencia',
        location: new admin.firestore.GeoPoint(39.4282, -0.4141),
        media: [
          { url: 'https://imagenes.elpais.com/resizer/v2/https%3A%2F%2Fep01.epimg.net%2Felpais%2Fimagenes%2F2024%2F11%2F01%2Factualidad%2F1730476800_788726_1730477001_noticia_normal.jpg', type: 'image', caption: 'Calles de Paiporta completamente anegadas tras el paso de la DANA — Enviado especial El País' },
        ],
        likesCount: 12100, sharesCount: 4500, commentsCount: 621,
        volunteerCount: 0, donationCount: 0, totalRaisedEUR: 0,
        createdAt: daysAgo(156), updatedAt: daysAgo(156),
      }
    },
    {
      ref: db.doc('posts/post_dana_004'),
      data: {
        postId: 'post_dana_004', disasterId: 'ES-2025-DANA-001',
        country: 'ES', disasterType: 'natural_disaster',
        authorId: UIDS.cruz_roja, authorType: 'organization',
        title: 'Centros de acogida activos — Lista actualizada de albergues',
        content: 'Centros de acogida operativos a día de hoy:\n\n📍 Polideportivo Municipal de Paiporta — 480 plazas\n📍 Pabellón L\'Eliana — 320 plazas\n📍 Centro Deportivo Alfafar — 290 plazas\n📍 IES Riba-roja de Túria — 150 plazas\n📍 Palau Velòdrom de Torrent — 800 plazas\n\nTodos los centros necesitan: alimentos, ropa y voluntarios para atención psicológica. Donaciones materiales coordinar con nuestro equipo: dona@cruzroja.es',
        contentType: 'resource_update', urgencyLevel: 'high',
        language: 'es', isActive: true, isAdminVerified: true, isPinned: false,
        isWarCrimeReport: false, needsDonations: true, needsVolunteers: true,
        donationApprovalStatus: 'approved',
        stripePaymentLinkUrl: 'https://buy.stripe.com/test_bJe4gB4TOd8wbId5IO3Nm00',
        stripePaymentLinkId: 'bJe4gB4TOd8wbId5IO3Nm00',
        locationName: 'Área metropolitana Valencia',
        location: new admin.firestore.GeoPoint(39.4699, -0.3763),
        media: [],
        likesCount: 3400, sharesCount: 9800, commentsCount: 156,
        volunteerCount: 45, donationCount: 178, totalRaisedEUR: 14200,
        createdAt: daysAgo(150), updatedAt: daysAgo(148),
      }
    },

    // ── Ucrania ───────────────────────────────────────────────────────────
    {
      ref: db.doc('posts/post_ua_001'),
      data: {
        postId: 'post_ua_001', disasterId: 'UA-2024-WAR-001',
        country: 'UA', disasterType: 'war',
        authorId: UIDS.acnur, authorType: 'organization',
        title: 'ACNUR: 8 millones de desplazados internos en Ucrania',
        content: 'El informe actualizado de ACNUR confirma que más de 8 millones de personas continúan desplazadas dentro de Ucrania. Los corredores humanitarios al este han sido bloqueados en tres ocasiones esta semana.\n\nNecesidades prioritarias:\n• Refugio temporal resistente al invierno\n• Generadores y combustible\n• Alimentos y agua potable\n• Atención médica básica\n\nEl invierno se acerca y el tiempo es crucial.',
        contentType: 'situation_report', urgencyLevel: 'critical',
        language: 'es', isActive: true, isAdminVerified: true, isPinned: true,
        isWarCrimeReport: false, needsDonations: true, needsVolunteers: false,
        donationApprovalStatus: 'approved',
        stripePaymentLinkUrl: 'https://buy.stripe.com/test_bJe4gB4TOd8wbId5IO3Nm00',
        stripePaymentLinkId: 'bJe4gB4TOd8wbId5IO3Nm00',
        locationName: 'Ucrania (este y centro)',
        location: new admin.firestore.GeoPoint(49.0139, 31.2858),
        media: [
          { url: 'https://www.msf.org.ar/wp-content/uploads/sites/3/2024/02/MSB184488_ucrania.jpg', type: 'image', caption: 'Familias desplazadas en Ucrania reciben asistencia de MSF — febrero 2024' },
        ],
        likesCount: 6700, sharesCount: 5200, commentsCount: 289,
        volunteerCount: 0, donationCount: 98, totalRaisedEUR: 12400,
        createdAt: daysAgo(20), updatedAt: daysAgo(18),
      }
    },
    {
      ref: db.doc('posts/post_ua_002'),
      data: {
        postId: 'post_ua_002', disasterId: 'UA-2024-WAR-001',
        country: 'UA', disasterType: 'war',
        authorId: UIDS.kyiv_rep, authorType: 'journalist',
        title: 'Desde Kharkiv: hospitales sin electricidad tras bombardeos',
        content: 'Reporting from Kharkiv. The central hospital lost power after last night\'s strikes on the energy grid. Staff are operating by generator backup — limited to 4 hours of surgery capacity per day.\n\nI spoke with Dr. Olena Kovalenko: "We have patients in intensive care. The situation is extremely difficult. We need generators, fuel, and blood bags."\n\nLocal volunteers are organizing fuel collection. International aid needed urgently.',
        contentType: 'field_report', urgencyLevel: 'critical',
        language: 'en', isActive: true, isAdminVerified: true, isPinned: false,
        isWarCrimeReport: false, needsDonations: false, needsVolunteers: false,
        donationApprovalStatus: 'pending',
        stripePaymentLinkUrl: '', stripePaymentLinkId: '',
        locationName: 'Kharkiv, Ucrania',
        location: new admin.firestore.GeoPoint(49.9935, 36.2304),
        media: [
          { url: 'https://gdb.rferl.org/C68E7CCF-FA85-4F0C-B015-BEDC7B2A0E8D_w1023_r1_s.jpg', type: 'image', caption: 'Edificio destruido en Kharkiv tras los bombardeos sobre la red eléctrica — RFERL / Oleg Marchenko' },
        ],
        likesCount: 4900, sharesCount: 7100, commentsCount: 203,
        volunteerCount: 0, donationCount: 0, totalRaisedEUR: 0,
        createdAt: daysAgo(7), updatedAt: daysAgo(7),
      }
    },

    // ── Turquía ───────────────────────────────────────────────────────────
    {
      ref: db.doc('posts/post_tr_001'),
      data: {
        postId: 'post_tr_001', disasterId: 'TR-2025-EQ-001',
        country: 'TR', disasterType: 'natural_disaster',
        authorId: UIDS.acnur, authorType: 'organization',
        title: 'Terremoto Turquía: operaciones de búsqueda y rescate en curso',
        content: 'Equipos de ACNUR y socios locales trabajan en Kahramanmaraş tras el terremoto de magnitud 7.6. Se han confirmado más de 1.800 víctimas y más de 200.000 desplazados.\n\nNecesidades críticas:\n🏠 Tiendas de campaña y refugio temporal\n💊 Medicamentos y material sanitario\n🍞 Alimentos de emergencia\n🔋 Generadores y sistemas de iluminación\n\nEl gobierno turco ha aceptado la coordinación de ayuda internacional.',
        contentType: 'situation_report', urgencyLevel: 'critical',
        language: 'es', isActive: true, isAdminVerified: true, isPinned: true,
        isWarCrimeReport: false, needsDonations: true, needsVolunteers: true,
        donationApprovalStatus: 'approved',
        stripePaymentLinkUrl: 'https://buy.stripe.com/test_bJe4gB4TOd8wbId5IO3Nm00',
        stripePaymentLinkId: 'bJe4gB4TOd8wbId5IO3Nm00',
        locationName: 'Kahramanmaraş, Turquía',
        location: new admin.firestore.GeoPoint(37.5858, 36.9371),
        media: [
          { url: 'https://e01-elmundo.uecdn.es/assets/multimedia/imagenes/2023/02/08/16758802774841.jpg', type: 'image', caption: 'Equipos de rescate trabajando entre los escombros en Kahramanmaraş tras el terremoto de magnitud 7.6' },
        ],
        likesCount: 3200, sharesCount: 2100, commentsCount: 145,
        volunteerCount: 18, donationCount: 67, totalRaisedEUR: 8900,
        createdAt: daysAgo(52), updatedAt: daysAgo(48),
      }
    },
    {
      ref: db.doc('posts/post_tr_002'),
      data: {
        postId: 'post_tr_002', disasterId: 'TR-2025-EQ-001',
        country: 'TR', disasterType: 'natural_disaster',
        authorId: UIDS.cruz_roja, authorType: 'organization',
        title: 'Media Luna Roja Turca coordina albergues — Cruz Roja refuerza equipo',
        content: 'Cruz Roja Española ha enviado un equipo de 12 personas para apoyar a la Media Luna Roja Turca en las tareas de atención a desplazados. Los centros de acogida habilitados en Gaziantep y Adıyaman ya atienden a más de 40.000 personas.\n\nPrincipales necesidades actuales:\n• Personal médico voluntario (mínimo 2 semanas)\n• Psicólogos con experiencia en trauma\n• Intérpretes árabe-turco\n\nContacto para voluntarios: voluntariado@cruzroja.es',
        contentType: 'volunteer_call', urgencyLevel: 'high',
        language: 'es', isActive: true, isAdminVerified: true, isPinned: false,
        isWarCrimeReport: false, needsDonations: false, needsVolunteers: true,
        donationApprovalStatus: 'pending',
        stripePaymentLinkUrl: '', stripePaymentLinkId: '',
        locationName: 'Gaziantep y Adıyaman, Turquía',
        location: new admin.firestore.GeoPoint(37.0662, 37.3833),
        media: [],
        likesCount: 1890, sharesCount: 1240, commentsCount: 98,
        volunteerCount: 22, donationCount: 0, totalRaisedEUR: 0,
        createdAt: daysAgo(48), updatedAt: daysAgo(46),
      }
    },
  ];
  await batchWrite(posts);
}

// ─────────────────────────────────────────────────────────────────────────────
// VOLUNTARIOS
// ─────────────────────────────────────────────────────────────────────────────
async function seedVolunteers() {
  console.log('\n🙋 Creando voluntarios...');
  const docs = [
    {
      ref: db.doc(`volunteers/ES-2025-DANA-001_${UIDS.ana}`),
      data: {
        volunteerId: `ES-2025-DANA-001_${UIDS.ana}`,
        userId: UIDS.ana, disasterId: 'ES-2025-DANA-001', postId: 'post_dana_001',
        status: 'deployed', registeredAt: daysAgo(155), updatedAt: daysAgo(148),
        userDisplayName: 'Ana García Ruiz',
        userLocation: new admin.firestore.GeoPoint(39.4699, -0.3763),
        userCountry: 'ES', userCity: 'Valencia',
        userPhone: '+34611222333', distanceToDisasterKm: 8,
        skills: ['first_aid', 'logistics', 'driving_4wd'],
        languages: ['es', 'en'], availabilityStart: daysAgo(155),
        availabilityEnd: daysAgo(130),
        notes: 'Tengo furgoneta 4x4 y certificado de primeros auxilios. Disponible toda la semana.',
        contactedAt: daysAgo(153), contactedBy: UIDS.cruz_roja,
        deployedAt: daysAgo(150), deploymentDetails: 'Asignada al centro de acogida Paiporta — reparto de alimentos.',
      }
    },
    {
      ref: db.doc(`volunteers/ES-2025-DANA-001_${UIDS.carlos}`),
      data: {
        volunteerId: `ES-2025-DANA-001_${UIDS.carlos}`,
        userId: UIDS.carlos, disasterId: 'ES-2025-DANA-001', postId: 'post_dana_004',
        status: 'registered', registeredAt: daysAgo(145), updatedAt: daysAgo(145),
        userDisplayName: 'Carlos Fernández',
        userLocation: new admin.firestore.GeoPoint(41.3851, 2.1734),
        userCountry: 'ES', userCity: 'Barcelona',
        userPhone: '+34622333444', distanceToDisasterKm: 360,
        skills: ['construction', 'heavy_machinery'],
        languages: ['es', 'ca'], availabilityStart: daysAgo(140),
        availabilityEnd: null, notes: 'Ingeniero civil. Puedo ayudar con evaluación de estructuras.',
        contactedAt: null, contactedBy: null,
        deployedAt: null, deploymentDetails: null,
      }
    },
    {
      ref: db.doc(`volunteers/TR-2025-EQ-001_${UIDS.ana}`),
      data: {
        volunteerId: `TR-2025-EQ-001_${UIDS.ana}`,
        userId: UIDS.ana, disasterId: 'TR-2025-EQ-001', postId: 'post_tr_001',
        status: 'contacted', registeredAt: daysAgo(50), updatedAt: daysAgo(48),
        userDisplayName: 'Ana García Ruiz',
        userLocation: new admin.firestore.GeoPoint(39.4699, -0.3763),
        userCountry: 'ES', userCity: 'Valencia',
        userPhone: '+34611222333', distanceToDisasterKm: 2800,
        skills: ['first_aid', 'psychology_support'],
        languages: ['es', 'en'], availabilityStart: daysAgo(45),
        availabilityEnd: daysAgo(30),
        notes: 'Disponible 2 semanas. Tengo experiencia en trauma.',
        contactedAt: daysAgo(47), contactedBy: UIDS.acnur,
        deployedAt: null, deploymentDetails: null,
      }
    },
  ];
  await batchWrite(docs);
}

// ─────────────────────────────────────────────────────────────────────────────
// DONACIONES
// ─────────────────────────────────────────────────────────────────────────────
async function seedDonations() {
  console.log('\n💰 Creando donaciones...');
  const donaciones = [
    { id: 'don_dana_001', donor: UIDS.carlos, post: 'post_dana_001', disaster: 'ES-2025-DANA-001', amount: 150, msg: '¡Ánimo a todos! Estaréis bien.', dias: 152 },
    { id: 'don_dana_002', donor: UIDS.ana,    post: 'post_dana_001', disaster: 'ES-2025-DANA-001', amount: 50,  msg: 'Un poco es mejor que nada. Fuerza Valencia!', dias: 151 },
    { id: 'don_dana_003', donor: UIDS.carlos, post: 'post_dana_004', disaster: 'ES-2025-DANA-001', amount: 200, msg: 'Para los albergues.', dias: 148 },
    { id: 'don_dana_004', donor: UIDS.ana,    post: 'post_dana_004', disaster: 'ES-2025-DANA-001', amount: 25,  msg: '', dias: 147 },
    { id: 'don_ua_001',   donor: UIDS.carlos, post: 'post_ua_001',   disaster: 'UA-2024-WAR-001',  amount: 100, msg: 'Hope this helps.', dias: 18 },
    { id: 'don_tr_001',   donor: UIDS.ana,    post: 'post_tr_001',   disaster: 'TR-2025-EQ-001',   amount: 75,  msg: 'Desde España, con todo mi apoyo.', dias: 50 },
    { id: 'don_tr_002',   donor: UIDS.carlos, post: 'post_tr_001',   disaster: 'TR-2025-EQ-001',   amount: 125, msg: 'Para el refugio temporal.', dias: 49 },
  ];

  const docs = donaciones.map(d => ({
    ref: db.doc(`donations/${d.id}`),
    data: {
      donationId: d.id, donorId: d.donor,
      postId: d.post, disasterId: d.disaster,
      amountEUR: d.amount, totalRaisedEUR: d.amount,
      stripePaymentIntentId: `pi_test_${d.id}`,
      stripeSessionId: `cs_test_${d.id}`,
      stripePaymentLinkId: 'bJe4gB4TOd8wbId5IO3Nm00',
      verificationStatus: 'completed',
      donationProvider: 'stripe',
      isAnonymous: false, message: d.msg,
      donorEmail: d.donor === UIDS.carlos ? 'donante.carlos@gmail.com' : 'voluntario.ana@gmail.com',
      donorCountry: d.donor === UIDS.kyiv_rep ? 'UA' : 'ES',
      createdAt: daysAgo(d.dias), completedAt: daysAgo(d.dias),
    }
  }));
  await batchWrite(docs);
}

// ─────────────────────────────────────────────────────────────────────────────
// COMENTARIOS
// ─────────────────────────────────────────────────────────────────────────────
async function seedComments() {
  console.log('\n💬 Creando comentarios...');
  const comentarios = [
    { id: 'cmt_dana_001', post: 'post_dana_001', disaster: 'ES-2025-DANA-001', author: UIDS.ana,    text: 'Acabo de llegar al polideportivo de Paiporta. Hay muchas familias que necesitan calzado de recambio y mantas. ¿Alguien puede traer?', dias: 156, likes: 234 },
    { id: 'cmt_dana_002', post: 'post_dana_001', disaster: 'ES-2025-DANA-001', author: UIDS.carlos, text: 'Me apunto como voluntario. Tengo experiencia en construcción y puedo ayudar con la limpieza del barro.', dias: 155, likes: 89 },
    { id: 'cmt_dana_003', post: 'post_dana_001', disaster: 'ES-2025-DANA-001', author: UIDS.ana,    text: 'Ya he hecho el Bizum con el concepto indicado. Espero que llegue pronto la ayuda. Gracias Cruz Roja.', dias: 154, likes: 45, parent: 'cmt_dana_001' },
    { id: 'cmt_dana_004', post: 'post_dana_003', disaster: 'ES-2025-DANA-001', author: UIDS.carlos, text: 'Gracias por el reportaje. La gente necesita saber la realidad. Comparto.', dias: 155, likes: 312 },
    { id: 'cmt_ua_001',   post: 'post_ua_001',   disaster: 'UA-2024-WAR-001',  author: UIDS.carlos, text: 'Donación realizada. Esperamos que el invierno sea soportable para todos ellos.', dias: 19, likes: 78 },
    { id: 'cmt_ua_002',   post: 'post_ua_002',   disaster: 'UA-2024-WAR-001',  author: UIDS.ana,    text: 'Incredible work, Oleg. Thank you for being there and telling the truth.', dias: 6, likes: 156 },
    { id: 'cmt_tr_001',   post: 'post_tr_001',   disaster: 'TR-2025-EQ-001',   author: UIDS.ana,    text: 'Apuntada como voluntaria. Tengo certificado de primeros auxilios y puedo ir las dos próximas semanas.', dias: 51, likes: 67 },
  ];

  const docs = comentarios.map(c => ({
    ref: db.doc(`comments/${c.id}`),
    data: {
      commentId: c.id, postId: c.post, disasterId: c.disaster,
      authorId: c.author, content: c.text,
      parentCommentId: c.parent || null,
      replyCount: c.parent ? 0 : (comentarios.filter(x => x.parent === c.id).length),
      likesCount: c.likes, isDeleted: false,
      deletedBy: null, deletedAt: null,
      createdAt: daysAgo(c.dias), updatedAt: daysAgo(c.dias),
    }
  }));
  await batchWrite(docs);
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICACIONES
// ─────────────────────────────────────────────────────────────────────────────
async function seedNotifications() {
  console.log('\n🔔 Creando notificaciones...');
  const docs = [
    {
      ref: db.doc(`notifications/notif_001`),
      data: {
        notificationId: 'notif_001', userId: UIDS.ana,
        type: 'disaster_update', title: 'Nueva actualización — DANA Valencia',
        body: 'Cruz Roja ha publicado la lista actualizada de albergues.',
        disasterId: 'ES-2025-DANA-001', postId: 'post_dana_004',
        isRead: true, createdAt: daysAgo(150), readAt: daysAgo(149),
      }
    },
    {
      ref: db.doc(`notifications/notif_002`),
      data: {
        notificationId: 'notif_002', userId: UIDS.ana,
        type: 'volunteer_status_change', title: 'Estado de voluntariado actualizado',
        body: 'Cruz Roja ha contactado contigo para el despliegue en Paiporta.',
        disasterId: 'ES-2025-DANA-001', postId: 'post_dana_001',
        isRead: true, createdAt: daysAgo(153), readAt: daysAgo(152),
      }
    },
    {
      ref: db.doc(`notifications/notif_003`),
      data: {
        notificationId: 'notif_003', userId: UIDS.carlos,
        type: 'donation_completed', title: 'Donación confirmada ✓',
        body: 'Tu donación de 150 € a Cruz Roja para la DANA ha sido procesada.',
        disasterId: 'ES-2025-DANA-001', postId: 'post_dana_001',
        isRead: false, createdAt: daysAgo(152), readAt: null,
      }
    },
    {
      ref: db.doc(`notifications/notif_004`),
      data: {
        notificationId: 'notif_004', userId: UIDS.ana,
        type: 'disaster_update', title: 'Terremoto en Turquía — se necesita ayuda',
        body: 'ACNUR ha publicado un informe urgente sobre el terremoto de Kahramanmaraş.',
        disasterId: 'TR-2025-EQ-001', postId: 'post_tr_001',
        isRead: false, createdAt: daysAgo(52), readAt: null,
      }
    },
    {
      ref: db.doc(`notifications/notif_005`),
      data: {
        notificationId: 'notif_005', userId: UIDS.ana,
        type: 'volunteer_status_change', title: 'ACNUR ha revisado tu solicitud (Turquía)',
        body: 'ACNUR ha contactado contigo sobre tu candidatura de voluntariado en Turquía.',
        disasterId: 'TR-2025-EQ-001', postId: 'post_tr_001',
        isRead: false, createdAt: daysAgo(47), readAt: null,
      }
    },
  ];
  await batchWrite(docs);
}

// ─────────────────────────────────────────────────────────────────────────────
// SEGUIDOS (follows)
// ─────────────────────────────────────────────────────────────────────────────
async function seedFollows() {
  console.log('\n👥 Creando relaciones de seguimiento...');
  const follows = [
    { follower: UIDS.ana,    following: UIDS.cruz_roja },
    { follower: UIDS.ana,    following: UIDS.acnur },
    { follower: UIDS.ana,    following: UIDS.madrid_gov },
    { follower: UIDS.ana,    following: UIDS.el_pais },
    { follower: UIDS.carlos, following: UIDS.cruz_roja },
    { follower: UIDS.carlos, following: UIDS.acnur },
    { follower: UIDS.carlos, following: UIDS.kyiv_rep },
  ];

  const docs = [];
  for (const f of follows) {
    docs.push({
      ref: db.doc(`users/${f.follower}/following/${f.following}`),
      data: { followingId: f.following, followedAt: daysAgo(Math.floor(Math.random() * 80 + 10)) }
    });
    docs.push({
      ref: db.doc(`users/${f.following}/followers/${f.follower}`),
      data: { followerId: f.follower, followedAt: daysAgo(Math.floor(Math.random() * 80 + 10)) }
    });
  }
  await batchWrite(docs);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌍 GloVol Seed Script');
  console.log('═══════════════════════════════════════\n');

  // Comprobar que los UIDs están configurados
  const missingUIDs = Object.entries(UIDS).filter(([, v]) => v.startsWith('UID_') || v.startsWith('TU_'));
  if (missingUIDs.length > 0) {
    console.error('❌ ERROR: Faltan UIDs en la configuración:');
    missingUIDs.forEach(([k, v]) => console.error(`   ${k}: ${v}`));
    console.error('\n👆 Registra los usuarios primero y pega los UIDs reales en este script.');
    process.exit(1);
  }

  try {
    await seedUsers();
    await seedVerifiedProfiles();
    await seedDisasters();
    await seedPosts();
    await seedVolunteers();
    await seedDonations();
    await seedComments();
    await seedNotifications();
    await seedFollows();

    console.log('\n═══════════════════════════════════════');
    console.log('✅ Seed completado con éxito.');
    console.log('\nDatos creados:');
    console.log('  • 7 usuarios (5 verificados + 2 normales)');
    console.log('  • 5 perfiles verificados (2 gov, 2 org, 2 journalist)');
    console.log('  • 4 catástrofes (DANA, Ucrania, Turquía, Marruecos)');
    console.log('  • 8 posts (con y sin donaciones)');
    console.log('  • 3 voluntarios registrados/desplegados');
    console.log('  • 7 donaciones completadas');
    console.log('  • 7 comentarios');
    console.log('  • 5 notificaciones');
    console.log('  • 7 relaciones de seguimiento');
    console.log('\nRecuerda desplegar los índices:');
    console.log('  firebase deploy --project glovol-19eb7 --only firestore:indexes');
  } catch (e) {
    console.error('\n❌ Error durante el seed:', e.message);
    throw e;
  }
}

main().catch(console.error).finally(() => process.exit());