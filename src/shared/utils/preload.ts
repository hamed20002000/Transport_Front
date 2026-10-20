// Fetches page chunks in the background, one after another and only once the current page has loaded and the
// browser is idle, so they never compete with what the user is waiting for (on a slow link that is everything).
export function preloadWhenIdle(loaders: Array<() => Promise<unknown>>) {
  // Safari has no requestIdleCallback.
  const idle = (run: () => void) =>
    typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(run, { timeout: 5000 }) : setTimeout(run, 2000);
  const next = (index: number) => {
    if (index >= loaders.length) return;
    idle(() => {
      loaders[index]()
        .catch(() => undefined)
        .finally(() => next(index + 1));
    });
  };
  const start = () => window.setTimeout(() => next(0), 3000);
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}
