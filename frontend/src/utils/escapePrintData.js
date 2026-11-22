// Print templates use HTML strings instead of React's automatic text escaping.
export function escapePrintData(value) {
  if (typeof value === 'string') {
    return value.replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }
  if (Array.isArray(value)) return value.map(escapePrintData);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, escapePrintData(item)]));
  }
  return value;
}
