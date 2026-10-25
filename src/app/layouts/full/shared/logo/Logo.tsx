import { FC } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, type AppState } from 'src/app/store';
import trabotIcon from 'src/shared/assets/images/logos/trabot-icon.png';

/** Trabot's mark in the admin sidebar and header: the icon, and the name beside it unless the sidebar is collapsed. */
const Logo: FC = () => {
  const customizer = useSelector((state: AppState) => state.customizer);
  const dark = customizer.activeMode === 'dark';
  return (
    <Link
      to="/dashboards/dashboard"
      aria-label="ترابوت"
      style={{
        height: customizer.TopbarHeight,
        width: customizer.isCollapse ? 40 : 180,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        overflow: 'hidden',
        textDecoration: 'none',
      }}
    >
      <img src={trabotIcon} alt="" width={38} height={38} style={{ borderRadius: 10, flexShrink: 0 }} />
      {!customizer.isCollapse && (
        <span style={{ display: 'grid', lineHeight: 1.25, whiteSpace: 'nowrap' }}>
          <strong style={{ fontSize: 19, fontWeight: 800, color: dark ? '#fff' : '#0E1A3B' }}>ترابوت</strong>
          <span style={{ fontSize: 11, color: dark ? '#A9B3CC' : '#6B7488' }}>دستیار هوشمند حمل‌ونقل</span>
        </span>
      )}
    </Link>
  );
};

export default Logo;
