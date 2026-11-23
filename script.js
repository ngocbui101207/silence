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
    const isHoverDevice = () => window.matchMedia('(hover: hover)').matches;

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
      previewDelete.addEventListener('click', () => {
        if (!currentBook) return;
        const ok = window.confirm(`Delete "${currentBook.title}" and all its chapters?`);
        if (!ok) return;
        window.LibraryStore.deleteBook(currentBook.id);
        currentBook = null;
        renderBookshelf();
      });
    }

    const renderBookshelf = () => {
      const books = window.LibraryStore.getAll();
      shelfContainer.innerHTML = '';

      if (!books.length) {
        currentBook = null;
        previewCard.hidden = true;
        shelfContainer.innerHTML = `
          <div class="shelf-empty">
            <p>Your bookshelf is empty and ready for your first story.</p>
            <a href="write.html" class="shelf-empty-btn">+ Write Your First Book</a>
          </div>
        `;
        return;
      }

      previewCard.hidden = false;

      books.forEach((book, idx) => {
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

      const keepCurrent = currentBook && books.find((b) => b.id === currentBook.id);
      updatePreview(keepCurrent || books[0]);
    };

    renderBookshelf();

    window.addEventListener('storage', (event) => {
      if (event.key === window.LibraryStore.STORAGE_KEY) {
        renderBookshelf();
      }
    });
    window.addEventListener('focus', renderBookshelf);
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