require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const { createDb } = require('./db');
const { signAdminToken, requireAdmin } = require('./auth');

const PORT = Number(process.env.PORT || 3000);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data.sqlite');
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';
const DEFAULT_ADMIN_LOGIN = process.env.DEFAULT_ADMIN_LOGIN || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

const db = createDb({
  path: DB_PATH,
  defaultAdminLogin: DEFAULT_ADMIN_LOGIN,
  defaultAdminPassword: DEFAULT_ADMIN_PASSWORD
});

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.get('/api/public/pages', (req, res) => {
  const pages = db.prepare('SELECT id, slug, title, body, updated_at FROM pages WHERE is_published = 1 ORDER BY id DESC').all();
  res.json(pages);
});

app.post('/api/leads', (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Заполните все поля формы' });
  }
  const stmt = db.prepare('INSERT INTO leads (name, email, message) VALUES (?, ?, ?)');
  const info = stmt.run(String(name).trim(), String(email).trim(), String(message).trim());
  return res.status(201).json({ id: info.lastInsertRowid, message: 'Заявка отправлена' });
});

app.post('/api/admin/login', (req, res) => {
  const { login, password } = req.body || {};
  const admin = db.prepare('SELECT id, password_hash FROM admins WHERE login = ?').get(login);
  if (!admin) {
    return res.status(401).json({ message: 'Неверный логин или пароль' });
  }

  const ok = bcrypt.compareSync(password || '', admin.password_hash);
  if (!ok) {
    return res.status(401).json({ message: 'Неверный логин или пароль' });
  }

  const token = signAdminToken(admin.id, JWT_SECRET, JWT_EXPIRES);
  return res.json({ token });
});

const adminOnly = requireAdmin(JWT_SECRET);

app.get('/api/admin/stats', adminOnly, (req, res) => {
  const leadsCount = db.prepare('SELECT COUNT(*) AS count FROM leads').get().count;
  const newLeads = db.prepare("SELECT COUNT(*) AS count FROM leads WHERE status = 'new'").get().count;
  const pagesCount = db.prepare('SELECT COUNT(*) AS count FROM pages').get().count;
  res.json({ leadsCount, newLeads, pagesCount });
});

app.get('/api/admin/pages', adminOnly, (req, res) => {
  const pages = db.prepare('SELECT * FROM pages ORDER BY updated_at DESC').all();
  res.json(pages);
});

app.post('/api/admin/pages', adminOnly, (req, res) => {
  const { slug, title, body, is_published = 1 } = req.body || {};
  if (!slug || !title || !body) {
    return res.status(400).json({ message: 'slug, title и body обязательны' });
  }
  try {
    const info = db
      .prepare('INSERT INTO pages (slug, title, body, is_published, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)')
      .run(slug, title, body, Number(Boolean(is_published)));
    return res.status(201).json({ id: info.lastInsertRowid });
  } catch (err) {
    return res.status(400).json({ message: 'Слаг уже используется' });
  }
});

app.put('/api/admin/pages/:id', adminOnly, (req, res) => {
  const { title, body, is_published = 1 } = req.body || {};
  const id = Number(req.params.id);
  const info = db
    .prepare('UPDATE pages SET title = ?, body = ?, is_published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(title, body, Number(Boolean(is_published)), id);
  if (!info.changes) {
    return res.status(404).json({ message: 'Страница не найдена' });
  }
  return res.json({ ok: true });
});

app.delete('/api/admin/pages/:id', adminOnly, (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare('DELETE FROM pages WHERE id = ?').run(id);
  if (!info.changes) {
    return res.status(404).json({ message: 'Страница не найдена' });
  }
  return res.json({ ok: true });
});

app.get('/api/admin/leads', adminOnly, (req, res) => {
  const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
  res.json(leads);
});

app.patch('/api/admin/leads/:id/status', adminOnly, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!['new', 'in_progress', 'done'].includes(status)) {
    return res.status(400).json({ message: 'Неверный статус' });
  }
  const info = db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, id);
  if (!info.changes) {
    return res.status(404).json({ message: 'Заявка не найдена' });
  }
  return res.json({ ok: true });
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
