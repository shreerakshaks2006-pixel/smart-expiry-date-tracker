/**
 * grocery.js
 * Grocery List feature — add, check off, delete, persist, suggestions.
 */

// ── State ─────────────────────────────────────────────────────────────────────
let groceryItems = [];
const GROCERY_KEY = 'smartExpiryGrocery_v1';

// ── Persistence ───────────────────────────────────────────────────────────────
function saveGrocery() {
  localStorage.setItem(GROCERY_KEY, JSON.stringify(groceryItems));
}

function loadGrocery() {
  try {
    const stored = localStorage.getItem(GROCERY_KEY);
    groceryItems = stored ? JSON.parse(stored) : [];
  } catch (e) {
    groceryItems = [];
  }
}

// ── Page Switcher ─────────────────────────────────────────────────────────────
function switchPage(page) {
  document.getElementById('page-tracker').classList.toggle('hidden', page !== 'tracker');
  document.getElementById('page-groceries').classList.toggle('hidden', page !== 'groceries');

  document.querySelectorAll('.page-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.page === page);
  });

  if (page === 'groceries') renderGroceryAll();
}

// ── Add Grocery Item ──────────────────────────────────────────────────────────
document.getElementById('grocery-add-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const name     = document.getElementById('grocery-name').value.trim();
  const category = document.getElementById('grocery-category').value;
  const quantity = parseInt(document.getElementById('grocery-quantity').value) || 1;
  const unit     = document.getElementById('grocery-unit').value;
  const notes    = document.getElementById('grocery-notes').value.trim();

  if (!name) return;

  // Prevent exact duplicates (same name, not yet bought)
  const exists = groceryItems.some(
    g => g.name.toLowerCase() === name.toLowerCase() && !g.bought
  );
  if (exists) {
    showBanner(`"${name}" is already on your list!`, 'info');
    return;
  }

  groceryItems.push({
    id:       generateId(),
    name,
    category,
    quantity,
    unit,
    notes,
    bought:   false,
    addedAt:  new Date().toISOString(),
  });

  saveGrocery();
  renderGroceryAll();

  // Reset form
  this.reset();
  document.getElementById('grocery-quantity').value = '1';
  document.getElementById('grocery-unit').value = 'pcs';

  showBanner(`🛒 "${name}" added to your grocery list!`, 'success');
});

// ── Toggle Bought ─────────────────────────────────────────────────────────────
function toggleBought(id) {
  const item = groceryItems.find(g => g.id === id);
  if (!item) return;
  item.bought = !item.bought;
  saveGrocery();
  renderGroceryAll();
}

// ── Delete Grocery Item ───────────────────────────────────────────────────────
function deleteGroceryItem(id) {
  groceryItems = groceryItems.filter(g => g.id !== id);
  saveGrocery();
  renderGroceryAll();
}

// ── Clear Bought Items ────────────────────────────────────────────────────────
function clearBoughtItems() {
  const count = groceryItems.filter(g => g.bought).length;
  if (count === 0) { showBanner('No bought items to remove.', 'info'); return; }
  groceryItems = groceryItems.filter(g => !g.bought);
  saveGrocery();
  renderGroceryAll();
  showBanner(`✅ Removed ${count} bought item${count !== 1 ? 's' : ''}.`, 'success');
}

// ── Clear All Groceries ───────────────────────────────────────────────────────
function clearAllGroceries() {
  if (groceryItems.length === 0) { showBanner('Your grocery list is already empty.', 'info'); return; }
  if (!confirm(`Clear all ${groceryItems.length} item(s) from your grocery list?`)) return;
  groceryItems = [];
  saveGrocery();
  renderGroceryAll();
}

// ── Add Suggestion to List ────────────────────────────────────────────────────
function addSuggestionToList(name, category) {
  const exists = groceryItems.some(
    g => g.name.toLowerCase() === name.toLowerCase() && !g.bought
  );
  if (exists) {
    showBanner(`"${name}" is already on your list!`, 'info');
    return;
  }

  groceryItems.push({
    id:       generateId(),
    name,
    category,
    quantity: 1,
    unit:     'pcs',
    notes:    'Suggested restock',
    bought:   false,
    addedAt:  new Date().toISOString(),
  });

  saveGrocery();
  renderGroceryAll();
  showBanner(`🛒 "${name}" added to your grocery list!`, 'success');
}

// ── Render: Grocery List ──────────────────────────────────────────────────────
function renderGroceryList() {
  const container  = document.getElementById('grocery-container');
  const emptyState = document.getElementById('grocery-empty-state');
  const countLabel = document.getElementById('grocery-count-label');

  // Sort: unbought first, then bought; within each group sort by category then name
  const sorted = [...groceryItems].sort((a, b) => {
    if (a.bought !== b.bought) return a.bought ? 1 : -1;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  const total  = groceryItems.length;
  const bought = groceryItems.filter(g => g.bought).length;

  countLabel.textContent = `${total} item${total !== 1 ? 's' : ''}`;

  // Progress bar
  const progressWrap = document.getElementById('grocery-progress-wrap');
  const progressBar  = document.getElementById('grocery-progress-bar');
  const progressLbl  = document.getElementById('grocery-progress-label');

  if (total > 0) {
    progressWrap.classList.remove('hidden');
    const pct = Math.round((bought / total) * 100);
    progressBar.style.width = pct + '%';
    progressLbl.textContent = `${bought} / ${total} bought`;
  } else {
    progressWrap.classList.add('hidden');
  }

  if (sorted.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  // Group by category for section headers
  let lastCategory = null;
  container.innerHTML = sorted.map(item => {
    const icon  = CATEGORY_ICONS[item.category] || '📦';
    const label = CATEGORY_LABELS[item.category] || item.category;

    let header = '';
    if (item.category !== lastCategory && !item.bought) {
      lastCategory = item.category;
      header = `<div class="category-header">${icon} ${label}</div>`;
    }

    return `
      ${header}
      <div class="grocery-item${item.bought ? ' bought' : ''}" id="grocery-card-${item.id}">
        <div class="grocery-check${item.bought ? ' checked' : ''}" onclick="toggleBought('${item.id}')" title="${item.bought ? 'Mark as not bought' : 'Mark as bought'}">
          ${item.bought ? '✓' : ''}
        </div>
        <div class="grocery-item-icon">${icon}</div>
        <div class="grocery-item-info">
          <div class="grocery-item-name">${escHtml(item.name)}</div>
          <div class="grocery-item-meta">
            <span class="meta-tag">${item.quantity} ${item.unit}</span>
            <span class="meta-tag">${label}</span>
            ${item.notes ? `<span class="meta-tag" title="${escHtml(item.notes)}">📝 ${escHtml(item.notes.slice(0, 22))}${item.notes.length > 22 ? '…' : ''}</span>` : ''}
          </div>
        </div>
        <div class="grocery-item-actions">
          <button class="btn btn-sm btn-danger" onclick="deleteGroceryItem('${item.id}')" title="Remove">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

// ── Render: Suggestions from Tracker ─────────────────────────────────────────
function renderGrocerySuggestions() {
  const container = document.getElementById('grocery-suggestions-container');

  // Pull items from the food tracker that are expiring (≤3 days) or already expired
  const expiring = items.filter(i => {
    const days = daysUntilExpiry(i.expiry);
    return days <= 3;
  });

  if (expiring.length === 0) {
    container.innerHTML = '<p class="muted-text">Nothing expiring soon — your tracker looks good!</p>';
    return;
  }

  // Sort: expired first, then by soonest expiry
  const sorted = [...expiring].sort((a, b) => daysUntilExpiry(a.expiry) - daysUntilExpiry(b.expiry));

  container.innerHTML = sorted.map(item => {
    const days    = daysUntilExpiry(item.expiry);
    const icon    = CATEGORY_ICONS[item.category] || '📦';
    const isExp   = days < 0;
    const subText = isExp
      ? `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`
      : days === 0 ? 'Expires today!'
      : `Expires in ${days} day${days !== 1 ? 's' : ''}`;

    // Check if already on the list
    const alreadyAdded = groceryItems.some(
      g => g.name.toLowerCase() === item.name.toLowerCase() && !g.bought
    );

    return `
      <div class="suggestion-chip${isExp ? ' expired-chip' : ''}">
        <div class="suggestion-chip-info">
          <span style="font-size:18px;">${icon}</span>
          <div>
            <div class="suggestion-chip-name">${escHtml(item.name)}</div>
            <div class="suggestion-chip-sub">${subText}</div>
          </div>
        </div>
        ${alreadyAdded
          ? `<span style="font-size:11px; color:var(--green); font-weight:600;">✓ Added</span>`
          : `<button class="btn btn-sm btn-primary" onclick="addSuggestionToList('${escHtml(item.name)}','${item.category}')">+ Add</button>`
        }
      </div>
    `;
  }).join('');
}

// ── Render: Category Summary ──────────────────────────────────────────────────
function renderGrocerySummary() {
  const container = document.getElementById('grocery-summary-container');

  const pending = groceryItems.filter(g => !g.bought);

  if (pending.length === 0) {
    const allBought = groceryItems.length > 0;
    container.innerHTML = allBought
      ? '<p class="muted-text" style="text-align:center; padding:10px 0;">🎉 Everything is bought!</p>'
      : '<p class="muted-text">Add items to see a category breakdown.</p>';
    return;
  }

  // Count by category
  const counts = {};
  pending.forEach(g => {
    counts[g.category] = (counts[g.category] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  container.innerHTML = sorted.map(([cat, count]) => {
    const icon  = CATEGORY_ICONS[cat] || '📦';
    const label = CATEGORY_LABELS[cat] || cat;
    return `
      <div class="summary-row">
        <span class="summary-row-label">${icon} ${label}</span>
        <span class="summary-row-count">${count}</span>
      </div>
    `;
  }).join('');
}

// ── Render: Header Badge ──────────────────────────────────────────────────────
function renderGroceryBadge() {
  const badge   = document.getElementById('grocery-badge');
  const pending = groceryItems.filter(g => !g.bought).length;

  if (pending > 0) {
    badge.textContent = pending;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// ── Render All Grocery UI ─────────────────────────────────────────────────────
function renderGroceryAll() {
  renderGroceryList();
  renderGrocerySuggestions();
  renderGrocerySummary();
  renderGroceryBadge();
}

// ── Category Header Styling (injected via JS so it doesn't need extra HTML) ──
(function injectCategoryHeaderStyle() {
  const style = document.createElement('style');
  style.textContent = `
    .category-header {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--gray-400);
      padding: 10px 4px 4px;
      margin-top: 2px;
    }
    .category-header:first-child { padding-top: 0; }
  `;
  document.head.appendChild(style);
})();

// ── Sample Groceries ─────────────────────────────────────────────────────────
function loadSampleGroceries() {
  groceryItems = [
    { id: generateId(), name: 'Full Cream Milk',      category: 'dairy',      quantity: 2,  unit: 'L',      notes: '',                  bought: false, addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Eggs',                 category: 'dairy',      quantity: 12, unit: 'pcs',    notes: 'Free range',         bought: false, addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Cheddar Cheese',       category: 'dairy',      quantity: 250, unit: 'g',     notes: '',                  bought: false, addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Greek Yogurt',         category: 'dairy',      quantity: 1,  unit: 'pack',   notes: '',                  bought: true,  addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Chicken Breast',       category: 'meat',       quantity: 500, unit: 'g',     notes: 'Skinless',           bought: false, addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Beef Mince',           category: 'meat',       quantity: 400, unit: 'g',     notes: '',                  bought: false, addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Salmon Fillets',       category: 'seafood',    quantity: 2,  unit: 'pcs',    notes: 'Fresh if possible',  bought: false, addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Spinach',              category: 'vegetables', quantity: 1,  unit: 'pack',   notes: 'Baby spinach',       bought: false, addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Broccoli',             category: 'vegetables', quantity: 1,  unit: 'pcs',    notes: '',                  bought: false, addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Cherry Tomatoes',      category: 'vegetables', quantity: 250, unit: 'g',     notes: '',                  bought: true,  addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Carrots',              category: 'vegetables', quantity: 500, unit: 'g',     notes: '',                  bought: false, addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Bananas',              category: 'fruits',     quantity: 1,  unit: 'pack',   notes: '',                  bought: false, addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Strawberries',         category: 'fruits',     quantity: 250, unit: 'g',     notes: '',                  bought: false, addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Apples',               category: 'fruits',     quantity: 4,  unit: 'pcs',    notes: 'Granny Smith',       bought: true,  addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Sourdough Bread',      category: 'grains',     quantity: 1,  unit: 'pcs',    notes: '',                  bought: false, addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Rolled Oats',          category: 'grains',     quantity: 1,  unit: 'pack',   notes: '',                  bought: false, addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Pasta',                category: 'grains',     quantity: 500, unit: 'g',     notes: 'Spaghetti or penne', bought: false, addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Orange Juice',         category: 'beverages',  quantity: 1,  unit: 'L',      notes: 'No added sugar',     bought: false, addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Sparkling Water',      category: 'beverages',  quantity: 1,  unit: 'bottle', notes: '',                  bought: false, addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Olive Oil',            category: 'condiments', quantity: 1,  unit: 'bottle', notes: 'Extra virgin',       bought: false, addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Tomato Sauce',         category: 'condiments', quantity: 1,  unit: 'can',    notes: '',                  bought: true,  addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Frozen Peas',          category: 'frozen',     quantity: 500, unit: 'g',     notes: '',                  bought: false, addedAt: new Date().toISOString() },
    { id: generateId(), name: 'Mixed Nuts',           category: 'snacks',     quantity: 200, unit: 'g',     notes: 'Unsalted',           bought: false, addedAt: new Date().toISOString() },
  ];
  saveGrocery();
}

// ── Init ──────────────────────────────────────────────────────────────────────
loadGrocery();

// Load sample groceries if the list is empty
if (groceryItems.length === 0) {
  loadSampleGroceries();
}

renderGroceryBadge();  // Show badge on the tab even before the page is visited
