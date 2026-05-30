import fs from "fs";
import path from "path";

// __dirname is provided by Node's CJS runtime (Babel compiles ESM → CJS).
// Resolves to either src/helpers/ (during test via babel-jest) or lib/helpers/ (runtime).
const TEMPLATES_ROOT = path.resolve(__dirname, "..");

const cache = new Map();

function loadTemplate(relativePath) {
  if (cache.has(relativePath)) return cache.get(relativePath);
  const fullPath = path.join(TEMPLATES_ROOT, relativePath);
  const content = fs.readFileSync(fullPath, "utf8");
  cache.set(relativePath, content);
  return content;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

/**
 * Render a template file with {{variable}} placeholders.
 * All substituted values are HTML-escaped to prevent XSS.
 *
 * @param {string} relativePath - Path relative to src/, e.g. "templates/emails/verification.html"
 * @param {Object} vars - Key-value map of placeholder substitutions
 * @returns {string} Rendered HTML
 */
export function renderTemplate(relativePath, vars = {}) {
  let content = loadTemplate(relativePath);
  for (const [key, value] of Object.entries(vars)) {
    content = content.split(`{{${key}}}`).join(escapeHtml(value));
  }
  return content;
}
