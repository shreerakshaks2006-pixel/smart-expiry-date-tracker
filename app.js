/**
 * app.js
 * Smart Expiry Date Tracker – Main Application Logic
 */

// ── State ─────────────────────────────────────────────────────────────────────
let items = [];          // All food items
let activeFilter = 'all';
let activeCategoryFilter = 'all';
let activeSort = 'expiry-asc';
let searchQuery = '';

// ── Persistence ───────────────────────────────────────────────────────────────
const STORAGE_KEY = 'smartExpiryTracker_v1';

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadItems() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    items = stored ? JSON.parse(stored) : [];
  } catch (e) {
    items = [];
  }
}

// ── Date Helpers ──────────────────────────────────────────────────────────────
function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDate(str) {
  // Parse YYYY-MM-DD safely
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysUntilExpiry(expiryDateStr) {
  const exp = parseDate(expiryDateStr);
  const now = today();
  return Math.round((exp - now) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  const d = parseDate(dateStr);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Returns 'fresh' | 'expiring' | 'expired'
 * expiring = within 3 days (or 5 days for frozen items)
 */
function getStatus(item) {
  const days = daysUntilExpiry(item.expiry);
  if (days < 0) return 'expired';
  const threshold = item.storage === 'freezer' ? 7 : 3;
  if (days <= threshold) return 'expiring';
  return 'fresh';
}

function getExpiryLabel(days) {
  if (days < 0)  return `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`;
  if (days === 0) return 'Expires today!';
  if (days === 1) return 'Expires tomorrow!';
  return `Expires in ${days} day${days !== 1 ? 's' : ''}`;
}

// Progress bar: 100% = fully fresh (30+ days), 0% = expired
function getExpiryProgress(days) {
  const maxDays = 30;
  if (days < 0) return 0;
  return Math.min(100, Math.round((days / maxDays) * 100));
}

// ── ID Generation ─────────────────────────────────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Add Item ──────────────────────────────────────────────────────────────────
document.getElementById('add-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const name     = document.getElementById('food-name').value.trim();
  const category = document.getElementById('food-category').value;
  const quantity = parseFloat(document.getElementById('food-quantity').value) || 1;
  const unit     = document.getElementById('food-unit').value;
  const expiry   = document.getElementById('food-expiry').value;
  const storage  = document.getElementById('food-storage').value;
  const notes    = document.getElementById('food-notes').value.trim();

  if (!name || !category || !expiry) return;

  const item = {
    id: generateId(),
    name,
    category,
    quantity,
    unit,
    expiry,
    storage,
    notes,
    addedAt: new Date().toISOString(),
  };

  items.push(item);
  saveItems();
  renderAll();

  // Reset form
  this.reset();
  document.getElementById('food-quantity').value = '1';
  document.getElementById('food-storage').value = 'fridge';
  document.getElementById('food-unit').value = 'pcs';

  showBanner(`✅ "${name}" added to your tracker!`, 'success');
});

// ── Delete Item ───────────────────────────────────────────────────────────────
function deleteItem(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  if (!confirm(`Remove "${item.name}" from your tracker?`)) return;
  items = items.filter(i => i.id !== id);
  saveItems();
  renderAll();
}

// ── Clear All ─────────────────────────────────────────────────────────────────
function clearAllItems() {
  if (items.length === 0) { alert('No items to clear.'); return; }
  if (!confirm(`Remove all ${items.length} item(s) from your tracker? This cannot be undone.`)) return;
  items = [];
  saveItems();
  renderAll();
}

// ── Mark as Used ─────────────────────────────────────────────────────────────
function markUsed(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  items = items.filter(i => i.id !== id);
  saveItems();
  renderAll();
  showBanner(`✅ "${item.name}" marked as used. Great job reducing waste!`, 'success');
}

// ── Edit Item ─────────────────────────────────────────────────────────────────
function openEditModal(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  document.getElementById('edit-id').value       = item.id;
  document.getElementById('edit-name').value     = item.name;
  document.getElementById('edit-category').value = item.category;
  document.getElementById('edit-quantity').value = item.quantity;
  document.getElementById('edit-unit').value     = item.unit;
  document.getElementById('edit-expiry').value   = item.expiry;
  document.getElementById('edit-storage').value  = item.storage;
  document.getElementById('edit-notes').value    = item.notes || '';

  document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
}

document.getElementById('edit-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const id = document.getElementById('edit-id').value;
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return;

  items[idx] = {
    ...items[idx],
    name:     document.getElementById('edit-name').value.trim(),
    category: document.getElementById('edit-category').value,
    quantity: parseFloat(document.getElementById('edit-quantity').value) || 1,
    unit:     document.getElementById('edit-unit').value,
    expiry:   document.getElementById('edit-expiry').value,
    storage:  document.getElementById('edit-storage').value,
    notes:    document.getElementById('edit-notes').value.trim(),
  };

  saveItems();
  renderAll();
  closeEditModal();
  showBanner(`✏️ "${items[idx].name}" updated.`, 'info');
});

// Close modals when clicking backdrop
document.getElementById('edit-modal').addEventListener('click', function (e) {
  if (e.target === this) closeEditModal();
});
document.getElementById('recipe-modal').addEventListener('click', function (e) {
  if (e.target === this) closeRecipeModal();
});

// ── Filtering & Sorting ───────────────────────────────────────────────────────
document.querySelectorAll('.filter-pill').forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    activeFilter = this.dataset.filter;
    renderItemsList();
  });
});

document.getElementById('category-filter').addEventListener('change', function () {
  activeCategoryFilter = this.value;
  renderItemsList();
});

document.getElementById('sort-filter').addEventListener('change', function () {
  activeSort = this.value;
  renderItemsList();
});

document.getElementById('search-input').addEventListener('input', function () {
  searchQuery = this.value.toLowerCase();
  renderItemsList();
});

function getFilteredItems() {
  let filtered = [...items];

  // Status filter
  if (activeFilter !== 'all') {
    filtered = filtered.filter(i => getStatus(i) === activeFilter);
  }

  // Category filter
  if (activeCategoryFilter !== 'all') {
    filtered = filtered.filter(i => i.category === activeCategoryFilter);
  }

  // Search
  if (searchQuery) {
    filtered = filtered.filter(i =>
      i.name.toLowerCase().includes(searchQuery) ||
      (CATEGORY_LABELS[i.category] || '').toLowerCase().includes(searchQuery) ||
      (i.notes || '').toLowerCase().includes(searchQuery)
    );
  }

  // Sort
  filtered.sort((a, b) => {
    switch (activeSort) {
      case 'expiry-asc':   return daysUntilExpiry(a.expiry) - daysUntilExpiry(b.expiry);
      case 'expiry-desc':  return daysUntilExpiry(b.expiry) - daysUntilExpiry(a.expiry);
      case 'name-asc':     return a.name.localeCompare(b.name);
      case 'name-desc':    return b.name.localeCompare(a.name);
      case 'added-desc':   return new Date(b.addedAt) - new Date(a.addedAt);
      default: return 0;
    }
  });

  return filtered;
}

// ── Render: Header Stats ──────────────────────────────────────────────────────
function renderStats() {
  const total    = items.length;
  const expiring = items.filter(i => getStatus(i) === 'expiring').length;
  const expired  = items.filter(i => getStatus(i) === 'expired').length;

  document.getElementById('count-total').textContent    = total;
  document.getElementById('count-expiring').textContent = expiring;
  document.getElementById('count-expired').textContent  = expired;
}

// ── Render: Food Items List ───────────────────────────────────────────────────
function renderItemsList() {
  const container = document.getElementById('items-container');
  const emptyState = document.getElementById('empty-state');
  const countLabel = document.getElementById('items-count-label');
  const filtered = getFilteredItems();

  countLabel.textContent = `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');

    if (items.length > 0) {
      emptyState.querySelector('h3').textContent = 'No items match your filter';
      emptyState.querySelector('p').textContent = 'Try changing the status filter or search query.';
      emptyState.querySelector('.empty-icon').textContent = '🔍';
    } else {
      emptyState.querySelector('h3').textContent = 'No items yet';
      emptyState.querySelector('p').textContent = 'Add your first food item using the form on the left.';
      emptyState.querySelector('.empty-icon').textContent = '🛒';
    }
    return;
  }

  emptyState.classList.add('hidden');

  container.innerHTML = filtered.map(item => {
    const status = getStatus(item);
    const days   = daysUntilExpiry(item.expiry);
    const icon   = CATEGORY_ICONS[item.category] || '📦';
    const label  = CATEGORY_LABELS[item.category] || item.category;
    const progress = getExpiryProgress(days);

    const storageEmojis = { fridge: '🧊', freezer: '❄️', pantry: '🗄️', counter: '🍽️' };
    const storageLabel  = { fridge: 'Fridge', freezer: 'Freezer', pantry: 'Pantry', counter: 'Counter' };

    return `
      <div class="food-card status-${status}" id="card-${item.id}">
        <div class="food-card-icon">${icon}</div>
        <div class="food-card-info">
          <div class="food-card-name" title="${escHtml(item.name)}">${escHtml(item.name)}</div>
          <div class="food-card-meta">
            <span class="meta-tag">${label}</span>
            <span class="meta-tag">${item.quantity} ${item.unit}</span>
            <span class="meta-tag storage">${storageEmojis[item.storage] || ''} ${storageLabel[item.storage] || item.storage}</span>
            ${item.notes ? `<span class="meta-tag" title="${escHtml(item.notes)}">📝 ${escHtml(item.notes.slice(0, 20))}${item.notes.length > 20 ? '…' : ''}</span>` : ''}
          </div>
          <div class="food-card-expiry">
            <span class="expiry-badge ${status}">${getExpiryLabel(days)}</span>
            <span style="color:var(--gray-400); font-size:11px;">${formatDate(item.expiry)}</span>
          </div>
          <div class="expiry-progress">
            <div class="expiry-progress-bar ${status}" style="width: ${progress}%"></div>
          </div>
        </div>
        <div class="food-card-actions">
          <button class="btn btn-sm btn-primary" onclick="markUsed('${item.id}')" title="Mark as used">✓ Used</button>
          <button class="btn btn-sm btn-outline" onclick="openEditModal('${item.id}')" title="Edit item">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deleteItem('${item.id}')" title="Delete item">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

// ── Render: Expiry Alerts ─────────────────────────────────────────────────────
function renderAlerts() {
  const container = document.getElementById('alerts-container');

  const alertItems = items
    .filter(i => getStatus(i) === 'expiring' || getStatus(i) === 'expired')
    .sort((a, b) => daysUntilExpiry(a.expiry) - daysUntilExpiry(b.expiry))
    .slice(0, 8);

  if (alertItems.length === 0) {
    container.innerHTML = '<p class="muted-text">No alerts right now. All fresh! ✅</p>';
    return;
  }

  container.innerHTML = alertItems.map(item => {
    const status = getStatus(item);
    const days   = daysUntilExpiry(item.expiry);
    const icon   = CATEGORY_ICONS[item.category] || '📦';

    return `
      <div class="alert-item ${status}">
        <span class="alert-icon">${status === 'expired' ? '🚨' : '⚠️'}</span>
        <div class="alert-text">
          <strong>${icon} ${escHtml(item.name)}</strong>
          <span>${getExpiryLabel(days)}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ── Render: Recommendations ───────────────────────────────────────────────────
function renderRecommendations() {
  const container = document.getElementById('recommendations-container');
  const subtitle  = document.getElementById('rec-subtitle');

  // Find items that are expiring or expired
  const urgentItems = items.filter(i => {
    const days = daysUntilExpiry(i.expiry);
    return days >= -2 && days <= 5;
  });

  if (urgentItems.length === 0) {
    subtitle.textContent = 'Recipes based on what\'s expiring soon';
    container.innerHTML = '<p class="muted-text">No items expiring soon. Add items to see recipe suggestions.</p>';
    return;
  }

  // Get categories of urgent items
  const urgentCategories = [...new Set(urgentItems.map(i => i.category))];
  const urgentNames = urgentItems.map(i => i.name.toLowerCase());

  // Score each recipe
  const scored = RECIPES.map(recipe => {
    let score = 0;

    // Category match
    recipe.categories.forEach(cat => {
      if (urgentCategories.includes(cat)) score += 2;
    });

    // Keyword match (item name vs recipe keywords)
    urgentNames.forEach(name => {
      recipe.keywords.forEach(kw => {
        if (name.includes(kw) || kw.includes(name.split(' ')[0])) score += 1;
      });
    });

    return { recipe, score };
  });

  const topRecipes = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => s.recipe);

  if (topRecipes.length === 0) {
    container.innerHTML = '<p class="muted-text">No specific recipes found, but check our general tips below.</p>';
    return;
  }

  subtitle.textContent = `${topRecipes.length} recipe${topRecipes.length !== 1 ? 's' : ''} to use your expiring food`;

  container.innerHTML = topRecipes.map(recipe => {
    const isUrgent = recipe.categories.some(cat =>
      items.some(i => i.category === cat && daysUntilExpiry(i.expiry) <= 1)
    );

    const matchingItems = urgentItems
      .filter(i => recipe.categories.includes(i.category))
      .slice(0, 3)
      .map(i => `<span class="recipe-tag ${isUrgent ? 'urgent' : ''}">${escHtml(i.name)}</span>`)
      .join('');

    return `
      <div class="recipe-card" onclick="openRecipeModal('${recipe.id}')">
        <div class="recipe-card-title">${recipe.emoji} ${escHtml(recipe.title)}</div>
        <div class="recipe-card-desc">${escHtml(recipe.description)}</div>
        <div class="recipe-card-tags">
          ${matchingItems}
          <span class="recipe-tag">⏱ ${recipe.prep}</span>
          <span class="recipe-tag">👥 ${recipe.serves}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ── Recipe Modal ──────────────────────────────────────────────────────────────
function openRecipeModal(recipeId) {
  const recipe = RECIPES.find(r => r.id === recipeId);
  if (!recipe) return;

  document.getElementById('recipe-modal-title').textContent = `${recipe.emoji} ${recipe.title}`;

  const body = document.getElementById('recipe-modal-body');
  body.innerHTML = `
    <p style="color:var(--gray-600); margin-bottom:14px; font-size:14px;">${escHtml(recipe.description)}</p>

    <div class="recipe-info-grid">
      <div class="recipe-info-cell">
        <div class="rval">⏱ ${recipe.prep}</div>
        <div class="rlabel">Prep Time</div>
      </div>
      <div class="recipe-info-cell">
        <div class="rval">🔥 ${recipe.cook}</div>
        <div class="rlabel">Cook Time</div>
      </div>
      <div class="recipe-info-cell">
        <div class="rval">👥 ${recipe.serves}</div>
        <div class="rlabel">Serves</div>
      </div>
    </div>

    <h4>🛒 Ingredients</h4>
    <ul>${recipe.ingredients.map(i => `<li>${escHtml(i)}</li>`).join('')}</ul>

    <h4>👨‍🍳 Method</h4>
    <ol>${recipe.steps.map(s => `<li>${escHtml(s)}</li>`).join('')}</ol>

    ${recipe.tip ? `
    <div style="background:var(--yellow-light); border-left:3px solid var(--yellow); border-radius:var(--radius-sm); padding:12px 14px; margin-top:16px;">
      <strong style="font-size:13px;">💡 Tip:</strong>
      <p style="margin:4px 0 0; color:var(--gray-700);">${escHtml(recipe.tip)}</p>
    </div>` : ''}
  `;

  document.getElementById('recipe-modal').classList.remove('hidden');
}

function closeRecipeModal() {
  document.getElementById('recipe-modal').classList.add('hidden');
}

// ── Render: Tips ──────────────────────────────────────────────────────────────
function renderTips() {
  const container = document.getElementById('tips-container');

  // If there are items, show category-specific tips first
  const categoriesInUse = [...new Set(items.map(i => i.category))];

  let tips = [];

  categoriesInUse.forEach(cat => {
    const catTips = STORAGE_TIPS[cat] || [];
    catTips.forEach(t => { if (tips.length < 4) tips.push(t); });
  });

  // Top up with general tips
  for (let i = 0; tips.length < 4 && i < GENERAL_TIPS.length; i++) {
    tips.push(GENERAL_TIPS[i]);
  }

  if (tips.length === 0) {
    container.innerHTML = '<p class="muted-text">Track items to get personalised storage tips.</p>';
    return;
  }

  container.innerHTML = tips.slice(0, 4).map(tip => `
    <div class="tip-item">
      <span class="tip-icon">${tip.icon}</span>
      <span>${escHtml(tip.text)}</span>
    </div>
  `).join('');
}

// ── Notification Banner ───────────────────────────────────────────────────────
function showBanner(message, type = 'info') {
  const banner = document.getElementById('notification-banner');
  const text   = document.getElementById('notification-text');
  text.textContent = message;

  if (type === 'success') {
    banner.style.background = 'linear-gradient(90deg, #22c55e, #16a34a)';
  } else if (type === 'danger') {
    banner.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
  } else {
    banner.style.background = 'linear-gradient(90deg, #3b82f6, #1d4ed8)';
  }

  banner.classList.remove('hidden');

  clearTimeout(window._bannerTimeout);
  window._bannerTimeout = setTimeout(() => closeBanner(), 3500);
}

function closeBanner() {
  document.getElementById('notification-banner').classList.add('hidden');
}

// ── Expiry Check on Load ──────────────────────────────────────────────────────
function checkExpiryOnLoad() {
  const expired  = items.filter(i => getStatus(i) === 'expired');
  const expiring = items.filter(i => getStatus(i) === 'expiring');

  if (expired.length > 0) {
    showBanner(`🚨 ${expired.length} item${expired.length !== 1 ? 's have' : ' has'} expired and should be checked!`, 'danger');
  } else if (expiring.length > 0) {
    showBanner(`⚠️ ${expiring.length} item${expiring.length !== 1 ? 's are' : ' is'} expiring soon. Use them up!`, 'warning');
  }
}

// ── Set min date for expiry input (today) ─────────────────────────────────────
function setMinDate() {
  const today = new Date().toISOString().split('T')[0];
  // We allow past dates for already-expired items, so don't restrict
}

// ── Render All ────────────────────────────────────────────────────────────────
function renderAll() {
  renderStats();
  renderItemsList();
  renderAlerts();
  renderRecommendations();
  renderTips();
}

// ── Escape HTML ───────────────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Sample Data (loaded if no items exist) ────────────────────────────────────
function loadSampleData() {
  const now = new Date();
  const offset = (d) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + d);
    return dt.toISOString().split('T')[0];
  };

  items = [
    { id: generateId(), name: 'Full Cream Milk', category: 'dairy',      quantity: 2,   unit: 'L',      expiry: offset(2),  storage: 'fridge',  notes: 'Opened',    addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Cheddar Cheese',  category: 'dairy',      quantity: 200, unit: 'g',      expiry: offset(5),  storage: 'fridge',  notes: '',          addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Chicken Breast',  category: 'meat',       quantity: 500, unit: 'g',      expiry: offset(1),  storage: 'fridge',  notes: 'Raw',       addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Spinach',         category: 'vegetables', quantity: 1,   unit: 'pack',   expiry: offset(3),  storage: 'fridge',  notes: '',          addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Strawberries',    category: 'fruits',     quantity: 250, unit: 'g',      expiry: offset(2),  storage: 'fridge',  notes: '',          addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Greek Yogurt',    category: 'dairy',      quantity: 500, unit: 'g',      expiry: offset(7),  storage: 'fridge',  notes: '',          addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Sourdough Bread', category: 'grains',     quantity: 1,   unit: 'pcs',    expiry: offset(4),  storage: 'counter', notes: 'Half loaf', addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Salmon Fillet',   category: 'seafood',    quantity: 2,   unit: 'pcs',    expiry: offset(1),  storage: 'fridge',  notes: 'Fresh',     addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Blueberries',     category: 'fruits',     quantity: 150, unit: 'g',      expiry: offset(-1), storage: 'fridge',  notes: '',          addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Orange Juice',    category: 'beverages',  quantity: 1,   unit: 'L',      expiry: offset(10), storage: 'fridge',  notes: 'Opened',    addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Frozen Peas',     category: 'frozen',     quantity: 500, unit: 'g',      expiry: offset(90), storage: 'freezer', notes: '',          addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Leftover Pasta',  category: 'leftovers',  quantity: 2,   unit: 'pcs',    expiry: offset(2),  storage: 'fridge',  notes: 'From last night', addedAt: new Date().toISOString() },
  ];

  saveItems();
}

// ── Init ──────────────────────────────────────────────────────────────────────
(function init() {
  loadItems();

  // Load sample data if the app is empty
  if (items.length === 0) {
    loadSampleData();
  }

  renderAll();
  checkExpiryOnLoad();
})();
