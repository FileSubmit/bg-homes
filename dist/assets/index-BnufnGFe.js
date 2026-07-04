const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/properties-DhwNaqIC.js","assets/properties-Bdv81Ip4.js","assets/property-details-CwKHrvm0.js"])))=>i.map(i=>d[i]);
(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=`modulepreload`,t=function(e){return`/`+e},n={},r=function(r,i,a){let o=Promise.resolve();if(i&&i.length>0){let r=document.getElementsByTagName(`link`),s=document.querySelector(`meta[property=csp-nonce]`),c=s?.nonce||s?.getAttribute(`nonce`);function l(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}function u(e){return import.meta.resolve?import.meta.resolve(e):new URL(e,new URL(`../../../src/node/plugins/importAnalysisBuild.ts`,import.meta.url)).href}o=l(i.map(i=>{if(i=t(i,a),i=u(i),i in n)return;n[i]=!0;let o=i.endsWith(`.css`);for(let e=r.length-1;e>=0;e--){let t=r[e];if(t.href===i&&(!o||t.rel===`stylesheet`))return}let s=document.createElement(`link`);if(s.rel=o?`stylesheet`:e,o||(s.as=`script`),s.crossOrigin=``,s.href=i,c&&s.setAttribute(`nonce`,c),document.head.appendChild(s),o)return new Promise((e,t)=>{s.addEventListener(`load`,e),s.addEventListener(`error`,()=>t(Error(`Unable to preload CSS for ${i}`)))})}))}function s(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return o.then(e=>{for(let t of e||[])t.status===`rejected`&&s(t.reason);return r().catch(s)})},i=[{title:`Home`,test:e=>e===`/`,load:()=>r(()=>import(`./home-9hfXGOlv.js`),[])},{title:`Login`,test:e=>e===`/login`,load:()=>r(()=>import(`./login-Cpb0PNKi.js`),[])},{title:`Register`,test:e=>e===`/register`,load:()=>r(()=>import(`./register-DZtDL0xX.js`),[])},{title:`Properties`,test:e=>e===`/properties`,load:()=>r(()=>import(`./properties-DhwNaqIC.js`),__vite__mapDeps([0,1]))},{title:`Property details`,test:e=>/^\/properties\/[^/]+$/.test(e),load:()=>r(()=>import(`./property-details-CwKHrvm0.js`),__vite__mapDeps([2,1]))},{title:`Admin`,test:e=>e===`/admin`,load:()=>r(()=>import(`./admin-CfbG5lBs.js`),[])}],a={title:`Page not found`,load:()=>r(()=>import(`./not-found-QjgHXvmL.js`),[])};function o(e){return i.find(t=>t.test(e))??a}function s(e){let t=e.match(/^\/properties\/([^/]+)$/);return t?{id:t[1]}:{}}async function c(e,t){if(!e)return;let n=window.location.pathname,r=o(n),i=s(n),a=await r.load();e.innerHTML=await a.render(i),document.title=`${r.title} | BG Homes`,typeof a.hydrate==`function`&&a.hydrate(e,i),t?.({pathname:n,route:r.title,params:i})}function l({pageSlot:e,onRouteChange:t}){let n=async n=>{n!==window.location.pathname&&(window.history.pushState({},``,n),await c(e,t))};document.addEventListener(`click`,e=>{let t=e.target.closest(`a[href]`);if(!t)return;let r=new URL(t.href,window.location.origin);r.origin===window.location.origin&&(t.hasAttribute(`download`)||t.target===`_blank`||(e.preventDefault(),n(r.pathname)))}),window.addEventListener(`popstate`,()=>{c(e,t)}),c(e,t)}var u=`<footer class="border-t border-slate-200 bg-white">
  <div class="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
    <p>&copy; <span data-footer-year></span> BG Homes. All rights reserved.</p>
    <p>Built with Vite, Vanilla JavaScript, and Tailwind CSS.</p>
  </div>
</footer>`;function d(){return u}function f(e){let t=e.querySelector(`[data-footer-year]`);t&&(t.textContent=String(new Date().getFullYear()))}var p=`<header class="border-b border-slate-200 bg-white/90 backdrop-blur">
  <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
    <a href="/" class="text-lg font-semibold tracking-tight text-slate-900">BG Homes</a>
    <button
      type="button"
      data-menu-toggle
      class="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 md:hidden"
      aria-expanded="false"
      aria-controls="primary-nav"
    >
      Menu
    </button>
    <nav id="primary-nav" data-nav-menu class="hidden md:block">
      <ul class="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
        <li><a data-nav-link href="/" class="text-sm font-medium text-slate-600 transition hover:text-slate-900">Home</a></li>
        <li><a data-nav-link href="/properties" class="text-sm font-medium text-slate-600 transition hover:text-slate-900">Properties</a></li>
        <li><a data-nav-link href="/login" class="text-sm font-medium text-slate-600 transition hover:text-slate-900">Login</a></li>
        <li><a data-nav-link href="/register" class="text-sm font-medium text-slate-600 transition hover:text-slate-900">Register</a></li>
        <li><a data-nav-link href="/admin" class="text-sm font-medium text-slate-600 transition hover:text-slate-900">Admin</a></li>
      </ul>
    </nav>
  </div>
</header>`;function m(){return p}function h(e){let t=e.querySelector(`[data-menu-toggle]`),n=e.querySelector(`[data-nav-menu]`);t&&n&&t.addEventListener(`click`,()=>{let e=n.classList.toggle(`hidden`);t.setAttribute(`aria-expanded`,String(!e))}),g(window.location.pathname)}function g(e){document.querySelectorAll(`[data-nav-link]`).forEach(t=>{let n=t.getAttribute(`href`)===e||e.startsWith(`/properties/`)&&t.getAttribute(`href`)===`/properties`;t.classList.toggle(`text-slate-900`,n),t.classList.toggle(`text-slate-600`,!n),t.classList.toggle(`font-semibold`,n),t.setAttribute(`aria-current`,n?`page`:`false`)})}function _(){let e=document.querySelector(`#app`);if(!e)return;e.innerHTML=`
    <div class="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <div data-header-slot></div>
      <main data-page-slot class="flex-1"></main>
      <div data-footer-slot></div>
    </div>
  `;let t=e.querySelector(`[data-header-slot]`),n=e.querySelector(`[data-page-slot]`),r=e.querySelector(`[data-footer-slot]`);t&&(t.innerHTML=m(),h(t)),r&&(r.innerHTML=d(),f(r)),l({pageSlot:n,onRouteChange:({pathname:e})=>g(e)})}_();