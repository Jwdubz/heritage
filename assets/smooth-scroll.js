(() => {
  'use strict';

  const TAU_SECONDS = 0.41;
  const root = document.documentElement;
  const optedOut = new URLSearchParams(window.location.search).get('smooth') === 'off';
  let paused = false;
  let lenis = null;

  // Lenis owns easing; native CSS easing must never run underneath it.
  // This is also the explicit native-scroll fallback for ?smooth=off.
  root.style.setProperty('scroll-behavior', 'auto', 'important');

  function cancel() {
    if (!lenis) return;
    lenis.stop();
    if (!paused) lenis.start();
  }

  function resize() {
    cancel();
    lenis?.resize();
  }

  if (!optedOut && typeof window.Lenis === 'function') {
    lenis = new window.Lenis({
      // v1.3.26: damp uses lambda = lerp * 60 and alpha = 1-exp(-lambda*dt).
      // Therefore this is exactly exp(-dt / .41), independent of frame rate.
      // Do not add duration/easing: either would select a different algorithm.
      lerp: 1 / (60 * TAU_SECONDS),
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 1,
      autoRaf: true,
      anchors: false,
      allowNestedScroll: true,
      // Explicit owner-requested desktop timing; no OS settings are changed.
      // Touch stays native, and ?smooth=off provides an explicit opt-out.
      respectReducedMotion: false,
      prevent: node => Boolean(node.closest('dialog[open]')),
      virtualScroll: ({ event }) => {
        if (event.type.startsWith('touch') || event.ctrlKey || event.defaultPrevented || !event.cancelable) {
          cancel();
          return false;
        }
        return true;
      },
    });
  }

  // A minimal app-facing contract; no transforms or artificial scroll wrapper.
  window.HeritageScroll = Object.freeze({
    tau: TAU_SECONDS,
    get enabled() { return Boolean(lenis); },
    get paused() { return paused; },
    pause() { paused = true; lenis?.stop(); },
    resume() { paused = false; lenis?.start(); resize(); },
    resize,
    cancel,
  });
  root.dataset.scrollTau = String(TAU_SECONDS);
  root.dataset.scrollMode = lenis ? 'smooth-wheel' : 'native';

  if (!lenis) return;

  // Native input wins immediately over an outstanding wheel/anchor target.
  window.addEventListener('pointerdown', cancel, { capture: true, passive: true });
  window.addEventListener('touchstart', cancel, { capture: true, passive: true });
  window.addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Tab'].includes(event.key)) cancel();
  }, { capture: true });
  window.addEventListener('hashchange', resize);
  window.addEventListener('popstate', cancel);
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('load', resize, { once: true });
  window.addEventListener('pageshow', resize);
  document.addEventListener('visibilitychange', cancel);
  document.addEventListener('focusin', cancel);
  window.addEventListener('scroll', () => {
    // Lenis writes native scrollY each frame. A different position means that
    // the browser, scrollbar, focus, or other page code has taken control.
    if (lenis.isScrolling === 'smooth' && Math.abs(window.scrollY - lenis.animatedScroll) > 1) cancel();
  }, { passive: true });

  function focusDestination(target) {
    const addedTabIndex = !target.hasAttribute('tabindex');
    if (addedTabIndex) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    if (addedTabIndex) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
  }

  document.addEventListener('click', event => {
    if (paused || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self') || link.closest('dialog[open]')) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || url.search !== window.location.search || !url.hash) return;
    let id;
    try { id = decodeURIComponent(url.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target) return;

    event.preventDefault();
    cancel();
    if (window.location.hash !== url.hash) history.pushState(null, '', url.hash);
    lenis.scrollTo(target, {
      immediate: event.pointerType === 'touch',
      onComplete: () => focusDestination(target),
    });
  });
})();
