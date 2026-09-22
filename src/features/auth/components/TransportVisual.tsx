import { PackageCheck, Truck, Warehouse, MapPin } from 'lucide-react';
import styles from '../styles/login.module.css';

export default function TransportVisual() {
  return (
    <aside className={styles.visual} aria-label="مدیریت مسیر حمل‌ونقل">
      <div className={styles.visualHeading}>
        <span className={styles.eyebrow}>همراه شما، در تمام مسیر</span>
        <h2>
          هر مسیر،
          <br />
          <span>یک شروع مطمئن.</span>
        </h2>
        <p>از برنامه‌ریزی تا تحویل؛ مدیریت حمل‌ونقل در یک فضای یکپارچه.</p>
      </div>
      <div className={styles.map} aria-hidden="true">
        <svg viewBox="0 0 520 350" fill="none" className={styles.mapSvg}>
          <path
            d="M-20 90 180 210 320 125 540 245M30 -20 175 65 40 145 360 340M310 -30 440 45 240 165 530 335M-30 300 480 0"
            stroke="#36615a"
            strokeWidth="22"
          />
          <path
            d="M-20 90 180 210 320 125 540 245M30 -20 175 65 40 145 360 340M310 -30 440 45 240 165 530 335M-30 300 480 0"
            stroke="#254c46"
            strokeWidth="18"
          />
          <path
            d="M100 260 180 210 320 125 415 180"
            stroke="#b9e8bc"
            strokeWidth="4"
            strokeDasharray="8 9"
            strokeLinecap="round"
          />
          <circle cx="100" cy="260" r="10" fill="#c6f2b9" />
          <circle cx="415" cy="180" r="10" fill="#c6f2b9" />
        </svg>
        <div className={styles.origin}>
          <Warehouse size={22} />
          <span>مبدأ بارگیری</span>
        </div>
        <div className={styles.truck}>
          <Truck size={52} strokeWidth={1.5} />
        </div>
        <div className={styles.destination}>
          <MapPin size={22} />
          <span>مقصد تحویل</span>
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
