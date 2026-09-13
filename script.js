const LAST_PAGE_KEY = 'weddingWebsiteLastPage';
const validPages = ['home', 'aboutus', 'schedule', 'faq', 'rsvp'];

async function loadNavbar() {
  const response = await fetch('navbar.html');
  const html = await response.text();

  document.getElementById('navbar').innerHTML = html;

  const savedPage = localStorage.getItem(LAST_PAGE_KEY);
  const initialPage = validPages.includes(savedPage) ? savedPage : 'home';

  loadPage(initialPage);
}

async function loadPage(pageName) {
  // Prevent invalid or outdated saved page names
  if (!validPages.includes(pageName)) {
    pageName = 'home';
  }

  const response = await fetch(`pages/${pageName}.html`);
  const html = await response.text();

  document.getElementById('app').innerHTML = html;
  // Remember the page only after it loads successfully
  localStorage.setItem(LAST_PAGE_KEY, pageName);

  /*
   * Initialize page-specific features after the page HTML
   * has been inserted.
   *
   * This function safely does nothing when the current page
   * does not contain a carousel.
   */
  initializeAboutCarousel();

  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.page === pageName);
  });

  window.scrollTo({
    top: 0,
    behavior: 'instant',
  });
}

/* Handle navbar and buttons inside loaded pages */

document.addEventListener('click', (event) => {
  const pageLink = event.target.closest('[data-page]');

  if (!pageLink) {
    return;
  }

  loadPage(pageLink.dataset.page);
});

/* =========================
   ABOUT PHOTO CAROUSEL
========================= */

function initializeAboutCarousel() {
  const carousel = document.querySelector('.photo-carousel');

  if (!carousel) {
    return;
  }

  const track = carousel.querySelector('.carousel-track');

  const slides = Array.from(carousel.querySelectorAll('.carousel-slide'));

  const previousButton = carousel.querySelector('.carousel-previous');

  const nextButton = carousel.querySelector('.carousel-next');

  const dotsContainer = carousel.querySelector('.carousel-dots');

  if (
    !track ||
    slides.length === 0 ||
    !previousButton ||
    !nextButton ||
    !dotsContainer
  ) {
    return;
  }

  let activeIndex = 0;
  let scrollTimer;

  /* Make sure neither button is disabled */

  previousButton.disabled = false;
  nextButton.disabled = false;

  /* Create navigation dots */

  dotsContainer.innerHTML = '';

  slides.forEach((slide, index) => {
    const dot = document.createElement('button');

    dot.type = 'button';
    dot.className = 'carousel-dot';
    dot.setAttribute('aria-label', `Go to photo ${index + 1}`);

    dot.addEventListener('click', () => {
      goToSlide(index);
    });

    dotsContainer.appendChild(dot);
  });

  const dots = Array.from(dotsContainer.querySelectorAll('.carousel-dot'));

  function updateDots() {
    dots.forEach((dot, index) => {
      const isActive = index === activeIndex;

      dot.classList.toggle('is-active', isActive);

      if (isActive) {
        dot.setAttribute('aria-current', 'true');
      } else {
        dot.removeAttribute('aria-current');
      }
    });
  }

  function goToSlide(index) {
    /*
     * Modulo makes the carousel loop:
     * 5 becomes 0
     * -1 becomes 4
     */
    activeIndex = (index + slides.length) % slides.length;

    track.scrollTo({
      left: slides[activeIndex].offsetLeft,
      behavior: 'smooth',
    });

    updateDots();
  }

  /* Previous and next buttons */

  previousButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    goToSlide(activeIndex - 1);
  });

  nextButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    goToSlide(activeIndex + 1);
  });

  /* Detect mobile swiping */

  track.addEventListener('scroll', () => {
    window.clearTimeout(scrollTimer);

    scrollTimer = window.setTimeout(() => {
      const trackLeft = track.getBoundingClientRect().left;

      let closestIndex = 0;
      let closestDistance = Infinity;

      slides.forEach((slide, index) => {
        const slideLeft = slide.getBoundingClientRect().left;

        const distance = Math.abs(slideLeft - trackLeft);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      activeIndex = closestIndex;
      updateDots();
    }, 150);
  });

  /* Keyboard navigation */

  carousel.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToSlide(activeIndex - 1);
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToSlide(activeIndex + 1);
    }
  });

  /* Keep the active photo aligned after resizing */

  window.addEventListener('resize', () => {
    track.scrollTo({
      left: slides[activeIndex].offsetLeft,
      behavior: 'auto',
    });
  });

  updateDots();
}

/* Start the website */

loadNavbar();
