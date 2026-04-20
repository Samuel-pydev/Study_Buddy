const API       = 'http://127.0.0.1:8000';
const token     = localStorage.getItem('token');
const currentDoc = localStorage.getItem('current_doc');
const currentDocId = localStorage.getItem('current_doc_id');

// Redirect if not authenticated
if (!token) window.location.href = '/static/HTML/index.html';

// Set document name in navbar
document.getElementById('docName').textContent = currentDoc || 'Document';

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

// ── HELPERS ──
function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function addMessage(text, role) {
  document.getElementById('emptyState').style.display = 'none';
  const chatArea = document.getElementById('chatArea');
  const msg = document.createElement('div');
  msg.className = `message ${role}`;
  msg.innerHTML = `
    <div class="bubble">${text}</div>
    <div class="message-time">${getTime()}</div>
  `;
  chatArea.appendChild(msg);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function showTyping() {
  const chatArea = document.getElementById('chatArea');
  const typing = document.createElement('div');
  typing.className = 'message ai';
  typing.id = 'typingIndicator';
  typing.innerHTML = `
    <div class="typing">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  chatArea.appendChild(typing);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function hideTyping() {
  const typing = document.getElementById('typingIndicator');
  if (typing) typing.remove();
}

// ── LOAD HISTORY ──
async function loadHistory() {
  try {
    const res = await fetch(`${API}/chat/history?filename=${encodeURIComponent(currentDoc)}&doc_id=${encodeURIComponent(currentDocId)}`, {
      headers: { 'authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok && data.history.length > 0) {
      data.history.forEach(msg => addMessage(msg.message, msg.role));
    }
  } catch (err) {
    console.log('Could not load history', err);
  }
}

// ── SEND ──
async function sendMessage() {
  const input    = document.getElementById('questionInput');
  const question = input.value.trim();
  if (!question) return;

  addMessage(question, 'user');
  input.value = '';

  const btn = document.getElementById('sendBtn');
  btn.disabled   = true;
  input.disabled = true;

  showTyping();

  try {
    const res  = await fetch(`${API}/chat/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ question, filename: currentDoc, doc_id: currentDocId })
    });

    const data = await res.json();
    hideTyping();

    if (!res.ok) {
      addMessage('Something went wrong — please try again.', 'ai');
      return;
    }

    addMessage(data.answer, 'ai');

  } catch (err) {
    hideTyping();
    addMessage('Could not reach the server. Check your connection and try again.', 'ai');
  } finally {
    btn.disabled   = false;
    input.disabled = false;
    input.focus();
  }
}

// Load history when page opens
loadHistory();