(function () {
  'use strict';

  var STORAGE_KEY = 'jtmann_lang';
  var VALID_LANGS = ['pt', 'en', 'es'];
  var LANG_HTML_ATTR = { pt: 'pt-BR', en: 'en', es: 'es' };
  var LANG_SHORT_LABEL = { pt: 'PT', en: 'EN', es: 'ES' };
  var htmlEl = document.documentElement;
  var currentLang = (function () {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (VALID_LANGS.indexOf(saved) !== -1) return saved;
    } catch (e) {}
    return 'pt';
  })();

  function applyLanguage(lang) {
    var dict = TRANSLATIONS[lang];
    if (!dict) return;
    currentLang = lang;
    htmlEl.setAttribute('lang', LANG_HTML_ATTR[lang] || 'en');

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (dict[key] !== undefined) {
        // innerHTML is safe here: all translation strings are developer-authored
        // (js/translations.js), never user input. Allows <strong>/<em> for legal text.
        el.innerHTML = dict[key];
      }
    });

    document.title = dict.meta_title;
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', dict.meta_description);

    ['lang-dropdown-current', 'lang-dropdown-current-mobile'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = LANG_SHORT_LABEL[lang] || lang.toUpperCase();
    });

    document.querySelectorAll('.lang-option').forEach(function (btn) {
      var isActive = btn.getAttribute('data-lang') === lang;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  document.querySelectorAll('.lang-option').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyLanguage(btn.getAttribute('data-lang'));
      closeAllLangDropdowns();
    });
  });

  applyLanguage(currentLang);

  // ---- Language dropdown ----
  var langDropdowns = [
    { toggle: document.getElementById('lang-dropdown-toggle'), list: document.getElementById('lang-dropdown-list') },
    { toggle: document.getElementById('lang-dropdown-toggle-mobile'), list: document.getElementById('lang-dropdown-list-mobile') },
  ];

  function closeAllLangDropdowns() {
    langDropdowns.forEach(function (d) {
      if (d.toggle && d.list) {
        d.list.hidden = true;
        d.toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  langDropdowns.forEach(function (d) {
    if (!d.toggle || !d.list) return;
    d.toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = !d.list.hidden;
      closeAllLangDropdowns();
      if (!isOpen) {
        d.list.hidden = false;
        d.toggle.setAttribute('aria-expanded', 'true');
      }
    });
  });

  document.addEventListener('click', function () {
    closeAllLangDropdowns();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllLangDropdowns();
  });

  // ---- Mobile nav ----
  var mobileToggle = document.getElementById('mobile-toggle');
  var mainNav = document.getElementById('main-nav');
  if (mobileToggle && mainNav) {
    mobileToggle.addEventListener('click', function () {
      var isOpen = mainNav.classList.toggle('open');
      mobileToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    mainNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mainNav.classList.remove('open');
        mobileToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---- Visa details modal ----
  var visaOverlay = document.getElementById('visa-modal-overlay');
  var visaTitleEl = document.getElementById('visa-modal-title');
  var visaBodyEl = document.getElementById('visa-modal-body');
  var visaCloseBtn = document.getElementById('visa-modal-close');
  var visaLastFocused = null;

  function openVisaModal(id) {
    var sourceContent = document.querySelector('.visa-content-store [data-visa-id="' + id + '"]');
    var sourceTitle = document.querySelector('.service-card [data-visa="' + id + '"]');
    var titleEl = sourceTitle ? sourceTitle.closest('.service-card').querySelector('h3') : null;
    if (!sourceContent || !visaOverlay) return;
    visaTitleEl.textContent = titleEl ? titleEl.textContent : '';
    visaBodyEl.innerHTML = sourceContent.innerHTML;
    visaLastFocused = document.activeElement;
    visaOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
    visaCloseBtn.focus();
  }

  function closeVisaModal() {
    if (!visaOverlay) return;
    visaOverlay.hidden = true;
    document.body.style.overflow = '';
    if (visaLastFocused && visaLastFocused.focus) visaLastFocused.focus();
  }

  document.querySelectorAll('.card-link[data-visa]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openVisaModal(btn.getAttribute('data-visa'));
    });
  });

  if (visaCloseBtn) visaCloseBtn.addEventListener('click', closeVisaModal);
  if (visaOverlay) {
    visaOverlay.addEventListener('click', function (e) {
      if (e.target === visaOverlay) closeVisaModal();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && visaOverlay && !visaOverlay.hidden) closeVisaModal();
  });

  // ---- FAQ accordion ----
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var btn = item.querySelector('.faq-question');
    btn.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function (openItem) {
        if (openItem !== item) {
          openItem.classList.remove('open');
          openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
        }
      });
      item.classList.toggle('open', !isOpen);
      btn.setAttribute('aria-expanded', (!isOpen).toString());
    });
  });

  // ---- Contact form (placeholder submit handler — wire to real endpoint before launch) ----
  var form = document.getElementById('contact-form');
  var successMsg = document.getElementById('form-success');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      // [PLACEHOLDER] No backend wired yet — confirm destination email/service before launch.
      successMsg.hidden = false;
      form.reset();
      successMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  // ---- WhatsApp links — [PLACEHOLDER] replace with confirmed number, e.g. https://wa.me/1XXXXXXXXXX ----
  var WHATSAPP_URL = 'https://wa.me/PLACEHOLDER_NUMBER';
  ['whatsapp-btn-header', 'whatsapp-btn-hero', 'whatsapp-btn-mobile'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.setAttribute('href', WHATSAPP_URL);
  });

  // ---- Footer year ----
  var yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---- Header shadow on scroll ----
  var header = document.getElementById('site-header');
  if (header) {
    var onScroll = function () {
      header.style.boxShadow = window.scrollY > 4 ? '0 2px 10px rgba(11,37,69,.08)' : 'none';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();
