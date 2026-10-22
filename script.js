const LAST_PAGE_KEY = 'weddingWebsiteLastPage';
const validPages = ['home', 'aboutus', 'schedule', 'faq', 'rsvp'];

// Carousel settings
const CAROUSEL_INTERVAL = 4000; // 4 seconds

let cleanupCarousel = null;
let cleanupScrollReveal = null;
let pageLoadId = 0;

/* =========================
   NAVBAR AND PAGE LOADING
========================= */

async function loadNavbar() {
  const response = await fetch('navbar.html');

  if (!response.ok) {
    throw new Error('Failed to load navbar');
  }

  const html = await response.text();

  document.getElementById('navbar').innerHTML = html;

  const savedPage = localStorage.getItem(LAST_PAGE_KEY);
  const initialPage = validPages.includes(savedPage) ? savedPage : 'home';

  await loadPage(initialPage);
}

async function loadPage(pageName) {
  if (!validPages.includes(pageName)) {
    pageName = 'home';
  }

  const currentLoadId = ++pageLoadId;

  try {
    const response = await fetch(`pages/${pageName}.html`);

    if (!response.ok) {
      throw new Error(`Failed to load ${pageName}`);
    }

    const html = await response.text();

    // Ignore outdated responses if guests navigate quickly
    if (currentLoadId !== pageLoadId) {
      return;
    }

    // Clean up the previous carousel
    if (cleanupScrollReveal) {
      cleanupScrollReveal();
      cleanupScrollReveal = null;
    }

    if (cleanupCarousel) {
      cleanupCarousel();
      cleanupCarousel = null;
    }

    document.getElementById('app').innerHTML = html;

    // Remember the successfully loaded page
    localStorage.setItem(LAST_PAGE_KEY, pageName);

    // Initialize carousel only when present
    cleanupCarousel = initializeAboutCarousel();

    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.page === pageName);
    });

    window.scrollTo({
      top: 0,
      behavior: 'instant',
    });

    cleanupScrollReveal = initializeScrollReveal();
  } catch (error) {
    console.error('Page loading error:', error);
  }
}

/* =========================
   NAVIGATION CLICK HANDLER
========================= */

document.addEventListener('click', (event) => {
  const pageLink = event.target.closest('[data-page]');

  if (!pageLink) {
    return;
  }

  event.preventDefault();

  loadPage(pageLink.dataset.page);
});

/* =========================
   GENTLE SCROLL REVEALS
========================= */

function initializeScrollReveal() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (
    reducedMotion.matches ||
    !('IntersectionObserver' in window) ||
    !('animate' in Element.prototype)
  ) {
    return null;
  }

  const animations = new Set();
  const targets = document.querySelectorAll(
    '#app .hero, #app .couple-heading, #app .couple-layout, ' +
    '#app .about-header, #app .about-story, #app .gallery-heading, ' +
    '#app .photo-carousel, #app .about-fun > .about-eyebrow, #app .qa-item, ' +
    '#app .schedule-header, #app .schedule-day > .date, ' +
    '#app .timeline-event, #app .attire-section, ' +
    '#app .faq-header, #app .faq-section-heading, #app .faq-item'
  );

  // Content stays visible by default, including when animations are unsupported.
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      observer.unobserve(entry.target);

      const animation = entry.target.animate(
        [
          { opacity: 0, transform: 'translateY(12px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 500, easing: 'ease-out' }
      );

      animations.add(animation);
      animation.onfinish = () => animations.delete(animation);
    });
  }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });

  targets.forEach((target) => observer.observe(target));

  // Reveal focused content immediately for keyboard users.
  function handleFocus(event) {
    targets.forEach((target) => {
      if (target.contains(event.target)) {
        observer.unobserve(target);
        animations.forEach((animation) => {
          if (animation.effect.target === target) animation.cancel();
        });
      }
    });
  }

  function stopReveals() {
    observer.disconnect();
    animations.forEach((animation) => animation.cancel());
    animations.clear();
  }

  function handleMotionChange() {
    if (reducedMotion.matches) stopReveals();
  }

  document.addEventListener('focusin', handleFocus);
  reducedMotion.addEventListener('change', handleMotionChange);

  return function cleanup() {
    stopReveals();
    document.removeEventListener('focusin', handleFocus);
    reducedMotion.removeEventListener('change', handleMotionChange);
  };
}

/* =========================
   ABOUT PHOTO CAROUSEL
========================= */

function initializeAboutCarousel() {
  const carousel = document.querySelector('.photo-carousel');

  if (!carousel) {
    return null;
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
    return null;
  }

  let activeIndex = 0;
  let scrollTimer = null;
  let autoScrollTimer = null;

  let isHovering = false;
  let isInteracting = false;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* =========================
     INITIAL BUTTON SETTINGS
  ========================= */

  previousButton.disabled = false;
  nextButton.disabled = false;

  /* =========================
     CREATE NAVIGATION DOTS
  ========================= */

  dotsContainer.innerHTML = '';

  slides.forEach((slide, index) => {
    const dot = document.createElement('button');

    dot.type = 'button';
    dot.className = 'carousel-dot';

    dot.setAttribute('aria-label', `Go to photo ${index + 1}`);

    dot.addEventListener('click', () => {
      goToSlide(index);
      restartAutoScroll();
    });

    dotsContainer.appendChild(dot);
  });

  const dots = Array.from(dotsContainer.querySelectorAll('.carousel-dot'));

  /* =========================
     UPDATE DOT INDICATORS
  ========================= */

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

  /* =========================
     GO TO SPECIFIC SLIDE
  ========================= */

  function goToSlide(index) {
    // Loop infinitely
    activeIndex = (index + slides.length) % slides.length;

    track.scrollTo({
      left: slides[activeIndex].offsetLeft,
      behavior: reducedMotion.matches ? 'instant' : 'smooth',
    });

    updateDots();
  }

  /* =========================
     AUTOMATIC SCROLLING
  ========================= */

  function stopAutoScroll() {
    if (autoScrollTimer !== null) {
      window.clearInterval(autoScrollTimer);
      autoScrollTimer = null;
    }
  }

  function canAutoScroll() {
    return (
      slides.length > 1 &&
      !isHovering &&
      !isInteracting &&
      !document.hidden &&
      !reducedMotion.matches
    );
  }

  function startAutoScroll() {
    stopAutoScroll();

    if (!canAutoScroll()) {
      return;
    }

    autoScrollTimer = window.setInterval(() => {
      if (canAutoScroll()) {
        goToSlide(activeIndex + 1);
      }
    }, CAROUSEL_INTERVAL);
  }

  function restartAutoScroll() {
    startAutoScroll();
  }

  /* =========================
     PREVIOUS / NEXT BUTTONS
  ========================= */

  previousButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    goToSlide(activeIndex - 1);
    restartAutoScroll();
  });

  nextButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    goToSlide(activeIndex + 1);
    restartAutoScroll();
  });

  // Ignore clicks generated by a swipe or drag across the photograph.
  let photoPointerStart = null;
  let photoWasDragged = false;

  function handlePhotoPointerDown(event) {
    photoPointerStart = { x: event.clientX, y: event.clientY };
    photoWasDragged = false;
  }

  function handlePhotoPointerMove(event) {
    if (!photoPointerStart) return;

    if (
      Math.abs(event.clientX - photoPointerStart.x) > 10 ||
      Math.abs(event.clientY - photoPointerStart.y) > 10
    ) {
      photoWasDragged = true;
    }
  }

  function handlePhotoPointerCancel() {
    photoPointerStart = null;
    photoWasDragged = true;
  }

  function handlePhotoClick(event) {
    if (photoWasDragged || !event.target.closest('.carousel-slide')) return;

    const bounds = track.getBoundingClientRect();
    const direction = event.clientX < bounds.left + bounds.width / 2 ? -1 : 1;

    goToSlide(activeIndex + direction);
    restartAutoScroll();
  }

  function preventPhotoDrag(event) {
    event.preventDefault();
  }

  track.addEventListener('pointerdown', handlePhotoPointerDown);
  track.addEventListener('pointermove', handlePhotoPointerMove);
  track.addEventListener('pointercancel', handlePhotoPointerCancel);
  track.addEventListener('click', handlePhotoClick);
  track.addEventListener('dragstart', preventPhotoDrag);

  /* =========================
     PAUSE ON HOVER
  ========================= */

  function handleMouseEnter() {
    isHovering = true;
    stopAutoScroll();
  }

  function handleMouseLeave() {
    isHovering = false;
    startAutoScroll();
  }

  carousel.addEventListener('mouseenter', handleMouseEnter);
  carousel.addEventListener('mouseleave', handleMouseLeave);

  /* =========================
     MOBILE TOUCH SUPPORT
  ========================= */

  function handleTouchStart() {
    isInteracting = true;
    stopAutoScroll();
  }

  function handleTouchEnd() {
    isInteracting = false;
    restartAutoScroll();
  }

  track.addEventListener('touchstart', handleTouchStart, {
    passive: true,
  });

  track.addEventListener('touchend', handleTouchEnd, {
    passive: true,
  });

  track.addEventListener('touchcancel', handleTouchEnd, {
    passive: true,
  });

  /* =========================
     DETECT MANUAL SCROLLING
  ========================= */

  function handleScroll() {
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
  }

  track.addEventListener('scroll', handleScroll);

  /* =========================
     KEYBOARD NAVIGATION
  ========================= */

  function handleKeydown(event) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();

      goToSlide(activeIndex - 1);
      restartAutoScroll();
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();

      goToSlide(activeIndex + 1);
      restartAutoScroll();
    }
  }

  carousel.addEventListener('keydown', handleKeydown);

  /* =========================
     HANDLE WINDOW RESIZE
  ========================= */

  function handleResize() {
    track.scrollTo({
      left: slides[activeIndex].offsetLeft,
      behavior: 'instant',
    });
  }

  window.addEventListener('resize', handleResize);

  /* =========================
     PAUSE WHEN TAB IS HIDDEN
  ========================= */

  function handleVisibilityChange() {
    if (document.hidden) {
      stopAutoScroll();
    } else {
      startAutoScroll();
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);

  /* =========================
     ACCESSIBILITY
  ========================= */

  function handleMotionChange() {
    startAutoScroll();
  }

  reducedMotion.addEventListener('change', handleMotionChange);

  /* =========================
     INITIALIZE CAROUSEL
  ========================= */

  updateDots();
  startAutoScroll();

  /* =========================
     CLEANUP WHEN LEAVING PAGE
  ========================= */

  return function cleanup() {
    stopAutoScroll();
    window.clearTimeout(scrollTimer);

    carousel.removeEventListener('mouseenter', handleMouseEnter);

    carousel.removeEventListener('mouseleave', handleMouseLeave);

    track.removeEventListener('touchstart', handleTouchStart);

    track.removeEventListener('touchend', handleTouchEnd);

    track.removeEventListener('touchcancel', handleTouchEnd);

    track.removeEventListener('scroll', handleScroll);

    track.removeEventListener('pointerdown', handlePhotoPointerDown);
    track.removeEventListener('pointermove', handlePhotoPointerMove);
    track.removeEventListener('pointercancel', handlePhotoPointerCancel);
    track.removeEventListener('click', handlePhotoClick);
    track.removeEventListener('dragstart', preventPhotoDrag);

    carousel.removeEventListener('keydown', handleKeydown);

    window.removeEventListener('resize', handleResize);

    document.removeEventListener('visibilitychange', handleVisibilityChange);

    reducedMotion.removeEventListener('change', handleMotionChange);
  };
}

/* =========================
   START WEBSITE
========================= */

loadNavbar();
