// Google CMP handles TCF consent. Local app preferences never grant ad consent.
(() => {
  window.googlefc = window.googlefc || {};
  window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
  window.googlefc.callbackQueue.push({
    CONSENT_API_READY: () => {
      if (typeof window.__tcfapi !== 'function') return;
      window.__tcfapi('addEventListener', 0, (data, success) => {
        document.querySelectorAll('[data-ad-consent-settings]').forEach(button => {
          button.hidden = !(success && data && data.gdprApplies);
          if (button.dataset.ready) return;
          button.dataset.ready = '1';
          button.addEventListener('click', () => {
            window.googlefc.callbackQueue.push({
              CONSENT_API_READY: () => window.googlefc.showRevocationMessage(),
            });
          });
        });
      });
    },
  });
})();
