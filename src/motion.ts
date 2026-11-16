const easing = 'cubic-bezier(.22,1,.36,1)';

// Keep native details semantics and keyboard activation. Closing waits for the
// measured-height animation, so it works without a fixed maximum card height.
export function animateAccountDetails(details: HTMLDetailsElement) {
 const summary = details.querySelector('summary');
 const content = details.querySelector<HTMLElement>('.account-list');
 if (!summary || !content || typeof details.animate !== 'function') return () => {};
 let animation: Animation | null = null;
 let expanded = details.open;
 const wasInert = content.inert;

 const cancel = () => {
  if (!animation) return;
  animation.onfinish = null;
  animation.cancel();
  animation = null;
 };
 const settle = () => {
  cancel();
  details.open = expanded;
  details.style.removeProperty('overflow');
  details.removeAttribute('data-closing');
  content.inert = wasInert;
 };
 const toggle = (event: Event) => {
  event.preventDefault();
  summary.focus({preventScroll: true});
  if (!animation) expanded = details.open;
  // Sample before canceling, so a rapid second tap reverses from the visible
  // height instead of snapping back to either end of the previous animation.
  const from = details.getBoundingClientRect().height;
  cancel();
  expanded = !expanded;
  details.open = true;
  details.toggleAttribute('data-closing', !expanded);
  content.inert = !expanded || wasInert;
  details.style.overflow = 'hidden';
  const to = summary.getBoundingClientRect().height + (expanded ? content.getBoundingClientRect().height : 0);
  try {
   const next = details.animate([{height: `${from}px`}, {height: `${to}px`}], {
    duration: expanded ? 420 : 320, easing, fill: 'both',
   });
   animation = next;
   next.onfinish = () => {if (animation === next) settle()};
  } catch {
   // Content remains usable when a browser cannot create the animation.
   settle();
  }
 };
 const resized = () => {if (animation) settle()};
 summary.addEventListener('click', toggle);
 window.addEventListener('resize', resized);
 return () => {
  summary.removeEventListener('click', toggle);
  window.removeEventListener('resize', resized);
  if (animation) settle();
 };
}

function revealInvitation(root: HTMLElement, seen: WeakSet<HTMLElement>) {
 if (!('IntersectionObserver' in window)) return () => {};
 // Reveal short reading/photo groups independently; gallery delays restart
 // each row rather than making the last of 21 photos wait several seconds.
 const groups: [string, number, number?][] = [
  ['.hero-names, .hero-title, .hero-details', 120],
  ['.timer', 0],
  ['.greeting-copy p', 100],
  ['.greeting-divider', 0],
  ['.parents p', 100],
  ['.greeting-photo', 0],
  ['.calendar-section h2, .calendar-date, .calendar', 100],
  ['.location-section h2, .venue, .address', 100],
  ['.map, .map-buttons', 100],
  ['.directions article', 0],
  ['.video-heart, .wedding-video', 100],
  ['.gallery-section h2, .gallery-section .subtitle', 100],
  ['.gallery-grid > button', 100, 3],
  ['.accounts-section h2, .accounts-section .subtitle, .account-groups', 100],
  ['.attendance-photo, .share-trigger', 0],
  ['footer > *', 100],
 ];
 const nodes: HTMLElement[] = [];
 const visible = (node: HTMLElement) => {
  seen.add(node);
  node.classList.add('rise-visible');
  observer.unobserve(node);
 };
 const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {if (entry.isIntersecting) visible(entry.target as HTMLElement)});
 }, {threshold: .08, rootMargin: '0px 0px -12% 0px'});
 const hero: HTMLElement[] = [];
 groups.forEach(([selector, interval, columns]) => {
  root.querySelectorAll<HTMLElement>(selector).forEach((node, index) => {
   if (seen.has(node)) return;
   nodes.push(node);
   node.style.setProperty('--reveal-delay', `${(columns ? index % columns : index) * interval}ms`);
   node.classList.add('rise-reveal');
   if (node.closest('#home')) hero.push(node);
   else observer.observe(node);
  });
 });
 // Match the existing opening message; don't reveal its text behind the dim.
 const timer = window.setTimeout(() => hero.forEach(node => observer.observe(node)), 3200);
 const focus = (event: Event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  nodes.filter(node => node.contains(target)).forEach(node => {
   node.style.setProperty('--reveal-delay', '0ms');
   visible(node);
  });
 };
 root.addEventListener('focusin', focus);
 return () => {
  clearTimeout(timer);
  observer.disconnect();
  root.removeEventListener('focusin', focus);
  nodes.forEach(node => {
   node.classList.remove('rise-reveal', 'rise-visible');
   node.style.removeProperty('--reveal-delay');
  });
 };
}

export function setupInvitationMotion(root: HTMLElement) {
 const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
 const seen = new WeakSet<HTMLElement>();
 let cleanup: (() => void)[] = [];
 const apply = () => {
  cleanup.forEach(dispose => dispose());
  cleanup = [];
  if (preference.matches) {
   // Everything is immediately visible in reduced motion mode. Enabling motion
   // later must not hide content that the guest has already been able to read.
   root.querySelectorAll<HTMLElement>('*').forEach(node => seen.add(node));
   return;
  }
  cleanup = [revealInvitation(root, seen), ...Array.from(root.querySelectorAll<HTMLDetailsElement>('.account-group'), animateAccountDetails)];
 };
 apply();
 preference.addEventListener('change', apply);
 return () => {
  preference.removeEventListener('change', apply);
  cleanup.forEach(dispose => dispose());
 };
}
