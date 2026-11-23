(function () {
  'use strict';

  var STORAGE_KEY = 'jtmann_lang';
  var VALID_LANGS = ['pt', 'en', 'es'];
  var LANG_HTML_ATTR = { pt: 'pt-BR', en: 'en', es: 'es' };
  var LANG_SHORT_LABEL = { pt: 'PT', en: 'EN', es: 'ES' };
  // WhatsApp number to route to per language (digits only, country code included, no + / spaces / dashes)
  var WHATSAPP_NUMBERS = {
    en: '14077613901',   // +1 (407) 761-3901
    pt: '5562982876771', // +55 62 98287-6771
    es: '5562982876771', // +55 62 98287-6771
  };

  function updateWhatsAppLinks(lang) {
    var number = WHATSAPP_NUMBERS[lang] || WHATSAPP_NUMBERS.en;
    var url = 'https://wa.me/' + number;
    ['whatsapp-btn-header', 'whatsapp-btn-hero', 'whatsapp-btn-mobile'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.setAttribute('href', url);
    });
  }
  var htmlEl = document.documentElement;
  var currentLang = (function () {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (VALID_LANGS.indexOf(saved) !== -1) return saved;
    } catch (e) {}
    return 'en';
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

    var titleKey = document.body.getAttribute('data-title-key');
    document.title = dict[titleKey || 'meta_title'];
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && !titleKey) metaDesc.setAttribute('content', dict.meta_description);

    updateWhatsAppLinks(lang);
    syncConsultLang(lang);

    document.querySelectorAll('[data-langs]').forEach(function (el) {
      el.hidden = el.getAttribute('data-langs').split(' ').indexOf(lang) === -1;
    });

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


  // ---- Free consultation: quick form -> booking calendar -> optional details ----
  var cForm = document.getElementById('consult-form');
  var mForm = document.getElementById('consult-more-form');
  var prefLangTouched = false;
  var PREF_LANG_VALUES = { en: 'English', pt: 'Portuguese', es: 'Spanish' };

  function syncConsultLang(lang) {
    if (!cForm || prefLangTouched) return;
    var r = cForm.querySelector('input[name="language"][value="' + PREF_LANG_VALUES[lang] + '"]');
    if (r) r.checked = true;
  }

  if (cForm) {
    var cDots = document.querySelectorAll('#consult-progress li');
    var cSubmit = document.getElementById('consult-submit');
    var cError = document.getElementById('consult-error');
    var cBooking = document.getElementById('consult-booking');
    var mOpen = document.getElementById('consult-more-open');
    var mSubmit = document.getElementById('consult-more-submit');
    var mError = document.getElementById('consult-more-error');
    var mDone = document.getElementById('consult-more-done');

    var scrollToEl = function (el) {
      var top = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: top, behavior: 'smooth' });
    };

    var setDots = function (activeIdx, doneUpTo) {
      cDots.forEach(function (d, idx) {
        d.classList.toggle('active', idx === activeIdx);
        d.classList.toggle('done', idx <= doneUpTo);
      });
    };

    var updateConditionals = function () {
      [cForm, mForm].forEach(function (f) {
        if (!f) return;
        f.querySelectorAll('[data-show-when]').forEach(function (el) {
          var parts = el.getAttribute('data-show-when').split(':');
          var field = f.elements[parts[0]];
          el.hidden = !(field && field.value === parts[1]);
        });
      });
      var unknown = document.getElementById('cf-status-unknown');
      var endDate = document.getElementById('cf-status-end');
      if (unknown && endDate) {
        endDate.disabled = unknown.checked;
        if (unknown.checked) endDate.value = '';
      }
    };

    var formPayload = function (f, stage) {
      var payload = {};
      new FormData(f).forEach(function (value, key) {
        payload[key] = payload[key] !== undefined ? payload[key] + ', ' + value : value;
      });
      payload.stage = stage;
      payload.site_lang = currentLang;
      return payload;
    };

    var postJSON = function (payload) {
      return fetch('/api/intake', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      });
    };

    cForm.addEventListener('change', updateConditionals);
    if (mForm) mForm.addEventListener('change', updateConditionals);
    cForm.querySelectorAll('input[name="language"]').forEach(function (r) {
      r.addEventListener('click', function () { prefLangTouched = true; });
    });

    // Quick form
    cForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!cForm.checkValidity()) { cForm.reportValidity(); return; }
      cError.hidden = true;
      cSubmit.disabled = true;
      var payload = formPayload(cForm, 'quick');

      postJSON(payload)
        .then(function (response) {
          if (!response.ok) { cError.hidden = false; return; }
          if (mForm) {
            mForm.elements['name'].value = payload.name || '';
            mForm.elements['email'].value = payload.email || '';
          }
          cForm.hidden = true;
          setDots(1, 0);
          var frame = cBooking.querySelector('iframe');
          if (frame && frame.getAttribute('src') === 'about:blank') frame.src = frame.getAttribute('data-src');
          cBooking.hidden = false;
          scrollToEl(document.querySelector('.consult-card'));
        })
        .catch(function () { cError.hidden = false; })
        .finally(function () { cSubmit.disabled = false; });
    });

    // Optional details
    if (mOpen && mForm) {
      mOpen.addEventListener('click', function () {
        mForm.hidden = false;
        mOpen.hidden = true;
        setDots(2, 1);
        scrollToEl(mForm);
      });

      mForm.addEventListener('submit', function (e) {
        e.preventDefault();
        mError.hidden = true;
        mSubmit.disabled = true;

        postJSON(formPayload(mForm, 'details'))
          .then(function (response) {
            if (!response.ok) { mError.hidden = false; return; }
            mForm.hidden = true;
            mDone.hidden = false;
            setDots(-1, 2);
            scrollToEl(mDone);
          })
          .catch(function () { mError.hidden = false; })
          .finally(function () { mSubmit.disabled = false; });
      });
    }

    setDots(0, -1);
    updateConditionals();
    syncConsultLang(currentLang);
  }

  // ---- WhatsApp links — routed to a different number per language, see updateWhatsAppLinks() ----

  // ---- Cookie consent + Google Analytics (GA4 loads only after the visitor accepts) ----
  var GA_ID = 'G-NKLTNRKVYV';
  var CONSENT_KEY = 'mann_cookie_consent';
  var cookieBanner = document.getElementById('cookie-banner');
  var gaLoaded = false;

  function readConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }
  function saveConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (e) {}
  }

  function loadAnalytics() {
    if (gaLoaded) return;
    gaLoaded = true;
    window['ga-disable-' + GA_ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
  }

  function removeAnalyticsCookies() {
    var host = location.hostname;
    var domains = [host, '.' + host, '.' + host.replace(/^www\./, '')];
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (name === '_ga' || name.indexOf('_ga_') === 0 || name === '_gid') {
        domains.forEach(function (d) {
          document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=' + d;
        });
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      }
    });
  }

  function showCookieBanner() { if (cookieBanner) cookieBanner.hidden = false; }
  function hideCookieBanner() { if (cookieBanner) cookieBanner.hidden = true; }

  function chooseConsent(value) {
    saveConsent(value);
    hideCookieBanner();
    if (value === 'granted') {
      loadAnalytics();
    } else {
      window['ga-disable-' + GA_ID] = true;
      removeAnalyticsCookies();
    }
  }

  var storedConsent = readConsent();
  if (storedConsent === 'granted') {
    loadAnalytics();
  } else if (storedConsent !== 'denied') {
    showCookieBanner();
  }

  var cookieAccept = document.getElementById('cookie-accept');
  var cookieDecline = document.getElementById('cookie-decline');
  var cookieSettings = document.getElementById('cookie-settings');
  if (cookieAccept) cookieAccept.addEventListener('click', function () { chooseConsent('granted'); });
  if (cookieDecline) cookieDecline.addEventListener('click', function () { chooseConsent('denied'); });
  if (cookieSettings) {
    cookieSettings.addEventListener('click', function (e) {
      e.preventDefault();
      showCookieBanner();
    });
  }

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
