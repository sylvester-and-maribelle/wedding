async function loadNavbar() {
  const response = await fetch('navbar.html');
  const html = await response.text();

  document.getElementById('navbar').innerHTML = html;

  setupNavigation();
}

async function loadPage(pageName) {
  const response = await fetch(`pages/${pageName}.html`);
  const html = await response.text();

  document.getElementById('app').innerHTML = html;

  // Update active navbar item
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.page === pageName);
  });

  window.scrollTo({
    top: 0,
    behavior: 'instant',
  });
}

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      loadPage(item.dataset.page);
    });
  });

  // Load home when website first opens
  loadPage('home');
}

loadNavbar();

/*
    // blue glow — top right 
    radial-gradient(
      450px 380px at 95% 4%,
      rgba(35, 85, 180, 0.09),
      transparent 100%
    ),
    // blue glow — middle left
    radial-gradient(
        420px 500px at -5% 48%,
        rgba(35, 85, 180, 0.055),
        transparent 100%
      ),
    //blue glow — lower right 
    radial-gradient(
        420px 480px at 105% 82%,
        rgba(35, 85, 180, 0.05),
        transparent 100%
      );

*/
