import { Network, PackageCheck, Truck } from 'lucide-react';
import styles from '../styles/login.module.css';

// Iran's border (backend iranBorder.ts, OpenStreetMap) and city points, projected once into this viewBox.
const VIEW_BOX = '0 0 480 442';
const IRAN_PATH =
  'M14 25.4L15.8 27.8L15.5 30L18.3 32.1L17.3 35.9L18.2 38.7L20.6 41L19.2 43.5L20.8 46.1L20.3 52.5L25.3 53.9L22.7 56.4L22.5 59.3L18.5 66.5L22.3 67.2L23.7 69.7L26.2 69.4L27.8 70.9L26.6 73.2L27.6 74.4L26.8 78.7L32 82.5L30.8 88L34.5 90.8L34.4 94.9L32.9 96.7L35.3 97L38 99.3L38.3 101.3L36.7 103.9L38.6 107L42.2 106.8L43 107.9L42.8 110.5L43.8 111.2L42.9 111.8L44.4 112.9L44.3 114.9L45.6 116.5L44.8 119.4L49.6 118.7L54.6 124.4L61.9 122.7L64 124.3L67 123.3L68.2 124.3L66.6 126.3L60.3 127.7L60.8 130.5L59.5 130.3L60.5 132.1L59.7 132.8L63.5 137.8L62.8 139.7L64.8 140.9L63.7 142.1L64.6 143.4L61.8 144.2L61.5 145.4L58.3 143.8L56.9 149.4L55.1 148.9L55.2 150.6L52.8 151.6L52 154.2L53.1 155L54.1 159.3L49.1 157.6L48.9 160.9L47 161.6L48.3 164.9L50.3 165.8L50.3 170.2L46.2 174.8L48.7 175.7L51.7 181.6L54.7 184.3L54.3 185.5L57.9 184.2L59.2 186.4L56.9 188.3L60.3 187.8L62 192.2L64.5 194.6L65.1 196.5L61 199.3L64 200L62.4 202.4L70.6 203.8L87.4 217L90.2 215.9L94.4 218.8L93.7 219.9L96.9 223.7L95.9 225.7L100.2 229.1L103.8 235.6L99.5 246.4L99.6 257.3L107.7 257.4L107.5 271.8L110.7 273.2L111.7 276.1L113.3 275.8L116.5 279.4L115.9 281.7L117.6 285.1L127.6 290.1L141.2 290.9L156.8 310.4L185 349.9L226.5 378.8L246.6 387.7L252.7 394.3L254.5 401.3L257.8 404.1L263.3 403.5L266.4 398.6L266.8 401.7L269.1 404.2L274.4 404.2L277.1 399.3L276.2 396.2L274.4 394.3L280.7 393.7L283 391.2L283.6 388L307.4 376.2L309.9 370.7L314.2 378.2L314 386.5L316.8 392.8L317.3 396.9L319.3 400.1L320.2 404.4L322.7 406.8L342.2 413.6L366.1 418L377.4 418.2L401.4 421.6L424.7 428.1L427.1 405.6L428.6 403L431 402.9L430.6 400.1L432.3 399L430.5 396.8L432.4 388.6L433.9 388.7L435.6 386.6L439.8 388.5L440.1 386.7L441.2 386.8L440.8 383.5L441.9 381.8L445.2 380.2L453.4 377.8L462.8 377.9L462.6 372.7L464 372.3L464.1 365.6L466 364.9L464.8 362.3L462.6 360.9L456.7 362.6L453 361.2L454.1 359.9L453.3 358.8L454.6 355.3L452.7 340.3L453.4 332.7L448.8 333.6L443.9 328.5L432.7 324.8L422.6 312.1L423.2 311L419.6 305.1L419.8 302.3L414.3 298L408.4 288.9L430.2 261.9L429.7 259.7L431 256.3L429.6 249L427.9 246.9L408 243.8L407.1 228.9L408.6 224.1L401.6 198.3L402.8 195.6L408.2 190.3L407.9 188.6L410.1 187.7L402.6 185.8L400.8 181.7L401.6 179.6L400.2 171.2L404 165.6L409.4 165.8L405.3 159.9L411.4 156.4L413.1 150.8L412.7 149.1L414.8 144.3L413.4 141.9L413.5 139.2L415.8 138.4L415.7 135.4L418 131.6L416.4 127.8L417.1 121.6L414.1 119.8L416.8 115.5L414.9 110L415.7 103.1L414.8 100.9L396 101.4L389 90.5L382.6 87.6L377.5 87.3L373.8 82.3L374.2 79L372.8 76.5L369.9 76.9L365.9 73.6L360.4 71.6L357.8 73.1L354 71.5L350.2 73.7L346.4 72.1L346 69.7L344.7 69.1L326.1 63.8L326.4 60.8L323.4 55.8L321.4 55.9L319.2 58.4L312 55.5L308.7 56.7L304.2 56.3L301.7 58.4L302.1 61.2L288.6 59.9L281.2 61L275.6 64.8L273.9 64.8L267.1 70.4L265.8 73.5L266.6 74.5L266.1 76.6L263.2 79L261.2 78.3L253.2 82.2L239.5 81.2L241.1 88.5L228.8 89.9L200.2 97.2L194.3 96.8L180.2 92.9L168 86L165.8 83.6L163.5 77.7L161 75.6L153.2 72.5L141.9 72.2L136.6 69.3L134.8 64.9L133.6 50.9L125.4 50.9L121.7 52.2L117.7 46.5L114.2 46.5L112.8 43.3L107.4 40.2L107.2 38.2L113.3 36.6L114.7 35.1L114.1 32.6L110.4 30.2L110 28.2L115.6 25.1L106.6 16L92.8 22.7L90.9 25.4L85.4 28.4L84 31L79.7 31.9L72.6 39.4L68.2 38L63.6 40L47.3 35.9L47.4 34.3L44.9 30.9L43.8 31.1L44.2 30.2L40.2 30L39.6 27.2L35.3 22.9L34.3 18.9L32.5 18.7L27.7 14L24.2 16.7L23.1 24.3L20.2 25.2L14.9 24.3L14 25.4Z' +
  'M152.5 340.7L153.4 343.7L162.4 343.6L163.1 340.9L161.8 336.9L157.8 335.1L153.8 336.9L152.5 340.7Z';

type City = { name: string; x: number; y: number; label?: 'above' | 'below' };

const CITIES = {
  tehran: { name: 'تهران', x: 186.3, y: 127.4, label: 'above' },
  mashhad: { name: 'مشهد', x: 378.7, y: 110.6, label: 'below' },
  tabriz: { name: 'تبریز', x: 66.9, y: 61.2, label: 'below' },
  isfahan: { name: 'اصفهان', x: 192.8, y: 211.5, label: 'below' },
  shiraz: { name: 'شیراز', x: 213, y: 296.3, label: 'below' },
  bandarAbbas: { name: 'بندرعباس', x: 300.5, y: 363.1, label: 'below' },
  ahvaz: { name: 'اهواز', x: 122.6, y: 248.5, label: 'below' },
  zahedan: { name: 'زاهدان', x: 408.2, y: 299, label: 'above' },
  kerman: { name: 'کرمان', x: 319.5, y: 277.2 },
  rasht: { name: 'رشت', x: 144, y: 83.3 },
  kermanshah: { name: 'کرمانشاه', x: 85, y: 165.5 },
  bushehr: { name: 'بوشهر', x: 173.4, y: 314.9 },
  yazd: { name: 'یزد', x: 256, y: 232.5 },
  chabahar: { name: 'چابهار', x: 403, y: 415.5 },
  urmia: { name: 'ارومیه', x: 38.5, y: 75.8 },
  sari: { name: 'ساری', x: 225.4, y: 103.1 },
  bojnurd: { name: 'بجنورد', x: 325.4, y: 78 },
  zanjan: { name: 'زنجان', x: 118.1, y: 100.1 },
} satisfies Record<string, City>;

type CityId = keyof typeof CITIES;

const CITY_IDS = Object.keys(CITIES) as CityId[];
const distance = (a: CityId, b: CityId) => Math.hypot(CITIES[a].x - CITIES[b].x, CITIES[a].y - CITIES[b].y);

// a mesh with no centre: every city links to its nearest neighbours, so loads go from anywhere to anywhere
const NEIGHBOURS = 3;
const LINKS: [CityId, CityId][] = (() => {
  const seen = new Set<string>();
  const links: [CityId, CityId][] = [];
  for (const a of CITY_IDS) {
    const nearest = CITY_IDS.filter((b) => b !== a).sort((b, c) => distance(a, b) - distance(a, c)).slice(0, NEIGHBOURS);
    for (const b of nearest) {
      const key = [a, b].sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        links.push([a, b]);
      }
    }
  }
  return links;
})();

// loads on the road right now, spread over the country: a bright dash travels along these
const LIVE: [CityId, CityId][] = [
  ['tabriz', 'zanjan'], ['mashhad', 'bojnurd'], ['isfahan', 'shiraz'], ['ahvaz', 'bushehr'], ['kerman', 'bandarAbbas'],
  ['zahedan', 'chabahar'], ['sari', 'tehran'],
];

// each of these cities pulses in turn: every one is a starting point of its own
const PULSING: CityId[] = ['tabriz', 'mashhad', 'shiraz', 'ahvaz', 'zahedan', 'tehran', 'bandarAbbas', 'isfahan'];
const PULSE_STEP_SECONDS = 0.9;

/** A gentle arc between a and b, bowed to one side so crossing routes stay apart (the same curve either way round). */
function arc(a: CityId, b: CityId): string {
  const [from, to] = a < b ? [CITIES[a], CITIES[b]] : [CITIES[b], CITIES[a]];
  const bow = 0.14;
  const cx = (from.x + to.x) / 2 - (to.y - from.y) * bow;
  const cy = (from.y + to.y) / 2 + (to.x - from.x) * bow;
  return `M${from.x} ${from.y}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${to.x} ${to.y}`;
}

export default function TransportVisual() {
  return (
    <aside className={styles.visual} aria-label="شبکه‌ی حمل بار در سراسر ایران">
      <div className={styles.visualHeading}>
        <span className={styles.eyebrow}>همراه شما، در تمام مسیر</span>
        <h2>
          از هر شهر،
          <br />
          <span>به سراسر ایران.</span>
        </h2>
        <p>بار، راننده و شرکت حمل در یک شبکه؛ از مبدأ تا تحویل.</p>
      </div>
      <div className={styles.map} aria-hidden="true">
        <svg viewBox={VIEW_BOX} className={styles.mapSvg} preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="login-map-glow" cx="40%" cy="30%" r="70%">
              <stop offset="0" stopColor="#F5761A" stopOpacity="0.16" />
              <stop offset="1" stopColor="#F5761A" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path d={IRAN_PATH} className={styles.country} />
          <path d={IRAN_PATH} fill="url(#login-map-glow)" />
          {LINKS.map(([a, b]) => (
            <path key={`${a}-${b}`} d={arc(a, b)} className={styles.route} />
          ))}
          {LIVE.map(([a, b], index) => (
            <path key={`live-${a}-${b}`} d={arc(a, b)} className={styles.liveRoute} style={{ animationDelay: `${index * -1.3}s` }} />
          ))}
          {CITY_IDS.map((id) => {
            const city: City = CITIES[id];
            const pulse = PULSING.indexOf(id);
            return (
              <g key={id}>
                {pulse >= 0 && (
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r="8"
                    className={styles.cityPulse}
                    style={{ animationDelay: `${pulse * PULSE_STEP_SECONDS}s`, animationDuration: `${PULSING.length * PULSE_STEP_SECONDS}s` }}
                  />
                )}
                <circle cx={city.x} cy={city.y} r={city.label ? 4.6 : 3} className={styles.city} />
                {city.label && (
                  <text x={city.x} y={city.label === 'above' ? city.y - 11 : city.y + 19} className={styles.cityLabel}>
                    {city.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <div className={styles.mapChipTop}>
          <Network size={18} />
          <span>۳۱ استان، یک شبکه</span>
        </div>
        <div className={styles.mapChipBottom}>
          <Truck size={18} />
          <span>
            بار تازه
            <strong>تبریز ← بندرعباس</strong>
          </span>
        </div>
      </div>
      <div className={styles.visualFooter}>
        <PackageCheck size={24} />
        <span>
          محموله‌ها، ناوگان و مسیرها
          <br />
          <strong>همه در یک پنل</strong>
        </span>
      </div>
    </aside>
  );
}
