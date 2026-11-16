import assert from 'node:assert/strict';
import { test } from 'node:test';
import { animateAccountDetails, setupInvitationMotion } from '../src/motion.ts';

class Style {
 values = new Map();
 setProperty(name, value) { this.values.set(name, value); }
 removeProperty(name) { const previous = this.values.get(name) ?? ''; this.values.delete(name); return previous; }
 getPropertyValue(name) { return this.values.get(name) ?? ''; }
 set overflow(value) { this.setProperty('overflow', value); }
 get overflow() { return this.getPropertyValue('overflow'); }
}
class Classes {
 values = new Set();
 add(...names) { names.forEach(name => this.values.add(name)); }
 remove(...names) { names.forEach(name => this.values.delete(name)); }
 contains(name) { return this.values.has(name); }
}
class ElementDouble extends EventTarget {
 style = new Style();
 classList = new Classes();
 attributes = new Set();
 inert = false;
 height = 0;
 parentElement = null;
 focusCount = 0;
 getBoundingClientRect() { return { height: this.height }; }
 removeAttribute(name) { this.attributes.delete(name); }
 toggleAttribute(name, force) {
  const enabled = force ?? !this.attributes.has(name);
  if (enabled) this.attributes.add(name); else this.attributes.delete(name);
  return enabled;
 }
 hasAttribute(name) { return this.attributes.has(name); }
 focus() { this.focusCount += 1; }
 contains(other) {
  for (let node = other; node; node = node.parentElement) if (node === this) return true;
  return false;
 }
 closest(selector) { return selector === '#home' && this.inHero ? this : null; }
}
class DetailsDouble extends ElementDouble {
 open = false;
 summary = new ElementDouble();
 content = new ElementDouble();
 visualHeight = null;
 animations = [];
 constructor({ open = false, inert = false, animation = true } = {}) {
  super();
  this.open = open;
  this.summary.height = 50;
  this.content.height = 246;
  this.content.inert = inert;
  this.summary.parentElement = this;
  this.content.parentElement = this;
  if (!animation) this.animate = undefined;
 }
 querySelector(selector) { return selector === 'summary' ? this.summary : selector === '.account-list' ? this.content : null; }
 getBoundingClientRect() { return { height: this.visualHeight ?? this.summary.height + (this.open ? this.content.height : 0) }; }
 animate(frames, options) {
  const owner = this;
  const animation = {
   frames, options, onfinish: null, cancelled: false,
   cancel() { this.cancelled = true; owner.visualHeight = null; },
   finish() { this.onfinish?.(); },
  };
  this.animations.push(animation);
  return animation;
 }
 click() {
  const event = new Event('click', { cancelable: true });
  this.summary.dispatchEvent(event);
  return event;
 }
}
class RootDouble extends ElementDouble {
 constructor(nodes = [], details = []) {
  super();
  this.nodes = nodes;
  this.details = details;
  [...nodes, ...details].forEach(node => { node.parentElement = this; });
 }
 querySelectorAll(selector) {
  if (selector === '*') return [...this.nodes, ...this.details];
  if (selector === '.account-group') return this.details;
  if (selector === '.greeting-copy p') return this.nodes;
  return [];
 }
}

function environment({ reduced = false, observer = true } = {}) {
 const names = ['window', 'Element', 'IntersectionObserver', 'clearTimeout'];
 const originals = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
 const preference = new EventTarget();
 preference.matches = reduced;
 preference.change = matches => { preference.matches = matches; preference.dispatchEvent(new Event('change')); };
 const windowDouble = new EventTarget();
 windowDouble.matchMedia = () => preference;
 const timers = new Map();
 let timerId = 1000;
 windowDouble.setTimeout = callback => { const id = ++timerId; timers.set(id, callback); return id; };
 const observers = [];
 class ObserverDouble {
  observed = new Set();
  unobserved = [];
  disconnected = false;
  constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
  observe(node) { this.observed.add(node); }
  unobserve(node) { this.unobserved.push(node); this.observed.delete(node); }
  disconnect() { this.disconnected = true; this.observed.clear(); }
  enter(node) { if (this.observed.has(node)) this.callback([{ target: node, isIntersecting: true }]); }
 }
 const values = { window: windowDouble, Element: ElementDouble, clearTimeout: id => timers.delete(id) };
 if (observer) { values.IntersectionObserver = ObserverDouble; windowDouble.IntersectionObserver = ObserverDouble; }
 else delete globalThis.IntersectionObserver;
 Object.entries(values).forEach(([name, value]) => Object.defineProperty(globalThis, name, { configurable: true, writable: true, value }));
 return {
  window: windowDouble, preference, observers, timers,
  restore() {
   originals.forEach((descriptor, name) => {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
   });
  },
 };
}

function withEnvironment(options, run) {
 const env = environment(options);
 try { run(env); } finally { env.restore(); }
}

function assertSettled(details, open, inert = false) {
 assert.equal(details.open, open);
 assert.equal(details.content.inert, inert);
 assert.equal(details.style.overflow, '');
 assert.equal(details.hasAttribute('data-closing'), false);
}

test('account disclosure measures real content height and keeps closing content inert until settled', () => {
 withEnvironment({}, () => {
  const details = new DetailsDouble();
  const dispose = animateAccountDetails(details);
  assert.equal(details.click().defaultPrevented, true);
  assert.equal(details.open, true);
  assert.equal(details.content.inert, false);
  assert.deepEqual(details.animations[0].frames.map(frame => frame.height), ['50px', '296px']);
  assert.equal(details.style.overflow, 'hidden');
  details.animations[0].finish();
  assertSettled(details, true);

  details.click();
  assert.deepEqual(details.animations[1].frames.map(frame => frame.height), ['296px', '50px']);
  assert.equal(details.open, true, 'native content stays mounted while its height closes');
  assert.equal(details.content.inert, true, 'hidden transfer controls cannot receive focus');
  assert.equal(details.hasAttribute('data-closing'), true);
  details.animations[1].finish();
  assertSettled(details, false);
  assert.equal(details.summary.focusCount, 2);
  dispose();
 });
});

test('rapid taps reverse from the visible height and obsolete completion cannot override the latest direction', () => {
 withEnvironment({}, () => {
  const details = new DetailsDouble();
  const dispose = animateAccountDetails(details);
  details.click();
  const opening = details.animations[0];
  const obsoleteFinish = opening.onfinish;
  details.visualHeight = 137;
  details.click();
  const closing = details.animations[1];
  assert.equal(opening.cancelled, true);
  assert.equal(closing.frames[0].height, '137px', 'sample before cancelling the old animation');
  obsoleteFinish();
  assert.equal(details.content.inert, true);
  assert.equal(details.hasAttribute('data-closing'), true);
  assert.equal(closing.cancelled, false);

  details.visualHeight = 98;
  details.click();
  const reopening = details.animations[2];
  assert.equal(closing.cancelled, true);
  assert.equal(reopening.frames[0].height, '98px');
  assert.equal(details.content.inert, false);
  reopening.finish();
  assertSettled(details, true);
  dispose();
 });
});

test('resize and disposal settle the intended state, restore original inertness, and remove handlers', () => {
 withEnvironment({}, env => {
  const details = new DetailsDouble({ open: true, inert: true });
  const dispose = animateAccountDetails(details);
  details.click();
  env.window.dispatchEvent(new Event('resize'));
  assertSettled(details, false, true);
  assert.equal(details.animations[0].cancelled, true);
  details.click();
  const opening = details.animations[1];
  dispose();
  assert.equal(opening.cancelled, true);
  assertSettled(details, true, true);
  assert.equal(details.click().defaultPrevented, false, 'native summary activation is restored');
  assert.equal(details.animations.length, 2);
  details.open = false;
  env.window.dispatchEvent(new Event('resize'));
  assert.equal(details.open, false, 'disposed resize handler cannot overwrite later native state');

  const native = new DetailsDouble();
  const disposeNative = animateAccountDetails(native);
  native.open = true; // Browser find-in-page or another native disclosure action.
  env.window.dispatchEvent(new Event('resize'));
  assert.equal(native.open, true, 'an idle resize preserves a native open-state change');
  native.click();
  assert.deepEqual(native.animations[0].frames.map(frame => frame.height), ['296px', '50px']);
  native.animations[0].finish();
  assertSettled(native, false);
  native.open = true;
  disposeNative();
  assert.equal(native.open, true, 'idle disposal preserves a native open-state change');
 });
});

test('missing or failing Web Animations leaves an immediately usable native disclosure', () => {
 withEnvironment({}, () => {
  const unsupported = new DetailsDouble({ animation: false });
  const disposeUnsupported = animateAccountDetails(unsupported);
  assert.equal(unsupported.click().defaultPrevented, false);
  assertSettled(unsupported, false);
  disposeUnsupported();

  const failing = new DetailsDouble();
  failing.animate = () => { throw new Error('Animation unavailable'); };
  const disposeFailing = animateAccountDetails(failing);
  failing.click();
  assertSettled(failing, true);
  failing.click();
  assertSettled(failing, false);
  disposeFailing();
 });
});

test('starting with reduced motion leaves native account toggles and visible content intact', () => {
 withEnvironment({ reduced: true }, env => {
  const text = new ElementDouble();
  const details = new DetailsDouble();
  const dispose = setupInvitationMotion(new RootDouble([text], [details]));
  assert.equal(env.observers.length, 0);
  assert.equal(text.classList.contains('rise-reveal'), false);
  assert.equal(details.click().defaultPrevented, false);
  assert.equal(details.animations.length, 0);
  env.preference.change(false);
  assert.equal(text.classList.contains('rise-reveal'), false, 'enabling motion must not hide already readable text');
  dispose();
 });
});

test('without IntersectionObserver no body content is hidden and account toggles still work', () => {
 withEnvironment({ observer: false }, () => {
  const text = new ElementDouble();
  const details = new DetailsDouble();
  const dispose = setupInvitationMotion(new RootDouble([text], [details]));
  assert.equal(text.classList.contains('rise-reveal'), false);
  assert.equal(text.classList.contains('rise-visible'), false);
  details.click();
  assert.equal(details.animations.length, 1);
  details.animations[0].finish();
  assertSettled(details, true);
  dispose();
 });
});

test('preference changes expose pending content, stop motion, and never replay text already made readable', () => {
 withEnvironment({}, env => {
  const first = new ElementDouble();
  const second = new ElementDouble();
  const details = new DetailsDouble();
  const root = new RootDouble([first, second], [details]);
  const dispose = setupInvitationMotion(root);
  const firstObserver = env.observers[0];
  firstObserver.enter(first);
  assert.equal(first.classList.contains('rise-visible'), true);
  assert.equal(second.classList.contains('rise-visible'), false);
  details.click();
  env.preference.change(true);
  assert.equal(firstObserver.disconnected, true);
  [first, second].forEach(node => assert.equal(node.classList.contains('rise-reveal'), false));
  assertSettled(details, true);
  assert.equal(details.click().defaultPrevented, false);
  assert.equal(env.timers.size, 0);

  env.preference.change(false);
  [first, second].forEach(node => assert.equal(node.classList.contains('rise-reveal'), false));
  assert.equal(env.observers.at(-1).observed.size, 0);
  dispose();
  const count = env.observers.length;
  env.preference.change(true);
  env.preference.change(false);
  assert.equal(env.observers.length, count, 'disposed preference listeners do not reinitialize motion');
 });
});

test('revealed groups are observed only once and keyboard focus exposes pending interactive content immediately', () => {
 withEnvironment({}, env => {
  const first = new ElementDouble();
  const second = new ElementDouble();
  const focusTarget = new ElementDouble();
  focusTarget.parentElement = second;
  const root = new RootDouble([first, second]);
  const dispose = setupInvitationMotion(root);
  const observer = env.observers[0];
  observer.enter(first);
  observer.enter(first);
  assert.deepEqual(observer.unobserved, [first]);
  assert.equal(first.classList.contains('rise-visible'), true);
  const focus = new Event('focusin');
  Object.defineProperty(focus, 'target', { value: focusTarget });
  root.dispatchEvent(focus);
  assert.equal(second.classList.contains('rise-visible'), true);
  assert.equal(second.style.getPropertyValue('--reveal-delay'), '0ms');
  assert.equal(observer.observed.size, 0);
  dispose();
  assert.equal(observer.disconnected, true);
  assert.equal(env.timers.size, 0);
  [first, second].forEach(node => {
   assert.equal(node.classList.contains('rise-reveal'), false);
   assert.equal(node.classList.contains('rise-visible'), false);
   assert.equal(node.style.getPropertyValue('--reveal-delay'), '');
  });
 });
});
