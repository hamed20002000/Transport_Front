import { useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

// Smooth page scrolling (Lenis) while mounted. Touch keeps the phone's own scrolling, which is already smooth;
// boxes that scroll on their own (dialogs, the map's info panel) keep theirs, and the map keeps the wheel for zooming.
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({
      autoRaf: true,
      allowNestedScroll: true,
      prevent: (node) => !!node.closest?.('.leaflet-container'),
    });
    return () => lenis.destroy();
  }, []);
  return null;
}
