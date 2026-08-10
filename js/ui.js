(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.LifeApp = root.LifeApp || {};
    root.LifeApp.ui = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ICONS = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#7d93a8" stroke="#343a40" stroke-width="1.4" stroke-linejoin="round" d="M12 2 2 9h20L12 2Z"/><path fill="#eef1f3" stroke="#343a40" stroke-width="1.4" d="M4 9h16v11H4z"/><path fill="#f08a3c" stroke="#343a40" stroke-width="1" d="M10 20v-6h4v6z"/></svg>',
    plan: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="3" fill="#eef1f3" stroke="#343a40" stroke-width="1.4"/><path d="M3 8h18v3H3z" fill="#f08a3c"/><path d="M8 2v4M16 2v4" stroke="#7d93a8" stroke-width="2" stroke-linecap="round"/><circle cx="8" cy="15" r="1.3" fill="#343a40"/><circle cx="12" cy="15" r="1.3" fill="#343a40"/><circle cx="16" cy="15" r="1.3" fill="#343a40"/></svg>',
    media: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Z" fill="#343a40"/><path d="m3 13 9 5 9-5" fill="none" stroke="#7d93a8" stroke-width="3.2" stroke-linecap="round"/><path d="m3 17 9 5 9-5" fill="none" stroke="#f08a3c" stroke-width="3.2" stroke-linecap="round"/></svg>',
    campus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m22 9-10-5-10 5 10 5 10-5Z" fill="#eef1f3" stroke="#343a40" stroke-width="1.4" stroke-linejoin="round"/><path d="M4 12v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4" fill="none" stroke="#343a40" stroke-width="1.4"/><path d="M12 9v3" stroke="#f08a3c" stroke-width="2.4" stroke-linecap="round"/><circle cx="14.8" cy="8.4" r="1.5" fill="#f08a3c" stroke="#343a40" stroke-width="0.8"/></svg>',
    product: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 9 8 4 8-4v8l-8 4-8-4V9Z" fill="#eef1f3" stroke="#343a40" stroke-width="1.4" stroke-linejoin="round"/><path d="m4 9 8-4 8 4-8 4-8-4Z" fill="#7d93a8" stroke="#343a40" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 13v6" stroke="#f08a3c" stroke-width="2.2" stroke-linecap="round"/></svg>',
    fitness: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="10" y="8" width="4" height="8" rx="1" fill="#7d93a8" stroke="#343a40" stroke-width="1"/><rect x="4" y="6" width="3" height="12" rx="1.2" fill="#343a40"/><rect x="8" y="7.5" width="2" height="9" rx="1" fill="#343a40"/><rect x="17" y="6" width="3" height="12" rx="1.2" fill="#f08a3c" stroke="#343a40" stroke-width="1"/><rect x="14" y="7.5" width="2" height="9" rx="1" fill="#f08a3c" stroke="#343a40" stroke-width="0.8"/></svg>',
    diet: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3v7c0 2 1.5 3 3 3v8" fill="none" stroke="#7d93a8" stroke-width="2.2" stroke-linecap="round"/><path d="M5 3c3 0 4 3 4 6" fill="none" stroke="#7d93a8" stroke-width="2.2"/><path d="M12 13v8" stroke="#343a40" stroke-width="2.2" stroke-linecap="round"/><path d="M17 3c-2 2.2-3 5-3 9 0 3 1 6 3 9 2-3 3-6 3-9 0-4-1-6.8-3-9Z" fill="#f08a3c" stroke="#343a40" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    game: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="7" width="20" height="10" rx="5" fill="#343a40"/><path d="M7 10v4M5 12h4" stroke="#eef1f3" stroke-width="1.9" stroke-linecap="round"/><circle cx="16" cy="11" r="1.3" fill="#f08a3c"/><circle cx="19" cy="13" r="1.3" fill="#7d93a8"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="#7d93a8" stroke-width="1.7" stroke-linecap="round"/><circle cx="9" cy="7" r="2.2" fill="#f08a3c" stroke="#343a40" stroke-width="1"/><circle cx="15" cy="12" r="2.2" fill="#343a40"/><circle cx="9" cy="17" r="2.2" fill="#eef1f3" stroke="#343a40" stroke-width="1"/></svg>'
  };

  function pageHeader(options) {
    return '<div class="page-header">' +
      '<div class="page-heading">' +
      (options.icon ? '<span class="page-icon">' + options.icon + '</span>' : '') +
      '<div class="page-heading-copy">' +
      (options.eyebrow ? '<span class="eyebrow">' + esc(options.eyebrow) + '</span>' : '') +
      '<h1>' + esc(options.title) + '</h1>' +
      (options.description ? '<p>' + esc(options.description) + '</p>' : '') +
      '</div></div>' +
      (options.actions ? '<div class="page-actions">' + options.actions + '</div>' : '') +
      '</div>';
  }

  function circleCheck(checked) {
    return '<button type="button" class="circle-check' + (checked ? ' is-done' : '') + '" aria-label="完成">' +
      (checked ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4 10-10"/></svg>' : '') +
      '</button>';
  }

  function threeDots() {
    return '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';
  }

  function esc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function modal(options) {
    const root = document.getElementById('modal-root');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const buttons = options.buttons || [];
    const buttonsHtml = buttons.map(function (b, i) {
      return '<button type="button" class="' + esc(b.className || 'btn') + '" data-modal-btn="' + i + '">' + esc(b.label) + '</button>';
    }).join('');
    overlay.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
      '<div class="modal-head"><h3>' + esc(options.title || '') + '</h3>' +
      '<button type="button" class="modal-close" data-modal-close="1" aria-label="关闭">&times;</button></div>' +
      '<div class="modal-body">' + (options.bodyHtml || '') + '</div>' +
      (buttonsHtml ? '<div class="modal-foot">' + buttonsHtml + '</div>' : '') +
      '</div>';
    root.appendChild(overlay);

    function close() {
      overlay.remove();
    }

    overlay.querySelector('[data-modal-close]').addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    overlay.querySelectorAll('[data-modal-btn]').forEach(function (el, i) {
      el.addEventListener('click', function () {
        const btn = buttons[i];
        const keepOpen = btn && btn.onClick && btn.onClick() === false;
        if (!keepOpen && (!btn || btn.close !== false)) close();
      });
    });
    return { el: overlay, close: close };
  }

  function confirm(message) {
    return new Promise(function (resolve) {
      modal({
        title: '确认操作',
        bodyHtml: '<p>' + esc(message) + '</p>',
        buttons: [
          { label: '取消', className: 'btn', onClick: function () { resolve(false); } },
          { label: '确认', className: 'btn btn-primary', onClick: function () { resolve(true); } }
        ]
      });
    });
  }

  function toast(message) {
    const root = document.getElementById('toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    root.appendChild(el);
    setTimeout(function () {
      el.remove();
    }, 2200);
  }

  function emptyState(text, actionHtml) {
    return '<div class="empty"><p>' + esc(text) + '</p>' + (actionHtml || '') + '</div>';
  }

  return {
    esc: esc,
    modal: modal,
    confirm: confirm,
    toast: toast,
    emptyState: emptyState,
    icons: ICONS,
    pageHeader: pageHeader,
    circleCheck: circleCheck,
    threeDots: threeDots
  };
});
