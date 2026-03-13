const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

function createDb({ path, defaultAdminLogin, defaultAdminPassword }) {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      is_published INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'new',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const admin = db.prepare('SELECT id FROM admins WHERE login = ?').get(defaultAdminLogin);
  if (!admin) {
    const hash = bcrypt.hashSync(defaultAdminPassword, 10);
    db.prepare('INSERT INTO admins (login, password_hash) VALUES (?, ?)').run(defaultAdminLogin, hash);
  }

  const home = db.prepare('SELECT id FROM pages WHERE slug = ?').get('home');
  if (!home) {
    db.prepare('INSERT INTO pages (slug, title, body, is_published) VALUES (?, ?, ?, 1)').run(
      'home',
      'Главная страница',
      'Это стартовый шаблон. Отредактируйте текст в админ-панели.'
    );
  }

  return db;
}

module.exports = { createDb };
