document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.getElementById('primary-nav');
  const navLinks = document.querySelectorAll('.nav-link');

  const closeMenu = () => {
    if (!navToggle || !siteNav) return;
    navToggle.setAttribute('aria-expanded', 'false');
    siteNav.classList.remove('is-open');
  };

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!isExpanded));
      siteNav.classList.toggle('is-open', !isExpanded);
    });

    navLinks.forEach((link) => link.addEventListener('click', closeMenu));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.site-header')) closeMenu();
    });
  }

  const header = document.querySelector('.site-header');
  const handleScroll = () => {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 12);
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  const shelfContainer = document.getElementById('shelf-books');
  const previewCard = document.getElementById('book-preview');
  const previewVolume = document.getElementById('preview-volume');
  const previewTitle = document.getElementById('preview-title');
  const previewDesc = document.getElementById('preview-desc');
  const previewTag = document.getElementById('preview-tag');
  const previewLink = document.getElementById('preview-link');
  const previewEdit = document.getElementById('preview-edit');
  const previewDelete = document.getElementById('preview-delete');

  const escapeHtml = (str = '') =>
    String(str).replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));

  if (shelfContainer && previewCard && window.LibraryStore) {
    let updateTimer;
    let currentBook = null;
    let cachedBooks = [];
    const previewActionsRight = previewCard.querySelector('.reading-actions-right');
    const isHoverDevice = () => window.matchMedia('(hover: hover)').matches;

    const syncAuthorUI = (user) => {
      if (previewActionsRight) {
        previewActionsRight.style.display = user ? 'flex' : 'none';
      }
      const emptyBtn = shelfContainer.querySelector('.shelf-empty-btn');
      if (emptyBtn) {
        emptyBtn.style.display = user ? 'inline-block' : 'none';
      }
    };

    const updatePreview = (book) => {
      if (!book) return;
      currentBook = book;

      clearTimeout(updateTimer);
      previewCard.classList.add('is-updating');

      updateTimer = setTimeout(() => {
        const chapterCount = book.chapters ? book.chapters.length : 0;
        const volumeText = `${book.volumeLabel} • ${chapterCount} ${chapterCount === 1 ? 'Chapter' : 'Chapters'}`;
        if (previewVolume) previewVolume.textContent = volumeText;
        if (previewTitle) previewTitle.textContent = book.title;
        if (previewDesc) previewDesc.textContent = book.desc;
        if (previewTag) previewTag.textContent = book.tag;
        if (previewLink) {
          previewLink.setAttribute('href', `reader.html?id=${encodeURIComponent(book.id)}`);
        }
        if (previewEdit) {
          previewEdit.setAttribute('href', `write.html?mode=edit&book=${encodeURIComponent(book.id)}`);
        }
        previewCard.classList.remove('is-updating');
      }, 100);
    };

    if (previewDelete) {
      previewDelete.addEventListener('click', async () => {
        if (!currentBook) return;
        const ok = window.confirm(`Delete "${currentBook.title}" and all its chapters?`);
        if (!ok) return;
        try {
          await window.LibraryStore.deleteBook(currentBook.id);
          currentBook = null;
          await renderBookshelf();
        } catch (err) {
          alert(`Unable to delete: ${err.message}`);
        }
      });
    }

    const renderBookshelf = async () => {
      if (!cachedBooks.length) {
        shelfContainer.innerHTML = `<div class="shelf-empty"><p>Opening the library...</p></div>`;
      }

      try {
        cachedBooks = await window.LibraryStore.getAll();
      } catch (err) {
        shelfContainer.innerHTML = `<div class="shelf-empty"><p>Could not load books right now.</p></div>`;
        console.error(err);
        return;
      }

      shelfContainer.innerHTML = '';

      if (!cachedBooks.length) {
        currentBook = null;
        previewCard.hidden = true;
        shelfContainer.innerHTML = `
          <div class="shelf-empty">
            <p>The bookshelf is waiting for its first story.</p>
            <a href="write.html" class="shelf-empty-btn" style="display: none;">+ Write Your First Book</a>
          </div>
        `;
        syncAuthorUI(window.LibraryStore.isAuthor());
        return;
      }

      previewCard.hidden = false;

      cachedBooks.forEach((book, idx) => {
        const usePaperLabel = book.color === 'moss' || book.color === 'rose';
        const titleClass = usePaperLabel ? 'spine-label' : 'spine-title';
        const roman = window.LibraryStore.toRoman(idx + 1);
        const btn = document.createElement('button');

        btn.type = 'button';
        btn.className = 'book-slot';
        btn.setAttribute('role', 'listitem');
        btn.setAttribute('aria-pressed', 'false');
        btn.title = `Click to open "${book.title}"`;

        btn.innerHTML = `
          <span class="book book--${escapeHtml(book.color)} book--${escapeHtml(book.size)}">
            <span class="book-top-pages" aria-hidden="true"></span>
            <span class="book-side-cover" aria-hidden="true"></span>
            <span class="book-spine">
              <span class="spine-band"></span>
              <span class="spine-numeral">${roman}</span>
              <span class="${titleClass}">${escapeHtml(book.title)}</span>
              <span class="spine-ornament" aria-hidden="true">${escapeHtml(book.ornament || '❦')}</span>
              <span class="spine-band"></span>
            </span>
          </span>
        `;

        btn.addEventListener('mouseenter', () => {
          shelfContainer.querySelectorAll('.book-slot.is-pulled').forEach((s) => {
            if (s !== btn) {
              s.classList.remove('is-pulled');
              s.setAttribute('aria-pressed', 'false');
            }
          });
          updatePreview(book);
        });

        btn.addEventListener('focus', () => updatePreview(book));

        btn.addEventListener('click', () => {
          const alreadyPulled = btn.classList.contains('is-pulled');
          if (isHoverDevice() || alreadyPulled) {
            window.open(`reader.html?id=${encodeURIComponent(book.id)}`, '_blank', 'noopener');
            return;
          }
          shelfContainer.querySelectorAll('.book-slot').forEach((s) => {
            s.classList.remove('is-pulled');
            s.setAttribute('aria-pressed', 'false');
          });
          btn.classList.add('is-pulled');
          btn.setAttribute('aria-pressed', 'true');
          updatePreview(book);
        });

        shelfContainer.appendChild(btn);
      });

      const keepCurrent = currentBook && cachedBooks.find((b) => b.id === currentBook.id);
      updatePreview(keepCurrent || cachedBooks[0]);
      syncAuthorUI(window.LibraryStore.isAuthor());
    };

    window.LibraryStore.onAuthChange(syncAuthorUI);
    renderBookshelf();
  }
  const accordionGroups = document.querySelectorAll('[data-accordion]');
  accordionGroups.forEach((group) => {
    const triggers = group.querySelectorAll('.accordion-trigger');
    triggers.forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const isOpen = trigger.getAttribute('aria-expanded') === 'true';
        const targetPanel = document.getElementById(
          trigger.getAttribute('aria-controls')
        );

        triggers.forEach((otherTrigger) => {
          if (otherTrigger !== trigger) {
            otherTrigger.setAttribute('aria-expanded', 'false');
            const otherPanel = document.getElementById(
              otherTrigger.getAttribute('aria-controls')
            );
            if (otherPanel) otherPanel.classList.remove('is-open');
          }
        });

        trigger.setAttribute('aria-expanded', String(!isOpen));
        if (targetPanel) targetPanel.classList.toggle('is-open', !isOpen);
      });
    });
  });

  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});