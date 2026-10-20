import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { AttributionControl, MapContainer, Marker, Polygon, TileLayer, Tooltip, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import { AF, AM, AZ, IQ, PK, TM, TR } from 'country-flag-icons/string/3x2';
import type { BorderStatus } from './api';
import { crowdFill } from './borderCard';

// Iran in view (and the limit of panning/zooming out: the map is about Iran, not the world).
const IRAN: L.LatLngBoundsExpression = [
  [24.8, 43.6],
  [40.2, 63.6],
];
const PAN_LIMIT: L.LatLngBoundsExpression = [
  [22.5, 40.5],
  [42.5, 66.5],
];
// Everything outside Iran is dimmed: a world-sized ring with Iran cut out of it.
const WORLD: [number, number][] = [
  [-85, -180],
  [-85, 180],
  [85, 180],
  [85, -180],
];
// A chosen crossing is shown this close (its tirparks are within a few dozen km).
const BORDER_ZOOM = 11;
// Zooming in on a crossing and back out to Iran is animated (seconds).
const FLY = { duration: 1.4, easeLinearity: 0.2 };
const LABEL_PX = 12;

// Iran's land neighbours (SVG strings, so a flag can be a Leaflet marker).
const FLAGS: Record<string, string> = { AF, AM, AZ, IQ, PK, TM, TR };
// Flag marker size (px); the chosen one is bigger. The dot on its corner is the queue size (a coloured ring around a
// flag was hard to tell from the flag's own colours).
const FLAG = { w: 30, h: 20, activeW: 40, activeH: 27 };
const DOT = { size: 16, activeSize: 18 };

type Side = 'right' | 'left' | 'top' | 'bottom';
// Where a name is tried next to its marker, in order; the first one that collides with nothing wins.
const SIDES: Side[] = ['right', 'left', 'top', 'bottom'];

interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const overlaps = (a: Box, b: Box) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

function labelBox(side: Side, x: number, y: number, text: string): Box {
  const width = text.length * LABEL_PX * 0.6 + 12;
  const height = LABEL_PX + 10;
  const gapX = FLAG.w / 2 + 6;
  const gapY = FLAG.h / 2 + 4;
  if (side === 'left') return { x1: x - gapX - width, y1: y - height / 2, x2: x - gapX, y2: y + height / 2 };
  if (side === 'top') return { x1: x - width / 2, y1: y - gapY - height, x2: x + width / 2, y2: y - gapY };
  if (side === 'bottom') return { x1: x - width / 2, y1: y + gapY, x2: x + width / 2, y2: y + gapY + height };
  return { x1: x + gapX, y1: y - height / 2, x2: x + gapX + width, y2: y + height / 2 };
}

interface Cluster {
  ids: string[];
  lat: number;
  lng: number;
}

/**
 * Layout at the current zoom, redone on every zoom/pan:
 * - flags that would overlap become one cluster marker (tap: zoom in until they part), busiest crossing kept apart
 *   first and the chosen one never clustered;
 * - names that fit: each on the first side that stays on screen and clears every marker and the names already placed.
 *   The rest are left out until the user zooms in (their flags stay).
 */
function useLayout(borders: BorderStatus[], selectedId: string | null) {
  const map = useMap();
  const [layout, setLayout] = useState<{ sides: Map<string, Side>; clusters: Cluster[] }>({ sides: new Map(), clusters: [] });
  const place = useCallback(() => {
    const size = map.getSize();
    const flagBox = (x: number, y: number): Box => ({ x1: x - FLAG.w / 2 - 4, y1: y - FLAG.h / 2 - 4, x2: x + FLAG.w / 2 + 4, y2: y + FLAG.h / 2 + 4 });
    const points = borders
      .flatMap((status, rank) => {
        const location = status.border.location;
        if (!location) return [];
        const { x, y } = map.latLngToContainerPoint([location.lat, location.lng]);
        return [{ id: status.border.id, x, y, lat: location.lat, lng: location.lng, text: status.border.name, rank: status.border.id === selectedId ? -1 : rank }];
      })
      .sort((a, b) => a.rank - b.rank);

    const groups: (typeof points)[] = [];
    for (const point of points) {
      const box = flagBox(point.x, point.y);
      const group = point.rank >= 0 && groups.find((g) => g[0].rank >= 0 && g.some((member) => overlaps(flagBox(member.x, member.y), box)));
      if (group) group.push(point);
      else groups.push([point]);
    }
    const singles = groups.filter((g) => g.length === 1).map((g) => g[0]);
    const clusters = groups
      .filter((g) => g.length > 1)
      .map((g) => ({ ids: g.map((m) => m.id), lat: g.reduce((sum, m) => sum + m.lat, 0) / g.length, lng: g.reduce((sum, m) => sum + m.lng, 0) / g.length }));

    const markers = [
      ...singles.map((p) => ({ id: p.id, box: flagBox(p.x, p.y) })),
      ...clusters.map((c) => {
        const { x, y } = map.latLngToContainerPoint([c.lat, c.lng]);
        return { id: c.ids.join(), box: { x1: x - 24, y1: y - 24, x2: x + 24, y2: y + 24 } };
      }),
    ];
    const placed: Box[] = [];
    const sides = new Map<string, Side>();
    for (const point of singles) {
      for (const side of SIDES) {
        const box = labelBox(side, point.x, point.y, point.text);
        const onScreen = box.x1 >= 0 && box.y1 >= 0 && box.x2 <= size.x && box.y2 <= size.y;
        if (onScreen && !placed.some((b) => overlaps(b, box)) && !markers.some((m) => m.id !== point.id && overlaps(m.box, box))) {
          placed.push(box);
          sides.set(point.id, side);
          break;
        }
      }
    }
    setLayout({ sides, clusters });
  }, [map, borders, selectedId]);
  useMapEvents({ zoomend: place, moveend: place, resize: place });
  useEffect(place, [place]);
  return layout;
}

// The info panel covers the top of the map: the chosen crossing is put in the lower, visible part.
function borderCenter(map: L.Map, lat: number, lng: number): L.LatLng {
  const point = map.project([lat, lng], BORDER_ZOOM).subtract([0, map.getSize().y * 0.2]);
  return map.unproject(point, BORDER_ZOOM);
}

// Zooming out stops at all of Iran (depends on the size of the map on screen).
function fitIran(map: L.Map, animate: boolean) {
  map.setMinZoom(map.getBoundsZoom(IRAN));
  if (animate) map.flyToBounds(IRAN, FLY);
  else map.fitBounds(IRAN);
}

// Leaflet measures its box once; when the box changes later (CSS arriving, phone rotated, keyboard) it must measure
// again, or the map keeps the old size (wrong zoom, grey strips). The view is re-fitted to the current selection.
// Only a real change of size counts: a ResizeObserver also fires once as soon as it starts watching, and setting the
// view there (without animation) would cut short the fly to a newly chosen crossing — the map would just jump.
function FollowSize({ selected }: { selected: BorderStatus | null }) {
  const map = useMap();
  const location = useRef(selected?.border.location);
  location.current = selected?.border.location;
  useEffect(() => {
    const container = map.getContainer();
    let last = `${container.clientWidth}x${container.clientHeight}`;
    const observer = new ResizeObserver(() => {
      const size = `${container.clientWidth}x${container.clientHeight}`;
      if (size === last || !container.clientHeight) return;
      last = size;
      map.invalidateSize();
      const point = location.current;
      if (point) map.setView(borderCenter(map, point.lat, point.lng), BORDER_ZOOM);
      else fitIran(map, false);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

// Flies to the chosen crossing, or back to the whole country. A map with no size yet (still being laid out) is not
// animated: an animation started at size 0 leaves Leaflet stuck at a fractional zoom; FollowSize sets the view once
// the size is known. `onArrive` fires once the map has come to rest on the chosen crossing (either way).
function FollowSelection({ selected, onArrive }: { selected: BorderStatus | null; onArrive?: (id: string) => void }) {
  const map = useMap();
  const id = selected?.border.id;
  const location = selected?.border.location;
  const arrive = useRef(onArrive);
  arrive.current = onArrive;
  useEffect(() => {
    const arrived = () => id && arrive.current?.(id);
    if (location) map.once('moveend', arrived);
    if (map.getSize().y) {
      if (location) map.flyTo(borderCenter(map, location.lat, location.lng), BORDER_ZOOM, FLY);
      else fitIran(map, true);
    }
    return () => {
      map.off('moveend', arrived);
    };
  }, [map, id, location?.lat, location?.lng]);
  return null;
}

const tirparkIcon = L.divIcon({
  className: '',
  html: '<span style="display:flex;width:20px;height:20px;align-items:center;justify-content:center;border-radius:5px;background:#1E3A8A;color:#fff;font:700 12px sans-serif;box-shadow:0 0 0 2px #fff">P</span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// The country flag, ringed in the queue colour; a plain coloured dot for a country without a flag here.
function flagIcon(countryCode: string, inQueue: number, active: boolean) {
  const [w, h] = active ? [FLAG.activeW, FLAG.activeH] : [FLAG.w, FLAG.h];
  const dot = active ? DOT.activeSize : DOT.size;
  const flag = FLAGS[countryCode.toUpperCase()];
  const inner = flag ? flag.replace('<svg', '<svg width="100%" height="100%" preserveAspectRatio="none"') : '';
  // The dot sits on the flag's top-right corner, half outside it, with a white edge so it reads on any flag or tile.
  return L.divIcon({
    className: '',
    html:
      `<span style="position:relative;display:block;width:${w}px;height:${h}px">` +
      `<span style="display:block;width:100%;height:100%;border-radius:4px;overflow:hidden;background:#E5E7EB;box-shadow:0 0 0 2px #fff,0 2px 6px rgba(0,0,0,.45)">${inner}</span>` +
      `<span class="borders-map-dot" style="position:absolute;top:-${dot / 2}px;right:-${dot / 2}px;width:${dot}px;height:${dot}px;box-sizing:border-box;border-radius:50%;color:${crowdFill(inQueue)};background:currentColor;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.5)"></span>` +
      `</span>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h / 2],
  });
}

// Several crossings too close to tell apart at this zoom: a count, and one dot per crossing in its queue colour
// (busiest first) spread over the top of the circle; tapping zooms in on them.
const CLUSTER = { size: 44, dot: 12, stepDeg: 34 };
function clusterIcon(queues: number[]) {
  const r = CLUSTER.size / 2;
  const dots = [...queues]
    .sort((a, b) => b - a)
    .map((inQueue, i, all) => {
      const angle = ((-90 + (i - (all.length - 1) / 2) * CLUSTER.stepDeg) * Math.PI) / 180;
      const x = r + r * Math.cos(angle) - CLUSTER.dot / 2;
      const y = r + r * Math.sin(angle) - CLUSTER.dot / 2;
      return `<span class="borders-map-dot" style="position:absolute;left:${x}px;top:${y}px;width:${CLUSTER.dot}px;height:${CLUSTER.dot}px;box-sizing:border-box;border-radius:50%;color:${crowdFill(inQueue)};background:currentColor;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.5)"></span>`;
    })
    .join('');
  return L.divIcon({
    className: '',
    html:
      `<span style="position:relative;display:flex;width:${CLUSTER.size}px;height:${CLUSTER.size}px;flex-direction:column;align-items:center;justify-content:center;border-radius:50%;background:#1E3A8A;color:#fff;box-shadow:0 0 0 3px #fff,0 2px 8px rgba(0,0,0,.45);font-family:Vazirmatn,Tahoma,sans-serif;line-height:1.1">` +
      `<b style="font-size:15px">${queues.length.toLocaleString('fa-IR')}</b><span style="font-size:10px">مرز</span>${dots}` +
      `</span>`,
    iconSize: [CLUSTER.size, CLUSTER.size],
    iconAnchor: [CLUSTER.size / 2, CLUSTER.size / 2],
  });
}

const TOOLTIP_OFFSET: Record<Side, [number, number]> = { right: [FLAG.w / 2 + 4, 0], left: [-FLAG.w / 2 - 4, 0], top: [0, -FLAG.h / 2 - 3], bottom: [0, FLAG.h / 2 + 3] };

function Crossings({ borders, selected, onSelect }: { borders: BorderStatus[]; selected: BorderStatus | null; onSelect: (id: string) => void }) {
  const map = useMap();
  const { sides, clusters } = useLayout(borders, selected?.border.id ?? null);
  const clustered = new Set(clusters.flatMap((cluster) => cluster.ids));
  const located = new Map(borders.map((status) => [status.border.id, status.border.location]));
  const queue = new Map(borders.map((status) => [status.border.id, status.totals.inQueue]));
  return (
    <>
      {clusters.map((cluster) => (
        <Marker
          key={cluster.ids.join()}
          position={[cluster.lat, cluster.lng]}
          icon={clusterIcon(cluster.ids.map((id) => queue.get(id) ?? 0))}
          title={`${cluster.ids.length.toLocaleString('fa-IR')} مرز نزدیک هم؛ برای دیدن بزنید`}
          zIndexOffset={500}
          eventHandlers={{
            click: () =>
              map.flyToBounds(
                L.latLngBounds(cluster.ids.flatMap((id) => (located.get(id) ? [[located.get(id)!.lat, located.get(id)!.lng] as [number, number]] : []))),
                { padding: [60, 60], maxZoom: 10, ...FLY },
              ),
          }}
        />
      ))}
      {selected?.tirparks.map((tirpark) => (
        <Marker key={`${tirpark.name}-${tirpark.lat}`} position={[tirpark.lat, tirpark.lng]} icon={tirparkIcon} keyboard={false}>
          <Tooltip permanent direction="right" offset={[10, 0]} className="borders-map-label borders-map-tirpark">
            {tirpark.name}
          </Tooltip>
        </Marker>
      ))}
      {borders.map((status) => {
        const location = status.border.location;
        if (!location || clustered.has(status.border.id)) return null;
        const side = sides.get(status.border.id);
        const active = status.border.id === selected?.border.id;
        return (
          <Marker
            key={status.border.id}
            position={[location.lat, location.lng]}
            icon={flagIcon(status.border.countryCode, status.totals.inQueue, active)}
            title={`${status.border.name} (${status.border.country})`}
            zIndexOffset={active ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(status.border.id) }}
          >
            {/* key: Leaflet keeps a permanent tooltip's direction, so a new side needs a new tooltip */}
            {side && (
              <Tooltip key={side} permanent direction={side} offset={TOOLTIP_OFFSET[side]} className="borders-map-label">
                {status.border.name}
              </Tooltip>
            )}
          </Marker>
        );
      })}
    </>
  );
}

/**
 * «وضعیت مرزها» on an OpenStreetMap map of Iran (outside Iran dimmed, panning kept to the region): every crossing as
 * its country's flag with a dot in the queue colour, named where there is room. Choosing one flies to it and shows its
 * tirparks; `overlay` (the chosen border's info) sits on top of the map; `onArrive` says when the fly there is over.
 */
export function BordersMap({
  borders,
  outline,
  selected,
  onSelect,
  overlay,
  onArrive,
}: {
  borders: BorderStatus[];
  // Iran's outline ([lng, lat] rings); without it the map is just not dimmed outside Iran.
  outline: [number, number][][] | null;
  selected: BorderStatus | null;
  onSelect: (id: string) => void;
  overlay?: ReactNode;
  onArrive?: (id: string) => void;
}) {
  const iran = outline?.map((ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number])) ?? null;
  return (
    // Leaflet lays out its controls for LTR; the labels and the overlay set their own direction.
    // Phone: about as tall as wide (Iran is wider than tall, a tall box only adds sea and neighbours).
    // isolate: Leaflet's panes use z-index up to 1000; kept inside the map so they never cover the sticky header.
    <div dir="ltr" className="tw-relative tw-isolate tw-h-[420px] tw-overflow-hidden tw-rounded-2xl tw-border tw-border-brand-line sm:tw-h-[65vh] sm:tw-min-h-[420px] sm:tw-max-h-[620px]">
      <style>{`
        .borders-map-label { padding: 1px 6px; border: 0; border-radius: 6px; background: rgba(255,255,255,.92); box-shadow: 0 1px 3px rgba(15,23,42,.25);
          color: #0F172A; font: 700 ${LABEL_PX}px Vazirmatn, Tahoma, sans-serif; direction: rtl; }
        .borders-map-label::before { display: none; }
        .borders-map-tirpark { color: #1E3A8A; font-weight: 600; }
        .leaflet-control-attribution.leaflet-control { padding: 0 4px; border-top-left-radius: 6px; background: rgba(255,255,255,.55); font-size: 9px; line-height: 14px; }
        .leaflet-control-attribution a { color: #475569; }
        .borders-map-dot { animation: borders-map-blink 1.6s ease-in-out infinite; }
        /* resting = the dot's own colour; the blink brightens it, a little bigger with a glow of the same colour */
        @keyframes borders-map-blink {
          0%, 100% { filter: none; transform: scale(1); box-shadow: 0 1px 3px rgba(0,0,0,.5); }
          50% { filter: brightness(1.35) saturate(1.3); transform: scale(1.2); box-shadow: 0 1px 3px rgba(0,0,0,.5), 0 0 10px 3px currentColor; }
        }
        @media (prefers-reduced-motion: reduce) { .borders-map-dot { animation: none; } }
      `}</style>
      {/* zoomSnap 0.25: Iran fills the frame on a phone too, instead of jumping a whole zoom level out */}
      <MapContainer bounds={IRAN} maxBounds={PAN_LIMIT} maxBoundsViscosity={1} zoomSnap={0.25} zoomDelta={0.5} className="tw-h-full tw-w-full" zoomControl={false} scrollWheelZoom attributionControl={false}>
        {/* «Leaflet» left out (optional); «© OpenStreetMap» must stay: it is the condition for using its map tiles */}
        <AttributionControl prefix={false} />
        {/* top-right: over Uzbekistan, where no crossing is; the bottom-left is under the AI button pinned to the screen,
            the top-left has the north-west crossings and the bottom-right the Rimdan and Pishin crossings */}
        <ZoomControl position="topright" />
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={18} attribution='<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>' />
        {iran && (
          <>
            <Polygon positions={[WORLD, ...iran]} interactive={false} pathOptions={{ stroke: false, fillColor: '#0F172A', fillOpacity: 0.35 }} />
            <Polygon positions={iran} interactive={false} pathOptions={{ color: '#1E3A8A', weight: 2, fill: false }} />
          </>
        )}
        <Crossings borders={borders} selected={selected} onSelect={onSelect} />
        <FollowSelection selected={selected} onArrive={onArrive} />
        <FollowSize selected={selected} />
      </MapContainer>
      {overlay && (
        // flex column: the overlay scrolls its own body and keeps its buttons in view (see SelectedBorder)
        <div dir="rtl" className="tw-absolute tw-inset-x-2 tw-top-2 tw-z-[1000] tw-flex tw-max-h-[75%] tw-flex-col tw-rounded-2xl sm:tw-inset-x-auto sm:tw-right-3 sm:tw-w-[420px]">
          {overlay}
        </div>
      )}
    </div>
  );
}
