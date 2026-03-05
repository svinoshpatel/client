// ─── Constants ───────────────────────────
const CART_KEY    = 'pigShop_cart';
const PRODUCTS_URL = '../products.json';

// ─── State ───────────────────────────────
let allProducts   = [];   // full product list from JSON
let filteredProducts = []; // current filtered view

// ─── DOM References ──────────────────────
const productGrid    = document.getElementById('product-grid');
const cartCountEl    = document.getElementById('cart-count');
const categoryFilter = document.getElementById('category-filter');
const priceSlider    = document.getElementById('price-slider');
const priceDisplay   = document.getElementById('price-display');
const noResults      = document.getElementById('no-results');
const modalOverlay   = document.getElementById('modal-overlay');
const modalContent   = document.getElementById('modal-content');
const modalClose     = document.getElementById('modal-close');
const sidebarToggle  = document.getElementById('sidebar-toggle');
const sidebar        = document.getElementById('sidebar');
const sidebarClose   = document.getElementById('sidebar-close');
const cartBtn        = document.getElementById('cart-btn');
const cartPanel      = document.getElementById('cart-panel');
const cartPanelClose = document.getElementById('cart-panel-close');
const cartItemsList  = document.getElementById('cart-items-list');
const cartTotal      = document.getElementById('cart-total');
const cartEmptyMsg   = document.getElementById('cart-empty-msg');

// ─── Cart Helpers ────────────────────────

/**
 * Load cart array from localStorage.
 * @returns {Array} Cart items
 */
const getCart = () => JSON.parse(localStorage.getItem(CART_KEY) || '[]');

/**
 * Save cart array to localStorage.
 * @param {Array} cart
 */
const saveCart = (cart) => localStorage.setItem(CART_KEY, JSON.stringify(cart));

/**
 * Update the header cart count badge and trigger pop animation.
 */
const updateCartCount = () => {
  const cart  = getCart();
  const total = cart.reduce((sum, item) => sum + item.qty, 0);

  cartCountEl.textContent = total;
  cartCountEl.classList.toggle('hidden', total === 0);

  // Trigger pop animation
  cartCountEl.classList.remove('badge-pop');
  void cartCountEl.offsetWidth; // reflow trick
  cartCountEl.classList.add('badge-pop');
};

/**
 * Add a product to the cart (increment qty if exists).
 * @param {number} productId
 */
const addToCart = (productId) => {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  const cart    = getCart();
  const existing = cart.find(item => item.id === productId);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, qty: 1 });
  }

  saveCart(cart);
  updateCartCount();
  showToast(`🐷 "${product.name}" added to cart!`);
};

/**
 * Remove an item from the cart by id.
 * @param {number} productId
 */
const removeFromCart = (productId) => {
  const cart = getCart().filter(item => item.id !== productId);
  saveCart(cart);
  updateCartCount();
  renderCartPanel();
};

// ─── Toast Notification ──────────────────

/**
 * Display a temporary toast message.
 * @param {string} message
 */
const showToast = (message) => {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-6 right-6 bg-orange-500 text-white px-5 py-3 rounded-xl shadow-lg z-50 text-sm font-medium transition-all duration-300 translate-y-8 opacity-0';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-8', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('translate-y-8', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
};

// ─── Cart Panel ──────────────────────────

/**
 * Render the slide-out cart panel contents.
 */
const renderCartPanel = () => {
  const cart = getCart();

  if (cart.length === 0) {
    cartEmptyMsg.classList.remove('hidden');
    cartItemsList.innerHTML = '';
    cartTotal.textContent = '$0.00';
    return;
  }

  cartEmptyMsg.classList.add('hidden');

  cartItemsList.innerHTML = cart.map(item => `
    <li class="flex items-center gap-3 py-3 border-b border-gray-100">
      <img src="${item.image}" alt="${item.name}" class="w-14 h-14 object-cover rounded-lg flex-shrink-0">
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-gray-800 truncate">${item.name}</p>
        <p class="text-xs text-gray-500">$${item.price.toFixed(2)} × ${item.qty}</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm font-bold text-orange-600">$${(item.price * item.qty).toFixed(2)}</span>
        <button onclick="removeFromCart(${item.id})" class="text-gray-400 hover:text-red-500 transition-colors ml-1" aria-label="Remove">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </li>
  `).join('');

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  cartTotal.textContent = `$${total.toFixed(2)}`;
};

// ─── Intersection Observer ───────────────

/**
 * Set up IntersectionObserver for fade-in-up card animations.
 */
const setupObserver = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('card-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.product-card').forEach(card => observer.observe(card));
};

// ─── Rendering ───────────────────────────

/**
 * Render the badge element for a product card.
 * @param {string|null} badge
 * @returns {string} HTML string
 */
const renderBadge = (badge) => {
  if (!badge) return '';
  const colors = {
    Popular: 'bg-blue-500',
    New:     'bg-green-500',
    Rare:    'bg-purple-600',
    Premium: 'bg-yellow-500',
  };
  const color = colors[badge] || 'bg-gray-500';
  return `<span class="absolute top-3 left-3 ${color} text-white text-xs font-bold px-2 py-1 rounded-full z-10">${badge}</span>`;
};

/**
 * Create a product card HTML element.
 * @param {object} product
 * @param {number} index – for stagger delay
 * @returns {HTMLElement}
 */
const createProductCard = (product, index) => {
  const delayClass = `delay-${(index % 4) + 1}`;
  const article = document.createElement('article');
  article.className = `product-card card-hidden ${delayClass} bg-white rounded-2xl shadow-md overflow-hidden flex flex-col group hover:shadow-xl transition-shadow duration-300`;
  article.setAttribute('data-id', product.id);

  article.innerHTML = `
    <div class="card-img-wrap relative cursor-pointer" data-modal="${product.id}">
      ${renderBadge(product.badge)}
      <img
        src="${product.image}"
        alt="${product.name}"
        class="w-full h-52 object-cover"
        loading="lazy"
        onerror="this.src='https://via.placeholder.com/400x300/fed7aa/9a3412?text=🐷'"
      >
    </div>
    <div class="flex flex-col flex-1 p-5 gap-3">
      <div>
        <span class="text-xs font-semibold text-orange-400 uppercase tracking-wider">${product.category}</span>
        <h2 class="text-lg font-bold text-gray-800 mt-1 cursor-pointer hover:text-orange-500 transition-colors" data-modal="${product.id}">${product.name}</h2>
        <p class="text-sm text-gray-500 mt-1 line-clamp-2">${product.description}</p>
      </div>
      <div class="mt-auto flex items-center justify-between pt-3 border-t border-gray-100">
        <span class="text-2xl font-extrabold text-orange-500">$${product.price.toFixed(2)}</span>
        <button
          class="buy-btn bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2"
          data-id="${product.id}"
          aria-label="Add ${product.name} to cart"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
          Buy
        </button>
      </div>
    </div>
  `;

  return article;
};

/**
 * Render filtered products into the grid.
 */
const renderProducts = () => {
  productGrid.innerHTML = '';

  if (filteredProducts.length === 0) {
    noResults.classList.remove('hidden');
    return;
  }

  noResults.classList.add('hidden');

  filteredProducts.forEach((product, index) => {
    productGrid.appendChild(createProductCard(product, index));
  });

  // Re-attach buy button listeners
  productGrid.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToCart(Number(btn.dataset.id));
    });
  });

  // Re-attach modal triggers
  productGrid.querySelectorAll('[data-modal]').forEach(el => {
    el.addEventListener('click', () => openModal(Number(el.dataset.modal)));
  });

  // Re-run observer for new cards
  setupObserver();
};

// ─── Filters ─────────────────────────────

/**
 * Apply active category and price filters, then re-render.
 */
const applyFilters = () => {
  const selectedCategory = categoryFilter.value;
  const maxPrice = Number(priceSlider.value);

  filteredProducts = allProducts.filter(p => {
    const categoryMatch = selectedCategory === 'all' || p.category === selectedCategory;
    const priceMatch    = p.price <= maxPrice;
    return categoryMatch && priceMatch;
  });

  renderProducts();
};

/**
 * Update price slider label and gradient fill.
 */
const updateSliderUI = () => {
  const max = Number(priceSlider.max);
  const val = Number(priceSlider.value);
  const pct = ((val - Number(priceSlider.min)) / (max - Number(priceSlider.min))) * 100;

  priceDisplay.textContent = `$${val}`;
  priceSlider.style.setProperty('--range-pct', `${pct}%`);
};

// ─── Modal ───────────────────────────────

/**
 * Open product detail modal.
 * @param {number} productId
 */
const openModal = (productId) => {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  modalContent.innerHTML = `
    <div class="md:flex gap-6">
      <div class="card-img-wrap md:w-2/5 flex-shrink-0 rounded-xl overflow-hidden mb-4 md:mb-0">
        <img src="${product.image}" alt="${product.name}" class="w-full h-64 md:h-full object-cover">
      </div>
      <div class="flex flex-col flex-1 gap-3">
        <div>
          <span class="text-xs font-semibold text-orange-400 uppercase tracking-wider">${product.category}</span>
          ${product.badge ? `<span class="ml-2 bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">${product.badge}</span>` : ''}
          <h2 class="text-2xl font-extrabold text-gray-800 mt-1">${product.name}</h2>
        </div>
        <p class="text-gray-600 text-sm leading-relaxed">${product.details}</p>
        <div class="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
          <span class="text-3xl font-extrabold text-orange-500">$${product.price.toFixed(2)}</span>
          <button
            id="modal-buy-btn"
            class="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 flex items-center gap-2"
            data-id="${product.id}"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-buy-btn').addEventListener('click', () => {
    addToCart(Number(product.id));
    closeModal();
  });

  modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    modalOverlay.querySelector('.modal-box').classList.remove('scale-95', 'opacity-0');
  });
};

/**
 * Close the product detail modal.
 */
const closeModal = () => {
  const box = modalOverlay.querySelector('.modal-box');
  box.classList.add('scale-95', 'opacity-0');
  setTimeout(() => {
    modalOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  }, 200);
};

// ─── Sidebar (Mobile) ────────────────────

const openSidebar = () => {
  sidebar.classList.remove('-translate-x-full');
  document.getElementById('sidebar-backdrop').classList.remove('hidden');
};

const closeSidebar = () => {
  sidebar.classList.add('-translate-x-full');
  document.getElementById('sidebar-backdrop').classList.add('hidden');
};

// ─── Cart Panel ──────────────────────────

const openCartPanel = () => {
  renderCartPanel();
  cartPanel.classList.remove('translate-x-full');
  document.getElementById('cart-backdrop').classList.remove('hidden');
};

const closeCartPanel = () => {
  cartPanel.classList.add('translate-x-full');
  document.getElementById('cart-backdrop').classList.add('hidden');
};

// ─── Fetch & Init ─────────────────────────

/**
 * Fetch products from products.json and initialize the page.
 */
const init = async () => {
  try {
    // Show skeleton loaders
    productGrid.innerHTML = Array(4).fill(0).map(() => `
      <div class="skeleton rounded-2xl h-80"></div>
    `).join('');

    const response = await fetch(PRODUCTS_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    allProducts      = await response.json();
    filteredProducts = [...allProducts];

    // Set slider max to the highest product price + buffer
    const maxProductPrice = Math.max(...allProducts.map(p => p.price));
    priceSlider.max   = Math.ceil(maxProductPrice / 50) * 50 + 50;
    priceSlider.value = priceSlider.max;
    updateSliderUI();

    renderProducts();
    updateCartCount();

  } catch (err) {
    productGrid.innerHTML = `
      <div class="col-span-full text-center py-16">
        <p class="text-5xl mb-4">🐷</p>
        <p class="text-gray-500 font-semibold">Could not load products. Make sure <code class="bg-gray-100 px-1 rounded">products.json</code> is available.</p>
        <p class="text-gray-400 text-sm mt-1">${err.message}</p>
      </div>
    `;
    console.error('Failed to load products:', err);
  }
};

// ─── Event Listeners ─────────────────────

categoryFilter.addEventListener('change', applyFilters);

priceSlider.addEventListener('input', () => {
  updateSliderUI();
  applyFilters();
});

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeCartPanel();
    closeSidebar();
  }
});

sidebarToggle.addEventListener('click', openSidebar);
sidebarClose.addEventListener('click', closeSidebar);
document.getElementById('sidebar-backdrop').addEventListener('click', closeSidebar);

cartBtn.addEventListener('click', openCartPanel);
cartPanelClose.addEventListener('click', closeCartPanel);
document.getElementById('cart-backdrop').addEventListener('click', closeCartPanel);

// ─── Boot ─────────────────────────────────
init();
