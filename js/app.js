/* =============================================================================
   EXPENSE & BUDGET VISUALIZER — app.js

   Architecture: unidirectional data flow
     User action → mutate state → save to storage → render all

   Every function has a single responsibility.
   The DOM is always a reflection of state — never the source of truth.
============================================================================= */


/* =============================================================================
   1. CONSTANTS
   Named values that never change. Centralized so they're easy to find.
============================================================================= */

const STORAGE_KEY_TRANSACTIONS = 'expense-tracker-transactions';
const STORAGE_KEY_THEME        = 'expense-tracker-theme';
const STORAGE_KEY_LIMIT        = 'expense-tracker-limit';

const CATEGORY_COLORS = {
  'Food & Drinks':  '#10B981',
  'Transportation': '#3B82F6',
  'Shopping':       '#A855F7',
  'Entertainment':  '#EC4899',
  'Hobbies':        '#14B8A6',
  'Bills':          '#F97316',
  'Health':         '#22C55E',
  'Education':      '#6366F1',
  'Investments':    '#EAB308',
  'Savings':        '#64748B',
};

const DEFAULT_CATEGORY_COLOR = '#94A3B8';

const SORT_OPTIONS = {
  newest:      'newest',
  oldest:      'oldest',
  amountDesc:  'amount-desc',
  amountAsc:   'amount-asc',
  category:    'category',
};


/* =============================================================================
   2. STATE
   The single source of truth. Only mutate this object through the
   helper functions below — never directly from event handlers.
============================================================================= */

const state = {
  transactions:  [],   // array of transaction objects
  sortOrder:     SORT_OPTIONS.newest,
  spendingLimit: null, // number or null
  theme:         'light',
};


/* =============================================================================
   3. STORAGE — Read and write from localStorage
   All localStorage access is isolated here. The rest of the app
   doesn't know or care where the data is stored.
============================================================================= */

/**
 * Loads all persisted data from localStorage into the state object.
 * Called once during init. Falls back to safe defaults if nothing is stored.
 */
function loadStateFromStorage() {
  try {
    const savedTransactions = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (savedTransactions) {
      state.transactions = JSON.parse(savedTransactions);
    }

    const savedLimit = localStorage.getItem(STORAGE_KEY_LIMIT);
    if (savedLimit !== null) {
      state.spendingLimit = parseInt(savedLimit, 10);
    }

    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
    if (savedTheme === 'dark' || savedTheme === 'light') {
      state.theme = savedTheme;
    }
  } catch (error) {
    // If localStorage is corrupted or unavailable, start with empty state.
    console.warn('Could not load data from localStorage:', error);
    state.transactions  = [];
    state.spendingLimit = null;
    state.theme         = 'light';
  }
}

/**
 * Persists the current transactions array to localStorage.
 * Called after every mutation that changes transactions.
 */
function saveTransactions() {
  try {
    localStorage.setItem(
      STORAGE_KEY_TRANSACTIONS,
      JSON.stringify(state.transactions)
    );
  } catch (error) {
    console.warn('Could not save transactions to localStorage:', error);
  }
}

/**
 * Persists the current spending limit to localStorage.
 * Called when the user sets or clears the limit.
 */
function saveSpendingLimit() {
  try {
    if (state.spendingLimit === null) {
      localStorage.removeItem(STORAGE_KEY_LIMIT);
    } else {
      localStorage.setItem(STORAGE_KEY_LIMIT, String(state.spendingLimit));
    }
  } catch (error) {
    console.warn('Could not save spending limit to localStorage:', error);
  }
}

/**
 * Persists the current theme preference to localStorage.
 * Called when the user toggles the theme.
 */
function saveTheme() {
  try {
    localStorage.setItem(STORAGE_KEY_THEME, state.theme);
  } catch (error) {
    console.warn('Could not save theme to localStorage:', error);
  }
}


/* =============================================================================
   4. HELPERS
   Pure utility functions. No side effects, no DOM access.
============================================================================= */

/**
 * Generates a unique ID for a new transaction.
 * Combines timestamp with a random number to avoid collisions.
 * @returns {string}
 */
function generateId() {
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

/**
 * Formats a number as Indonesian Rupiah (e.g. 50000 → "Rp 50.000").
 * Uses the id-ID locale which produces period-separated thousands
 * with no decimal places — correct for IDR.
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style:                 'currency',
    currency:              'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Returns the hex color for a given category name.
 * Falls back to a neutral gray for unknown categories.
 * @param {string} category
 * @returns {string}
 */
function getCategoryColor(category) {
  return CATEGORY_COLORS[category] ?? DEFAULT_CATEGORY_COLOR;
}

/**
 * Converts a category name to a CSS class modifier slug.
 * Lowercases the name and replaces spaces and "&" with hyphens,
 * then strips any remaining non-alphanumeric characters.
 * e.g. "Food & Drinks" → "food---drinks" → "food-drinks"
 * @param {string} category
 * @returns {string}
 */
function getCategoryBadgeClass(category) {
  return category
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Calculates the total of all transactions.
 * @param {Array} transactions
 * @returns {number}
 */
function calculateTotal(transactions) {
  return transactions.reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Returns a copy of the transactions array sorted according to
 * the current sort order in state. Does not mutate the original.
 * @param {Array} transactions
 * @returns {Array}
 */
function getSortedTransactions(transactions) {
  const copy = [...transactions];

  switch (state.sortOrder) {
    case SORT_OPTIONS.oldest:
      return copy.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    case SORT_OPTIONS.amountDesc:
      return copy.sort((a, b) => b.amount - a.amount);

    case SORT_OPTIONS.amountAsc:
      return copy.sort((a, b) => a.amount - b.amount);

    case SORT_OPTIONS.category:
      return copy.sort((a, b) => a.category.localeCompare(b.category));

    case SORT_OPTIONS.newest:
    default:
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

/**
 * Groups transactions by category and sums the amounts.
 * Used to feed data to the pie chart.
 * @param {Array} transactions
 * @returns {{ labels: string[], amounts: number[], colors: string[] }}
 */
function getSpendingByCategory(transactions) {
  const totals = {};

  for (const tx of transactions) {
    totals[tx.category] = (totals[tx.category] ?? 0) + tx.amount;
  }

  const labels  = Object.keys(totals);
  const amounts = labels.map((label) => totals[label]);
  const colors  = labels.map((label) => getCategoryColor(label));

  return { labels, amounts, colors };
}


/* =============================================================================
   5. DOM REFERENCES
   All getElementById calls in one place. If an ID ever changes in the HTML,
   there is only one place to update it here.
============================================================================= */

const dom = {
  balanceAmount:    document.getElementById('balance-amount'),
  limitWarning:     document.getElementById('limit-warning'),
  limitWarningText: document.getElementById('limit-warning-text'),
  transactionList:  document.getElementById('transaction-list'),
  emptyState:       document.getElementById('empty-state'),
  chartEmptyState:  document.getElementById('chart-empty-state'),
  spendingChart:    document.getElementById('spending-chart'),
  transactionForm:  document.getElementById('transaction-form'),
  itemNameInput:    document.getElementById('item-name'),
  amountInput:      document.getElementById('amount'),
  categorySelect:   document.getElementById('category'),
  itemNameError:    document.getElementById('item-name-error'),
  amountError:      document.getElementById('amount-error'),
  sortSelect:       document.getElementById('sort-select'),
  themeToggle:      document.getElementById('theme-toggle'),
  themeToggleIcon:  document.querySelector('#theme-toggle .theme-toggle__icon'),
  spendingLimitInput: document.getElementById('spending-limit'),
  setLimitBtn:      document.getElementById('set-limit-btn'),
  clearLimitBtn:    document.getElementById('clear-limit-btn'),
};


/* =============================================================================
   6. CHART INSTANCE
   Chart.js requires a reference to the existing chart instance so it can
   be destroyed before re-creating it. Stored here at module scope.
============================================================================= */

let chartInstance = null;


/* =============================================================================
   7. RENDER — Balance
   Reads from state and updates the balance display.
   Also handles the spending limit warning.
============================================================================= */

/**
 * Renders the total balance and spending limit warning.
 * No arguments — reads directly from state.
 */
function renderBalance() {
  const total = calculateTotal(state.transactions);
  dom.balanceAmount.textContent = formatCurrency(total);

  const isOverLimit =
    state.spendingLimit !== null && total > state.spendingLimit;

  // Toggle warning color on the amount
  dom.balanceAmount.classList.toggle('balance-card__amount--over-limit', isOverLimit);

  // Show or hide the warning banner
  dom.limitWarning.hidden = !isOverLimit;

  if (isOverLimit) {
    const overage = total - state.spendingLimit;
    dom.limitWarningText.textContent =
      `You've exceeded your ${formatCurrency(state.spendingLimit)} limit by ${formatCurrency(overage)}.`;
  }
}


/* =============================================================================
   8. RENDER — Transaction List
   Clears and rebuilds the transaction list from state.
   Shows the empty state when there are no transactions.
============================================================================= */

/**
 * Builds a single transaction list item element.
 * @param {Object} transaction
 * @returns {HTMLLIElement}
 */
function buildTransactionItem(transaction) {
  const item = document.createElement('li');
  item.className = 'transaction-item';
  item.dataset.id = transaction.id;

  const badgeClass = getCategoryBadgeClass(transaction.category);

  item.innerHTML = `
    <div class="transaction-item__info">
      <span class="transaction-item__name">${escapeHtml(transaction.name)}</span>
      <span class="transaction-item__amount">${formatCurrency(transaction.amount)}</span>
      <span class="category-badge category-badge--${badgeClass}">${escapeHtml(transaction.category)}</span>
    </div>
    <button
      class="transaction-item__delete"
      aria-label="Delete ${escapeHtml(transaction.name)}"
      data-id="${transaction.id}"
    >✕</button>
  `;

  return item;
}

/**
 * Renders the full transaction list.
 * Clears existing DOM content and rebuilds from sorted state.
 */
function renderTransactionList() {
  const sorted = getSortedTransactions(state.transactions);
  const hasTransactions = sorted.length > 0;

  // Show/hide the empty state placeholder
  dom.emptyState.hidden = hasTransactions;

  // Clear the list
  dom.transactionList.innerHTML = '';

  // Rebuild from current state
  for (const transaction of sorted) {
    dom.transactionList.appendChild(buildTransactionItem(transaction));
  }
}


/* =============================================================================
   9. RENDER — Spending Chart
   Destroys the existing Chart.js instance (if any) and creates a new one.
   Shows the empty state when there is no data to plot.
============================================================================= */

/**
 * Renders the pie chart using the current transactions.
 * Handles the case where Chart.js failed to load.
 */
function renderChart() {
  const hasTransactions = state.transactions.length > 0;

  dom.chartEmptyState.hidden = hasTransactions;

  if (!hasTransactions) {
    // Destroy any existing chart so the canvas is blank
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  // Guard: if Chart.js CDN failed to load, show the empty state gracefully
  if (typeof Chart === 'undefined') {
    dom.chartEmptyState.hidden = false;
    dom.chartEmptyState.querySelector('.empty-state__text').textContent =
      'Chart unavailable.';
    dom.chartEmptyState.querySelector('.empty-state__hint').textContent =
      'Could not load the chart library. Check your connection.';
    return;
  }

  const { labels, amounts, colors } = getSpendingByCategory(state.transactions);

  // Destroy previous instance before creating a new one — required by Chart.js
  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(dom.spendingChart, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data:            amounts,
        backgroundColor: colors,
        borderWidth:     2,
        borderColor:     getComputedStyle(document.documentElement)
                           .getPropertyValue('--color-surface').trim() || '#ffffff',
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font:        { family: 'Inter, system-ui, sans-serif', size: 12 },
            color:       getComputedStyle(document.documentElement)
                           .getPropertyValue('--color-text-secondary').trim() || '#64748B',
            padding:     16,
            usePointStyle: true,
            pointStyleWidth: 8,
          },
        },
        tooltip: {
          callbacks: {
            label(context) {
              const value  = context.parsed;
              const total  = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct    = ((value / total) * 100).toFixed(1);
              return ` ${context.label}: ${formatCurrency(value)} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}


/* =============================================================================
   10. RENDER — Spending Limit Input
   Restores the saved limit value into the input on page load.
============================================================================= */

/**
 * Populates the spending limit input with the stored value.
 */
function renderSpendingLimitInput() {
  if (state.spendingLimit !== null) {
    dom.spendingLimitInput.value = state.spendingLimit;
  } else {
    dom.spendingLimitInput.value = '';
  }
}


/* =============================================================================
   11. RENDER — Theme
   Applies the current theme to the document and updates the toggle button.
============================================================================= */

/**
 * Applies the current theme from state to the DOM.
 */
function renderTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);

  const isDark = state.theme === 'dark';
  dom.themeToggle.setAttribute('aria-pressed', String(isDark));
  dom.themeToggleIcon.textContent = isDark ? '🌙' : '☀️';
}


/* =============================================================================
   12. RENDER ALL
   The master render function. Called after every state mutation.
   Renders every UI section in the correct order.
============================================================================= */

/**
 * Fully re-renders the entire UI from the current state.
 * This is the only function that should be called after a state change.
 */
function renderAll() {
  renderBalance();
  renderTransactionList();
  renderChart();
}


/* =============================================================================
   13. STATE MUTATIONS
   Functions that change state. Each one saves to storage and calls renderAll.
   No event handler should mutate state directly.
============================================================================= */

/**
 * Adds a new transaction to state.
 * @param {{ name: string, amount: number, category: string }} fields
 */
function addTransaction(fields) {
  const transaction = {
    id:        generateId(),
    name:      fields.name.trim(),
    amount:    fields.amount,
    category:  fields.category,
    createdAt: new Date().toISOString(),
  };

  state.transactions.push(transaction);
  saveTransactions();
  renderAll();
}

/**
 * Removes a transaction from state by its ID.
 * @param {string} id
 */
function deleteTransaction(id) {
  state.transactions = state.transactions.filter((tx) => tx.id !== id);
  saveTransactions();
  renderAll();
}

/**
 * Updates the spending limit in state.
 * @param {number|null} limit — pass null to clear the limit
 */
function setSpendingLimit(limit) {
  state.spendingLimit = limit;
  saveSpendingLimit();
  renderAll();
}

/**
 * Toggles the theme between light and dark.
 */
function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  saveTheme();
  renderTheme();
  // Re-render chart so it picks up the new CSS color values
  renderChart();
}

/**
 * Updates the sort order and re-renders the list.
 * @param {string} order — one of the SORT_OPTIONS values
 */
function setSortOrder(order) {
  state.sortOrder = order;
  // No storage needed for sort — preference is not persisted
  renderTransactionList();
}


/* =============================================================================
   14. VALIDATION
   Returns an object describing which fields are invalid and why.
   Does not touch the DOM — that is the event handler's job.
============================================================================= */

/**
 * Validates the transaction form fields.
 * @param {{ name: string, amount: string, category: string }} fields
 * @returns {{ valid: boolean, errors: { name?: string, amount?: string } }}
 */
function validateTransactionFields(fields) {
  const errors = {};

  if (!fields.name || fields.name.trim() === '') {
    errors.name = 'Please enter an item name.';
  }

  if (!fields.amount || fields.amount.trim() === '') {
    errors.amount = 'Please enter an amount.';
  } else if (isNaN(Number(fields.amount)) || Number(fields.amount) < 1) {
    errors.amount = 'Amount must be at least Rp 1.';
  }

  return {
    valid:  Object.keys(errors).length === 0,
    errors,
  };
}


/* =============================================================================
   15. FORM UI HELPERS
   Functions that show and clear inline validation errors.
   Separated from validation logic because they touch the DOM.
============================================================================= */

/**
 * Shows an error message below a form field.
 * @param {HTMLElement} inputEl  — the input or select element
 * @param {HTMLElement} errorEl  — the error paragraph element
 * @param {string}      message
 */
function showFieldError(inputEl, errorEl, message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
  inputEl.classList.add(
    inputEl.tagName === 'SELECT'
      ? 'form-field__select--error'
      : 'form-field__input--error'
  );
}

/**
 * Clears the error state from a form field.
 * @param {HTMLElement} inputEl
 * @param {HTMLElement} errorEl
 */
function clearFieldError(inputEl, errorEl) {
  errorEl.textContent = '';
  errorEl.hidden = true;
  inputEl.classList.remove('form-field__input--error', 'form-field__select--error');
}

/**
 * Clears all form field errors at once.
 */
function clearAllFormErrors() {
  clearFieldError(dom.itemNameInput, dom.itemNameError);
  clearFieldError(dom.amountInput,   dom.amountError);
}


/* =============================================================================
   16. SECURITY HELPER
   Prevents XSS when inserting user-provided text into innerHTML.
============================================================================= */

/**
 * Escapes HTML special characters in a string.
 * Used before inserting any user input into innerHTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;');
}


/* =============================================================================
   17. EVENT HANDLERS
   One function per user action. Each handler reads from the DOM,
   validates if needed, then calls a state mutation function.
   Handlers never mutate state directly.
============================================================================= */

/**
 * Handles the transaction form submission.
 * Validates fields, calls addTransaction, resets the form.
 * @param {Event} event
 */
function handleFormSubmit(event) {
  event.preventDefault();
  clearAllFormErrors();

  const fields = {
    name:     dom.itemNameInput.value,
    amount:   dom.amountInput.value,
    category: dom.categorySelect.value,
  };

  const { valid, errors } = validateTransactionFields(fields);

  if (!valid) {
    if (errors.name) {
      showFieldError(dom.itemNameInput, dom.itemNameError, errors.name);
    }
    if (errors.amount) {
      showFieldError(dom.amountInput, dom.amountError, errors.amount);
    }
    // Move focus to the first invalid field
    if (errors.name) {
      dom.itemNameInput.focus();
    } else if (errors.amount) {
      dom.amountInput.focus();
    }
    return;
  }

  addTransaction({
    name:     fields.name,
    amount:   parseInt(fields.amount, 10),
    category: fields.category,
  });

  // Reset form and return focus to the first field for fast repeat entry
  dom.transactionForm.reset();
  dom.itemNameInput.focus();
}

/**
 * Handles click on any delete button inside the transaction list.
 * Uses event delegation on the list container — one listener handles all items.
 * @param {Event} event
 */
function handleDeleteClick(event) {
  const deleteBtn = event.target.closest('[data-id]');
  if (!deleteBtn) return;

  const id = deleteBtn.dataset.id;
  deleteTransaction(id);
}

/**
 * Handles the sort order dropdown change.
 * @param {Event} event
 */
function handleSortChange(event) {
  setSortOrder(event.target.value);
}

/**
 * Handles the theme toggle button click.
 */
function handleThemeToggle() {
  toggleTheme();
}

/**
 * Handles the "Set" spending limit button click.
 */
function handleSetLimit() {
  const raw = dom.spendingLimitInput.value.trim();

  if (raw === '') {
    setSpendingLimit(null);
    return;
  }

  const value = parseInt(raw, 10);

  if (isNaN(value) || value < 1) {
    dom.spendingLimitInput.focus();
    return;
  }

  setSpendingLimit(value);
}

/**
 * Handles the "Clear" spending limit button click.
 */
function handleClearLimit() {
  state.spendingLimit = null;
  saveSpendingLimit();
  dom.spendingLimitInput.value = '';
  renderAll();
}


/* =============================================================================
   18. EVENT LISTENER REGISTRATION
   All addEventListener calls in one place.
   Called once during init.
============================================================================= */

/**
 * Attaches all event listeners to their DOM targets.
 */
function attachEventListeners() {
  dom.transactionForm.addEventListener('submit', handleFormSubmit);

  // Event delegation: one listener handles all delete buttons
  dom.transactionList.addEventListener('click', handleDeleteClick);

  dom.sortSelect.addEventListener('change', handleSortChange);
  dom.themeToggle.addEventListener('click', handleThemeToggle);
  dom.setLimitBtn.addEventListener('click', handleSetLimit);
  dom.clearLimitBtn.addEventListener('click', handleClearLimit);

  // Allow pressing Enter in the spending limit input to set the limit
  dom.spendingLimitInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') handleSetLimit();
  });
}


/* =============================================================================
   19. INIT
   The application entry point. Called once when the DOM is ready.
   Execution order matters: load → render → listen.
============================================================================= */

/**
 * Initializes the application.
 * Load state → render UI → attach listeners.
 */
function init() {
  loadStateFromStorage();
  renderTheme();
  renderSpendingLimitInput();
  renderAll();
  attachEventListeners();
}

// Start the application
init();
