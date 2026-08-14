async function loadNavbar() {
  const response = await fetch('navbar.html');
  const html = await response.text();

  document.getElementById('navbar').innerHTML = html;

  loadPage('home');
}

async function loadPage(pageName) {
  const response = await fetch(`pages/${pageName}.html`);
  const html = await response.text();

  document.getElementById('app').innerHTML = html;

  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.page === pageName);
  });

  window.scrollTo({
    top: 0,
    behavior: 'instant',
  });
}

/* Handle navbar + buttons inside loaded pages */
document.addEventListener('click', (event) => {
  const pageLink = event.target.closest('[data-page]');

  if (!pageLink) return;

  loadPage(pageLink.dataset.page);
});

loadNavbar();
