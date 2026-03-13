async function loadPages() {
  const container = document.getElementById('pages');
  const res = await fetch('/api/public/pages');
  const pages = await res.json();
  container.innerHTML = pages
    .map((p) => `<article class="item"><h3>${p.title}</h3><p>${p.body}</p><small>/${p.slug}</small></article>`)
    .join('');
}

async function setupLeadForm() {
  const form = document.getElementById('lead-form');
  const status = document.getElementById('lead-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    status.textContent = res.ok ? data.message : data.message || 'Ошибка отправки';
    if (res.ok) form.reset();
  });
}

loadPages();
setupLeadForm();
