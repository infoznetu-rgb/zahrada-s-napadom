(() => {
  const root = document.documentElement;
  root.classList.add('js');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('.site-header');

  const updateHeader = () => {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  };
  updateHeader();
  window.addEventListener('scroll', updateHeader, {passive:true});

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const targets = document.querySelectorAll([
      '.section-head',
      '.cms-post-card',
      '.project-showcase',
      '.video-card',
      '.community-card',
      '.side-card',
      '.quick a',
      '.submit-grid > *',
      '.contact > *',
      '.project-contact-box'
    ].join(','));

    targets.forEach((el, index) => {
      el.classList.add('reveal-ready');
      el.dataset.delay = String(index % 4);
    });

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, {rootMargin:'0px 0px -8% 0px', threshold:0.08});

    targets.forEach(el => observer.observe(el));
  }

  const hero = document.querySelector('.hero-main');
  if (hero && !reduceMotion && window.matchMedia('(pointer:fine)').matches) {
    hero.addEventListener('pointermove', event => {
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      hero.style.setProperty('--hero-x', `${x.toFixed(1)}%`);
      hero.style.setProperty('--hero-y', `${y.toFixed(1)}%`);
    }, {passive:true});
  }

  if (document.querySelector('.post-page')) {
    const progress = document.createElement('div');
    progress.className = 'reading-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progress);

    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const value = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progress.style.transform = `scaleX(${value})`;
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, {passive:true});
    window.addEventListener('resize', updateProgress, {passive:true});
  }

  let lightbox;
  const ensureLightbox = () => {
    if (lightbox) return lightbox;
    lightbox = document.createElement('dialog');
    lightbox.className = 'studio-lightbox';
    lightbox.innerHTML = '<button type="button" aria-label="Zavrieť fotografiu">×</button><img alt="">';
    document.body.appendChild(lightbox);

    const close = () => lightbox.close();
    lightbox.querySelector('button').addEventListener('click', close);
    lightbox.addEventListener('click', event => {
      if (event.target === lightbox) close();
    });
    lightbox.addEventListener('cancel', event => {
      event.preventDefault();
      close();
    });
    return lightbox;
  };

  document.addEventListener('click', event => {
    const image = event.target.closest('.dynamic-gallery-item img');
    if (!image) return;
    const dialog = ensureLightbox();
    const target = dialog.querySelector('img');
    target.src = image.currentSrc || image.src;
    target.alt = image.alt || 'Fotografia projektu';
    if (typeof dialog.showModal === 'function') dialog.showModal();
  });

  const watchDynamicCards = document.querySelector('#cms-projects');
  if (watchDynamicCards && !reduceMotion && 'MutationObserver' in window) {
    const mutationObserver = new MutationObserver(() => {
      watchDynamicCards.querySelectorAll('.cms-post-card:not(.studio-enhanced)').forEach((card, index) => {
        card.classList.add('studio-enhanced', 'reveal-ready');
        card.dataset.delay = String(index % 4);
        requestAnimationFrame(() => card.classList.add('is-visible'));
      });
    });
    mutationObserver.observe(watchDynamicCards, {childList:true});
  }
})();