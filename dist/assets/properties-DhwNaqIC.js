import{n as e}from"./properties-Bdv81Ip4.js";var t=`<section class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
  <div class="flex items-end justify-between gap-4">
    <div>
      <p class="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">Properties</p>
      <h1 class="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Featured listings</h1>
    </div>
  </div>
  <div data-properties-grid class="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3"></div>
</section>`;function n(e){return`
    <article class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-lg">
      <p class="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">${e.type}</p>
      <h2 class="mt-3 text-2xl font-semibold text-slate-900">${e.title}</h2>
      <p class="mt-2 text-sm text-slate-500">${e.city}</p>
      <p class="mt-4 text-3xl font-bold text-slate-900">${e.price}</p>
      <dl class="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
        <div><dt class="font-medium text-slate-900">Rooms</dt><dd>${e.rooms}</dd></div>
        <div><dt class="font-medium text-slate-900">Area</dt><dd>${e.area}</dd></div>
      </dl>
      <p class="mt-4 text-sm leading-6 text-slate-600">${e.description}</p>
      <a class="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white" href="/properties/${e.id}">View details</a>
    </article>
  `}function r(){return t}function i(t){let r=t.querySelector(`[data-properties-grid]`);r&&(r.innerHTML=e.map(n).join(``))}export{i as hydrate,r as render};