(function (global) {
  const STORAGE_KEY = 'mourir_damour_library_v1';
  try {
    localStorage.removeItem('laplume_library_v1');
  } catch (e) {
  }

  const toRoman = (num) => {
    const map = [
      [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
      [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
      [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ];
    let n = num;
    let out = '';
    for (const [val, sym] of map) {
      while (n >= val) {
        out += sym;
        n -= val;
      }
    }
    return out || 'I';
  };

  const slugify = (text) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `book-${Date.now()}`;

  const reindexVolumes = (books) =>
    books.map((book, idx) => {
      const genre =
        book.genre ||
        ((book.volumeLabel || '').split('•')[1] || 'Personal Writing').trim();
      return {
        ...book,
        genre,
        volumeLabel: `Volume ${toRoman(idx + 1)} • ${genre}`
      };
    });

  const saveAll = (books) => {
    try {
      const normalized = reindexVolumes(books);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
      return books;
    }
  };

  const getAll = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  const getById = (id) => {
    const books = getAll();
    if (!books.length) return null;
    return books.find((b) => b.id === id) || books[0];
  };

  const todayFormatted = () =>
    new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric'
    });

  const addBook = ({ title, genre, tag, color, size, desc, chapterTitle, chapterContent }) => {
    const books = getAll();
    const nextNum = books.length + 1;
    const baseId = slugify(title);
    const uniqueId = books.some((b) => b.id === baseId)
      ? `${baseId}-${Date.now().toString().slice(-4)}`
      : baseId;
    const ornaments = ['❦', '✦', '❖', '❧', '✧'];
    const cleanGenre = (genre || 'Personal Writing').trim();

    const newBook = {
      id: uniqueId,
      genre: cleanGenre,
      volumeLabel: `Volume ${toRoman(nextNum)} • ${cleanGenre}`,
      title: title.trim(),
      desc: desc.trim(),
      tag: (tag || 'Personal Edition').trim(),
      color: color || 'forest',
      size: size || 'tall',
      ornament: ornaments[(nextNum - 1) % ornaments.length],
      chapters: [
        {
          id: `ch-${Date.now()}`,
          title: (chapterTitle || 'Chương I').trim(),
          date: todayFormatted(),
          content: chapterContent.trim()
        }
      ]
    };

    books.push(newBook);
    const saved = saveAll(books);
    return saved.find((b) => b.id === uniqueId) || newBook;
  };

  const updateBook = (bookId, { title, genre, tag, color, size, desc }) => {
    const books = getAll();
    const idx = books.findIndex((b) => b.id === bookId);
    if (idx === -1) return null;

    const current = books[idx];
    const cleanGenre = (genre || current.genre || 'Personal Writing').trim();
    books[idx] = {
      ...current,
      title: title.trim(),
      genre: cleanGenre,
      volumeLabel: `Volume ${toRoman(idx + 1)} • ${cleanGenre}`,
      desc: desc.trim(),
      tag: (tag || current.tag || 'Personal Edition').trim(),
      color: color || current.color,
      size: size || current.size
    };

    const saved = saveAll(books);
    return saved.find((b) => b.id === bookId) || books[idx];
  };

  const deleteBook = (bookId) => {
    const remaining = getAll().filter((b) => b.id !== bookId);
    return saveAll(remaining);
  };

  const addChapter = (bookId, { title, content }) => {
    const books = getAll();
    const target = books.find((b) => b.id === bookId);
    if (!target) return null;

    const newChapter = {
      id: `ch-${Date.now()}`,
      title: title.trim(),
      date: todayFormatted(),
      content: content.trim()
    };

    target.chapters.push(newChapter);
    saveAll(books);
    return { book: target, chapter: newChapter };
  };

  const updateChapter = (bookId, chapterId, { title, content }) => {
    const books = getAll();
    const book = books.find((b) => b.id === bookId);
    if (!book) return null;

    const chapter = book.chapters.find((ch) => ch.id === chapterId);
    if (!chapter) return null;

    chapter.title = title.trim();
    chapter.content = content.trim();
    saveAll(books);
    return { book, chapter };
  };

  const deleteChapter = (bookId, chapterId) => {
    const books = getAll();
    const target = books.find((b) => b.id === bookId);
    if (!target) return null;

    target.chapters = target.chapters.filter((ch) => ch.id !== chapterId);
    saveAll(books);
    return target;
  };

  global.LibraryStore = {
    STORAGE_KEY,
    toRoman,
    getAll,
    getById,
    addBook,
    updateBook,
    deleteBook,
    addChapter,
    updateChapter,
    deleteChapter
  };
})(window);