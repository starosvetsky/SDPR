const tokenKey = 'sdpr_admin_token';

function getToken() {
  return localStorage.getItem(tokenKey);
}

function setToken(token) {
  localStorage.setItem(tokenKey, token);
}

async function api(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem(tokenKey);
  }
  return res;
}

async function login(login, password) {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Ошибка входа');
  setToken(data.token);
}

function renderLeads(leads) {
  const box = document.getElementById('leads-list');
  box.innerHTML = leads
    .map(
      (lead) => `<div class="item">
        <strong>${lead.name}</strong> (${lead.email})<br/>
        <p>${lead.message}</p>
        <small>${lead.created_at}</small>
        <div>
          <select data-lead-id="${lead.id}">
            ${['new', 'in_progress', 'done']
              .map((status) => `<option ${status === lead.status ? 'selected' : ''} value="${status}">${status}</option>`)
              .join('')}
          </select>
        </div>
      </div>`
    )
    .join('');

  box.querySelectorAll('select[data-lead-id]').forEach((el) => {
    el.addEventListener('change', async () => {
      await api(`/api/admin/leads/${el.dataset.leadId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: el.value })
      });
      await loadDashboard();
    });
  });
}

function renderPages(pages) {
  const box = document.getElementById('pages-list');
  box.innerHTML = pages
    .map(
      (p) => `<div class="item">
        <strong>${p.title}</strong> <small>/${p.slug}</small>
        <p>${p.body}</p>
        <button class="btn" data-delete-page="${p.id}">Удалить</button>
      </div>`
    )
    .join('');

  box.querySelectorAll('[data-delete-page]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api(`/api/admin/pages/${btn.dataset.deletePage}`, { method: 'DELETE' });
      await loadDashboard();
    });
  });
}

async function loadDashboard() {
  const [statsRes, pagesRes, leadsRes] = await Promise.all([
    api('/api/admin/stats'),
    api('/api/admin/pages'),
    api('/api/admin/leads')
  ]);

  if (!statsRes.ok || !pagesRes.ok || !leadsRes.ok) {
    throw new Error('Сессия истекла, войдите снова');
  }

  const stats = await statsRes.json();
  const pages = await pagesRes.json();
  const leads = await leadsRes.json();

  document.getElementById('stat-leads').textContent = stats.leadsCount;
  document.getElementById('stat-new').textContent = stats.newLeads;
  document.getElementById('stat-pages').textContent = stats.pagesCount;

  renderPages(pages);
  renderLeads(leads);
}

function showDashboard() {
  document.getElementById('login-card').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
}

function setupForms() {
  const loginForm = document.getElementById('login-form');
  const loginStatus = document.getElementById('login-status');
  const pageForm = document.getElementById('page-form');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(loginForm).entries());
    try {
      await login(data.login, data.password);
      showDashboard();
      await loadDashboard();
      loginStatus.textContent = '';
    } catch (err) {
      loginStatus.textContent = err.message;
    }
  });

  pageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(pageForm).entries());
    const payload = {
      slug: raw.slug,
      title: raw.title,
      body: raw.body,
      is_published: raw.is_published === 'on'
    };

    const res = await api('/api/admin/pages', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      pageForm.reset();
      await loadDashboard();
    }
  });
}

setupForms();
if (getToken()) {
  showDashboard();
  loadDashboard().catch((err) => {
    document.getElementById('login-status').textContent = err.message;
    localStorage.removeItem(tokenKey);
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('login-card').classList.remove('hidden');
  });
}
