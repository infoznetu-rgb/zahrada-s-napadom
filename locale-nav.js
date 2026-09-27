document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.ml-header').forEach(function (header) {
    var button = header.querySelector('.ml-menu');
    var nav = header.querySelector('.ml-nav');
    if (!button || !nav) return;
    function close() { nav.classList.remove('open'); button.setAttribute('aria-expanded', 'false'); }
    button.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      button.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function (event) { if (event.target.closest('a')) close(); });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') close(); });
    document.addEventListener('click', function (event) { if (!header.contains(event.target)) close(); });
  });
});
