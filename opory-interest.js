(() => {
  const form = document.querySelector('#opory-interest-form');
  if (!form) return;
  const message = document.querySelector('#opory-interest-message');
  const button = form.querySelector('button[type="submit"]');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    message.className = 'wide';
    message.textContent = 'Odosielam…';
    button.disabled = true;
    try {
      const response = await fetch('https://bkyappgttwjxakkwycub.supabase.co/functions/v1/opory-interest-submit', {
        method: 'POST',
        headers: { apikey: 'sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4' },
        body: new FormData(form)
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Odoslanie sa nepodarilo.');
      message.className = 'wide success';
      message.textContent = 'Ďakujem. Keď budem mať vhodnú hotovú oporu, ozvem sa vám na uvedený e-mail. Odoslaním nevznikla objednávka.';
      form.reset();
    } catch (error) {
      message.className = 'wide error';
      message.textContent = error.message || 'Odoslanie sa nepodarilo. Skúste to neskôr.';
    } finally { button.disabled = false; }
  });
})();
