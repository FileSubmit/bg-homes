import{t as e}from"./properties-Bdv81Ip4.js";var t=`<section class="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
  <div class="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-10">
    <div data-property-details></div>
  </div>
</section>`;function n(e,t){return e?`
    <p class="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">Property ${e.id}</p>
    <h1 class="mt-3 text-4xl font-bold tracking-tight text-slate-900">${e.title}</h1>
    <p class="mt-3 text-lg text-slate-600">${e.city} · ${e.type}</p>
    <div class="mt-8 grid gap-4 sm:grid-cols-3">
      <div class="rounded-2xl bg-slate-50 p-4">
        <p class="text-sm text-slate-500">Price</p>
        <p class="mt-2 text-xl font-semibold text-slate-900">${e.price}</p>
      </div>
      <div class="rounded-2xl bg-slate-50 p-4">
        <p class="text-sm text-slate-500">Rooms</p>
        <p class="mt-2 text-xl font-semibold text-slate-900">${e.rooms}</p>
      </div>
      <div class="rounded-2xl bg-slate-50 p-4">
        <p class="text-sm text-slate-500">Area</p>
        <p class="mt-2 text-xl font-semibold text-slate-900">${e.area}</p>
      </div>
    </div>
    <p class="mt-8 max-w-3xl text-base leading-8 text-slate-600">${e.description}</p>
    <a class="mt-8 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white" href="/properties">Back to properties</a>
  `:`
      <p class="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">Property</p>
      <h1 class="mt-3 text-3xl font-bold tracking-tight text-slate-900">Property ${t} not found</h1>
      <p class="mt-4 text-slate-600">This route is ready for property detail data from Supabase later on.</p>
    `}function r(){return t}function i(t,r){let i=t.querySelector(`[data-property-details]`),a=e(r.id);i&&(i.innerHTML=n(a,r.id))}export{i as hydrate,r as render};