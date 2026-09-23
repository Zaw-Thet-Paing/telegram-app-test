const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();
tg?.setHeaderColor?.('#0f172a');
tg?.setBackgroundColor?.('#07111f');

const elements = {
  products: document.querySelector('#products'),
  loading: document.querySelector('#loading'),
  empty: document.querySelector('#empty'),
  error: document.querySelector('#error'),
  errorMessage: document.querySelector('#error-message'),
  count: document.querySelector('#count'),
  updated: document.querySelector('#updated'),
  search: document.querySelector('#search'),
  refresh: document.querySelector('#refresh'),
  retry: document.querySelector('#retry')
};

let products = [];

const getValue = (item, keys, fallback = '') => {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null) return item[key];
  }
  return fallback;
};

function normalizeProduct(item, index) {
  const price = getValue(item, ['lst_price', 'list_price', 'price', 'sale_price'], 0);
  const stock = getValue(item, ['qty_available', 'stock', 'quantity', 'qty'], null);
  return {
    id: getValue(item, ['id', 'product_id'], index),
    name: String(getValue(item, ['name', 'display_name', 'title'], 'Unnamed product')),
    price: Number(price) || 0,
    stock: stock === null ? null : Number(stock),
    currency: String(getValue(item, ['currency', 'currency_name'], 'MMK')),
    image: getValue(item, ['image_url', 'image', 'thumbnail'], '')
  };
}

function formatPrice(product) {
  return `${new Intl.NumberFormat('en-US').format(product.price)} ${product.currency}`;
}

function productCard(product) {
  const article = document.createElement('article');
  article.className = 'product-card';

  const media = document.createElement('div');
  media.className = 'product-media';
  if (product.image) {
    const image = document.createElement('img');
    image.src = product.image;
    image.alt = '';
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => { media.textContent = '📦'; });
    media.append(image);
  } else {
    media.textContent = '📦';
  }

  const info = document.createElement('div');
  info.className = 'product-info';
  const title = document.createElement('h2');
  title.textContent = product.name;
  const price = document.createElement('p');
  price.className = 'price';
  price.textContent = formatPrice(product);
  const stock = document.createElement('p');
  stock.className = `stock ${product.stock !== null && product.stock <= 0 ? 'out' : ''}`;
  stock.textContent = product.stock === null
    ? 'Stock မဖော်ပြထားပါ'
    : product.stock > 0 ? `လက်ကျန် ${product.stock} ခု` : 'ပစ္စည်းကုန်နေသည်';
  info.append(title, price, stock);
  article.append(media, info);
  return article;
}

function render() {
  const query = elements.search.value.trim().toLocaleLowerCase();
  const visible = products.filter((product) => product.name.toLocaleLowerCase().includes(query));
  elements.products.replaceChildren(...visible.map(productCard));
  elements.products.hidden = visible.length === 0;
  elements.empty.hidden = visible.length !== 0;
  elements.count.textContent = `${visible.length} products`;
}

async function loadProducts() {
  elements.loading.hidden = false;
  elements.loading.style.display = 'grid';
  elements.products.hidden = true;
  elements.empty.hidden = true;
  elements.error.hidden = true;
  elements.count.textContent = 'Loading products…';
  elements.refresh.classList.add('spinning');

  try {
    const response = await fetch('/api/products', { headers: { accept: 'application/json' } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Request failed');
    products = (payload.products || []).map(normalizeProduct);
    elements.updated.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    render();
  } catch (error) {
    elements.error.hidden = false;
    elements.errorMessage.textContent = error.message || 'ခဏနေ ပြန်စမ်းကြည့်ပါ။';
    elements.count.textContent = 'Unable to load products';
  } finally {
    elements.loading.hidden = true;
    elements.loading.style.display = 'none';
    elements.refresh.classList.remove('spinning');
  }
}

elements.search.addEventListener('input', render);
elements.refresh.addEventListener('click', loadProducts);
elements.retry.addEventListener('click', loadProducts);
loadProducts();
