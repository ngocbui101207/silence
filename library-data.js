(function (global) {
  const firebaseConfig = {
    apiKey: "AIzaSyB2Knzep3wjPtA12UFBfIu-kCBl0w0idzg",
    authDomain: "silence-7dc4d.firebaseapp.com",
    projectId: "silence-7dc4d",
    storageBucket: "silence-7dc4d.firebasestorage.app",
    messagingSenderId: "852909474801",
    appId: "1:852909474801:web:b8630c377cb8c5b0f53a50",
    measurementId: "G-YP5SKH82G5"
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const auth = firebase.auth();
  const db = firebase.firestore();
  const booksCol = db.collection('books');

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

  const todayFormatted = () =>
    new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric'
    });

  const formatBook = (doc, index = 0) => {
    const data = doc.data();
    const genre = (data.genre || 'Personal Writing').trim();
    return {
      id: doc.id,
      ...data,
      genre,
      chapters: Array.isArray(data.chapters) ? data.chapters : [],
      volumeLabel: `Volume ${toRoman(index + 1)} • ${genre}`
    };
  };

  const getAll = async () => {
    const snap = await booksCol.orderBy('createdAt', 'asc').get();
    return snap.docs.map((doc, idx) => formatBook(doc, idx));
  };

  const getById = async (id) => {
    const books = await getAll();
    if (!books.length) return null;
    return books.find((b) => b.id === id) || books[0];
  };

  const addBook = async ({ title, genre, tag, color, size, desc, chapterTitle, chapterContent }) => {
    const existing = await getAll();
    const nextNum = existing.length + 1;
    const baseId = slugify(title);
    const uniqueId = existing.some((b) => b.id === baseId)
      ? `${baseId}-${Date.now().toString().slice(-4)}`
      : baseId;
    const ornaments = ['❦', '✦', '❖', '❧', '✧'];
    const cleanGenre = (genre || 'Personal Writing').trim();

    const payload = {
      title: title.trim(),
      genre: cleanGenre,
      desc: desc.trim(),
      tag: (tag || 'Personal Edition').trim(),
      color: color || 'forest',
      size: size || 'tall',
      ornament: ornaments[(nextNum - 1) % ornaments.length],
      createdAt: Date.now(),
      chapters: [
        {
          id: `ch-${Date.now()}`,
          title: (chapterTitle || 'Chương I').trim(),
          date: todayFormatted(),
          content: chapterContent.trim()
        }
      ]
    };

    await booksCol.doc(uniqueId).set(payload);
    return {
      id: uniqueId,
      ...payload,
      volumeLabel: `Volume ${toRoman(nextNum)} • ${cleanGenre}`
    };
  };

  const updateBook = async (bookId, { title, genre, tag, color, size, desc }) => {
    const cleanGenre = (genre || 'Personal Writing').trim();
    await booksCol.doc(bookId).update({
      title: title.trim(),
      genre: cleanGenre,
      desc: desc.trim(),
      tag: (tag || 'Personal Edition').trim(),
      color: color || 'forest',
      size: size || 'tall'
    });
    return getById(bookId);
  };

  const deleteBook = async (bookId) => {
    await booksCol.doc(bookId).delete();
  };

  const addChapter = async (bookId, { title, content }) => {
    const book = await getById(bookId);
    if (!book) return null;

    const newChapter = {
      id: `ch-${Date.now()}`,
      title: title.trim(),
      date: todayFormatted(),
      content: content.trim()
    };

    const chapters = [...book.chapters, newChapter];
    await booksCol.doc(bookId).update({ chapters });
    return { book: { ...book, chapters }, chapter: newChapter };
  };

  const updateChapter = async (bookId, chapterId, { title, content }) => {
    const book = await getById(bookId);
    if (!book) return null;

    let updatedChapter = null;
    const chapters = book.chapters.map((ch) => {
      if (ch.id !== chapterId) return ch;
      updatedChapter = { ...ch, title: title.trim(), content: content.trim() };
      return updatedChapter;
    });

    if (!updatedChapter) return null;
    await booksCol.doc(bookId).update({ chapters });
    return { book: { ...book, chapters }, chapter: updatedChapter };
  };

  const deleteChapter = async (bookId, chapterId) => {
    const book = await getById(bookId);
    if (!book) return null;

    const chapters = book.chapters.filter((ch) => ch.id !== chapterId);
    await booksCol.doc(bookId).update({ chapters });
    return { ...book, chapters };
  };

  const login = (email, password) => auth.signInWithEmailAndPassword(email, password);
  const logout = () => auth.signOut();
  const onAuthChange = (cb) => auth.onAuthStateChanged(cb);
  const isAuthor = () => Boolean(auth.currentUser);

  global.LibraryStore = {
    toRoman,
    getAll,
    getById,
    addBook,
    updateBook,
    deleteBook,
    addChapter,
    updateChapter,
    deleteChapter,
    login,
    logout,
    onAuthChange,
    isAuthor
  };
})(window);