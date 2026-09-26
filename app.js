(() => {
  'use strict';
  const film = document.querySelector('#opening-film');
  const toggle = document.querySelector('.film-toggle');
  const scroll = window.HeritageScroll;
  const saveData = Boolean(navigator.connection?.saveData);
  let userPaused = saveData;
  let filmVisible = true;
  let filmFinished = false;
  const filmSection = document.querySelector('.opening-film');
  function updateFilmTitle() {
    filmSection.classList.toggle('film-resolved', film.currentTime >= 5.25 || userPaused);
  }
  film.controls = false;
  film.autoplay = !saveData;
  toggle.hidden = false;
  function renderFilmControl() {
    toggle.setAttribute('aria-pressed', String(userPaused));
    toggle.setAttribute('aria-label', userPaused ? 'Play opening film' : 'Pause opening film');
    toggle.querySelector('.film-state-icon').textContent = userPaused ? '▷' : 'Ⅱ';
    toggle.querySelector('.film-state-label').textContent = userPaused ? 'Play film' : 'Pause film';
    updateFilmTitle();
  }
  function syncFilm() {
    if (filmFinished || film.ended) return;
    if (userPaused || !filmVisible || document.hidden) film.pause();
    else film.play().catch(error => {
      if (error.name === 'AbortError') return;
      userPaused = true;
      renderFilmControl();
    });
  }
  toggle.addEventListener('click', () => {
    userPaused = !userPaused;
    if (film.error) film.load();
    renderFilmControl();
    syncFilm();
  });
  film.addEventListener('error', () => { userPaused = true; renderFilmControl(); });
  film.addEventListener('timeupdate', updateFilmTitle);
  film.addEventListener('ended', () => {
    filmFinished = true;
    filmSection.classList.add('film-resolved');
    toggle.hidden = true;
  });
  new IntersectionObserver(entries => {
    filmVisible = entries[0].isIntersecting;
    syncFilm();
  }, {threshold:.02}).observe(film);
  document.addEventListener('visibilitychange', syncFilm);
  renderFilmControl();
  syncFilm();
  document.fonts.ready.then(() => scroll?.resize());

  const dialog = document.querySelector('.art-dialog');
  const detailImage = dialog.querySelector('img');
  const caption = dialog.querySelector('p');
  let opener = null;
  document.querySelectorAll('[data-art]').forEach(button => {
    button.addEventListener('click', () => {
      opener = button;
      detailImage.src = button.dataset.art;
      detailImage.alt = button.querySelector('img').alt;
      caption.textContent = button.dataset.caption;
      scroll?.pause();
      dialog.showModal();
    });
  });
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    opener?.focus({preventScroll:true});
    scroll?.resume();
  });
})();
