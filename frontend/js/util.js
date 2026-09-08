// Tiny shared helpers.
function money(n) {
  return `$${Number(n).toFixed(2)}`;
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function toast(message, type = 'info') {
  let box = document.getElementById('toast');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast';
    document.body.appendChild(box);
  }
  box.textContent = message;
  box.className = `toast toast-${type} show`;
  clearTimeout(box._t);
  box._t = setTimeout(() => box.classList.remove('show'), 3000);
}

function placeholderImg(text = 'No image') {
  return `https://placehold.co/600x400?text=${encodeURIComponent(text)}`;
}

window.money = money;
window.escapeHtml = escapeHtml;
window.toast = toast;
window.placeholderImg = placeholderImg;
