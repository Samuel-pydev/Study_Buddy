const API = 'http://127.0.0.1:8000';
const token = localStorage.getItem('token');

// Redirect to login if not authenticated
if (!token) window.location.href = '/static/HTML/index.html';

// ── THEME ──
function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('sb-theme', next);
}

(function initTheme() {
  const saved     = localStorage.getItem('sb-theme');
  const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', saved || preferred);
})();

// ── STATE ──
let docs = [];

// ── MESSAGES ──
function showMessage(text, type) {
  const el = document.getElementById('message');
  el.textContent = text;
  el.className = `msg ${type}`;
}

function hideMessage() {
  document.getElementById('message').className = 'msg';
}

// ── FETCH DOCS ──
async function fetchDocs() {
  try {
    const res  = await fetch(`${API}/documents/my-documents`, {
      headers: { 'authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      docs = data.documents;
      renderDocs();
    }
  } catch (err) {
    console.error('Could not fetch documents:', err);
  }
}

// ── RENDER DOCS ──
function renderDocs() {
  const list = document.getElementById('docsList');

  if (docs.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        </div>
        <p class="empty-title">No documents yet</p>
        <p class="empty-sub">Upload your first PDF above to get started</p>
      </div>`;
    return;
  }

  list.innerHTML = docs.map(doc => `
    <div class="doc-card">
      <div class="doc-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="9" y1="13" x2="15" y2="13"/>
          <line x1="9" y1="17" x2="15" y2="17"/>
          <polyline points="9 9 10 9"/>
        </svg>
      </div>
      <div class="doc-info">
        <div class="doc-name">${doc.filename}</div>
        <div class="doc-meta">${doc.chunks} chunks &middot; ${new Date(doc.created_at).toLocaleDateString()}</div>
      </div>
      <button class="btn-chat" onclick="openChat('${doc.filename}', '${doc.doc_id}')">Chat →</button>
    </div>
  `).join('');
}

// ── UPLOAD ──
async function handleUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  hideMessage();
  const btn = document.getElementById('uploadBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Uploading…';

  const formData = new FormData();
  formData.append('uploaded', file);

  try {
    const res  = await fetch(`${API}/documents/upload`, {
      method: 'POST',
      headers: { 'authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.detail || 'Upload failed.', 'error');
      return;
    }

    showMessage(`${data.filename} uploaded successfully!`, 'success');
    fetchDocs();
  } catch (err) {
    showMessage('Could not connect to the server.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Choose File';
    event.target.value = '';
  }
}

// ── OPEN CHAT ──
function openChat(filename, docId) {
  localStorage.setItem('current_doc', filename);
  localStorage.setItem('current_doc_id', docId);
  window.location.href = '/static/HTML/chat.html';
}

// ── LOGOUT ──
async function logout() {
  try {
    await fetch(`${API}/auth/logout`, {
      method: 'POST',
      headers: { 'authorization': `Bearer ${token}` }
    });
  } catch (_) {}
  localStorage.clear();
  window.location.href = '/static/HTML/index.html';
}

// ── DRAG & DROP ──
const uploadBox = document.getElementById('uploadBox');

uploadBox.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadBox.classList.add('dragover');
});

uploadBox.addEventListener('dragleave', () => {
  uploadBox.classList.remove('dragover');
});

uploadBox.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadBox.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') {
    const input = document.getElementById('fileInput');
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    handleUpload({ target: input });
  } else {
    showMessage('Please upload a PDF file only.', 'error');
  }
});

// ── INIT ──
fetchDocs();