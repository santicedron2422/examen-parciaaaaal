/* app.js - versión segura, muestra info completa */
const STATE = {
  events: [],
  filtered: [],
  view: 'grid',
  page: 1,
  perPage: 9, // para mostrar todos los eventos sin cortar
  query: '',
  category: '',
  city: '',
  sort: 'date_asc'
};

const SELECTORS = {
  eventsContainer: document.getElementById('eventsContainer'),
  resultsInfo: document.getElementById('resultsInfo'),
  searchInput: document.getElementById('searchInput'),
  categoryFilter: document.getElementById('categoryFilter'),
  cityFilter: document.getElementById('cityFilter'),
  sortSelect: document.getElementById('sortSelect'),
  viewToggle: document.getElementById('viewToggle'),
  pagination: document.getElementById('pagination'),
  detailView: document.getElementById('detailView'),
  catalogView: document.getElementById('catalogView'),
  cartCount: document.getElementById('cartCount'),
  openCartBtn: document.getElementById('openCartBtn'),
  cartDialog: document.getElementById('cartDialog'),
  cartItems: document.getElementById('cartItems'),
  cartSummary: document.getElementById('cartSummary'),
  checkoutForm: document.getElementById('checkoutForm'),
  closeCart: document.getElementById('closeCart'),
  openFavBtn: document.getElementById('openFavBtn')
};

/* localStorage helpers */
const LS = {
  keyCart: 'mvp_cart_v1',
  keyFav: 'mvp_fav_v1',
  loadCart(){ try{return JSON.parse(localStorage.getItem(this.keyCart)||'[]')}catch{return []} },
  saveCart(d){ localStorage.setItem(this.keyCart, JSON.stringify(d)) },
  loadFav(){ try{return JSON.parse(localStorage.getItem(this.keyFav)||'[]')}catch{return []} },
  saveFav(d){ localStorage.setItem(this.keyFav, JSON.stringify(d)) }
};

let CART = LS.loadCart();
let FAV = new Set(LS.loadFav());

/* fetch events.json */
fetch('data/events.json')
  .then(r => r.json())
  .then(data => {
    STATE.events = data.map(e=>({
      ...e,
      datetime: new Date(e.datetime || e.date || e.datetime)
    }));
    populateFilters();
    applyStateFromURL();
    applyFilters();
  })
  .catch(err => { console.warn('No se pudo cargar data/events.json, revisa ruta.'); });

/* populate filters */
function populateFilters(){
  const cats = Array.from(new Set(STATE.events.map(e=>e.category))).sort();
  const cities = Array.from(new Set(STATE.events.map(e=>e.city))).sort();
  SELECTORS.categoryFilter.innerHTML = '<option value="">Todas las categorías</option>'+cats.map(c=>`<option value="${c}">${c}</option>`).join('');
  SELECTORS.cityFilter.innerHTML = '<option value="">Todas las ciudades</option>'+cities.map(c=>`<option value="${c}">${c}</option>`).join('');
}

/* URL state */
function applyStateFromURL(){
  const hash = location.hash.replace('#/catalog?','');
  if(!hash) return;
  const params = new URLSearchParams(hash);
  STATE.query = params.get('query')||'';
  STATE.category = params.get('cat')||'';
  STATE.city = params.get('city')||'';
  STATE.sort = params.get('sort')||STATE.sort;
  STATE.page = parseInt(params.get('page')||STATE.page,10);
  STATE.view = params.get('view')||STATE.view;
  SELECTORS.searchInput.value = STATE.query;
  SELECTORS.categoryFilter.value = STATE.category;
  SELECTORS.cityFilter.value = STATE.city;
  SELECTORS.sortSelect.value = STATE.sort;
  SELECTORS.viewToggle.textContent = STATE.view==='grid'?'Grid':'Lista';
}

function pushStateToURL(){
  const params = new URLSearchParams();
  if(STATE.query) params.set('query', STATE.query);
  if(STATE.category) params.set('cat', STATE.category);
  if(STATE.city) params.set('city', STATE.city);
  if(STATE.sort) params.set('sort', STATE.sort);
  if(STATE.page) params.set('page', STATE.page);
  if(STATE.view) params.set('view', STATE.view);
  location.hash = '/catalog?'+params.toString();
}

/* filtering & sorting */
function applyFilters(){
  let list = STATE.events.slice();
  const q = STATE.query.trim().toLowerCase();
  if(q){
    list = list.filter(e=>(e.title+' '+(e.artists?e.artists.join(' '):'')+' '+e.city).toLowerCase().includes(q));
  }
  if(STATE.category) list = list.filter(e=>e.category===STATE.category);
  if(STATE.city) list = list.filter(e=>e.city===STATE.city);
  if(STATE.sort==='date_asc') list.sort((a,b)=> new Date(a.datetime)-new Date(b.datetime));
  if(STATE.sort==='date_desc') list.sort((a,b)=> new Date(b.datetime)-new Date(a.datetime));
  if(STATE.sort==='price_asc') list.sort((a,b)=> (a.priceFrom||0)-(b.priceFrom||0));
  if(STATE.sort==='price_desc') list.sort((a,b)=> (b.priceFrom||0)-(a.priceFrom||0));
  if(STATE.sort==='pop_desc') list.sort((a,b)=> (b.popularity||0)-(a.popularity||0));
  STATE.filtered = list;
  renderList();
  pushStateToURL();
}

/* render list */
function renderList(){
  SELECTORS.eventsContainer.innerHTML = '';
  if(STATE.filtered.length===0){
    SELECTORS.resultsInfo.textContent = 'No hay resultados. Limpia los filtros.';
    SELECTORS.pagination.innerHTML = '';
    return;
  }
  SELECTORS.resultsInfo.textContent = `Mostrando ${STATE.filtered.length} eventos`;
  STATE.filtered.forEach(ev=>{
    const card = document.createElement('article');
    card.className = 'card';
    card.setAttribute('role','listitem');
    const soldOutLabel = ev.soldOut ? '<span style="color:red;font-weight:700;">[AGOTADO]</span>' : '';
    card.innerHTML = `
      <img alt="Portada ${ev.title}" loading="lazy" src="${ev.image}" onerror="this.style.opacity=0.5">
      <div class="title">${ev.title} ${soldOutLabel}</div>
      <div class="meta">${ev.city} • ${ev.venue||''}</div>
      <div class="meta">${new Date(ev.datetime).toLocaleString()}</div>
      <div class="meta">Edad: ${ev.policies?.age || 'N/A'} | Stock: ${ev.stock || 'N/A'} | Precio: ${ev.currency||''} ${ev.priceFrom||0}</div>
      <p style="font-size:0.9em; margin-top:4px;">${ev.description?.length>120 ? ev.description.slice(0,120)+'...' : ev.description}</p>
      <div style="display:flex;gap:8px;margin-top:6px">
        <button class="btn" data-id="${ev.id}" data-action="view">Ver detalle</button>
        <button class="btn" data-id="${ev.id}" data-action="fav">${FAV.has(ev.id)?'Quitar':'Favorito'}</button>
        <button class="btn" data-id="${ev.id}" data-action="add">Agregar</button>
      </div>`;
    SELECTORS.eventsContainer.appendChild(card);
  });
  renderPagination();
}

function renderPagination(){
  const total = STATE.filtered.length;
  const pages = Math.max(1, Math.ceil(total/STATE.perPage));
  SELECTORS.pagination.innerHTML = '';
  for(let i=1;i<=pages;i++){
    const b = document.createElement('button');
    b.textContent = i;
    if(i===STATE.page) b.disabled = true;
    b.addEventListener('click', ()=>{ STATE.page=i; applyFilters(); });
    SELECTORS.pagination.appendChild(b);
  }
}

/* card actions */
SELECTORS.eventsContainer.addEventListener('click', e=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  if(action==='view') location.hash = '#/event/'+id;
  if(action==='fav') toggleFav(id);
  if(action==='add') addToCart(id,1);
});

/* favorites */
function toggleFav(id){ if(FAV.has(id)) FAV.delete(id); else FAV.add(id); LS.saveFav(Array.from(FAV)); applyFilters(); }

/* cart */
function addToCart(id, qty=1){
  const ev = STATE.events.find(x=>x.id===id);
  if(!ev) return alert('Evento no encontrado');
  if(ev.soldOut) return alert('Evento agotado');
  const entry = CART.find(c=>c.id===id);
  const newQty = (entry?entry.qty:0)+qty;
  if(entry) entry.qty = newQty; else CART.push({id,qty});
  LS.saveCart(CART); updateCartUI(); alert('Añadido al carrito');
}

function updateCartUI(){ SELECTORS.cartCount.textContent = CART.reduce((s,i)=>s+i.qty,0); }
updateCartUI();

/* minimal bindings para búsqueda y filtros */
SELECTORS.searchInput.addEventListener('input', e=>{ STATE.query=e.target.value; STATE.page=1; applyFilters(); });
SELECTORS.categoryFilter.addEventListener('change', e=>{ STATE.category=e.target.value; STATE.page=1; applyFilters(); });
SELECTORS.cityFilter.addEventListener('change', e=>{ STATE.city=e.target.value; STATE.page=1; applyFilters(); });
SELECTORS.sortSelect.addEventListener('change', e=>{ STATE.sort=e.target.value; applyFilters(); });
