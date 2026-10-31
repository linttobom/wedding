import {createRoot} from "react-dom/client";
import App from "./App";
import "./generated/fonts.css";
import "./style.css";
createRoot(document.getElementById("root")!).render(<App/>);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
 const base = new URL(import.meta.env.BASE_URL, document.baseURI);
 const firstVisit = !navigator.serviceWorker.controller;
 void navigator.serviceWorker.register(new URL('sw.js', base), {
  scope: base.pathname, updateViaCache: 'none',
 }).then(async () => {
  if (!firstVisit) return;
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) {
   await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, {once: true}));
  }
  if (document.readyState !== 'complete') {
   await new Promise(resolve => window.addEventListener('load', resolve, {once: true}));
  }
  const assets = new URL('assets/', base).href;
  for (const entry of performance.getEntriesByType('resource')) {
   if (entry.name.startsWith(assets) && /\.(png|jpe?g|webp|avif|woff2?)(\?|$)/i.test(entry.name)) {
    void fetch(entry.name).catch(() => {});
   }
  }
 }).catch(() => {});
}
