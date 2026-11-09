// Small helpers shared by the browser app and the Node prerender script.
export const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);

// FNV-1a hash of a string. The prerender stores it in #app[data-hash]; the browser
// recomputes it from its own render and only re-renders when the two differ.
export function hashString(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// Analytics data attributes read by the click listener in index/prerendered <head>.
// Example: track("call_click", { location: "dallas", placement: "catering", intent: "catering" })
export function track(event, details = {}) {
  return ` data-track="${event}"` + ["location", "placement", "intent", "platform"].filter((key) => details[key]).map((key) => ` data-${key}="${esc(details[key])}"`).join("");
}
