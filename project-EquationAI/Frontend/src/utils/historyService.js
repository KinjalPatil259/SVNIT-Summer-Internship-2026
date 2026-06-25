/* ═══════════════════════════════════════════════════
   EquationAI — History Service (localStorage)
   Manages equation conversion history entries.
   ═══════════════════════════════════════════════════ */

const STORAGE_KEY = 'equationai_history';
const MAX_ENTRIES = 100;

/**
 * Generate a unique ID.
 */
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Read all history entries from localStorage (newest first).
 * @returns {Array} History entries
 */
export function getHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const entries = JSON.parse(raw);
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

/**
 * Add a new history entry.
 * @param {{ latex: string, mathml?: string, source: 'upload'|'converter'|'handwriting', fileName?: string }} entry
 * @returns {object} The created entry with id and timestamp
 */
export function addHistoryEntry({ latex, mathml = '', source, fileName = null }) {
  const entries = getHistory();

  const newEntry = {
    id: generateId(),
    latex: latex || '',
    mathml: mathml || '',
    source,
    fileName,
    timestamp: new Date().toISOString(),
  };

  // Prepend (newest first) and cap at MAX_ENTRIES
  entries.unshift(newEntry);
  if (entries.length > MAX_ENTRIES) {
    entries.length = MAX_ENTRIES;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full — remove oldest entries and retry
    entries.length = Math.floor(MAX_ENTRIES / 2);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  return newEntry;
}

/**
 * Delete a single history entry by id.
 * @param {string} id
 */
export function deleteHistoryEntry(id) {
  const entries = getHistory().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/**
 * Clear all history entries.
 */
export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Search history by LaTeX content or filename.
 * @param {string} query
 * @returns {Array} Filtered entries
 */
export function searchHistory(query) {
  if (!query || !query.trim()) return getHistory();
  const q = query.toLowerCase().trim();
  return getHistory().filter((entry) => {
    const latexMatch = (entry.latex || '').toLowerCase().includes(q);
    const fileMatch = (entry.fileName || '').toLowerCase().includes(q);
    return latexMatch || fileMatch;
  });
}

/**
 * Get a human-readable relative time string.
 * @param {string} isoString
 * @returns {string}
 */
export function getRelativeTime(isoString) {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}
