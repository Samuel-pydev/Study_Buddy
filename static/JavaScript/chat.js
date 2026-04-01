function insertSuggestion(text) {
    const input = document.getElementById('questionInput');
    input.value = text;
    input.focus();
}

// Preserve existing chat.js functionality
document.addEventListener('DOMContentLoaded', () => {
    const currentDoc = localStorage.getItem('current_doc');
    const docNameEl = document.getElementById('docName');
    
    if (currentDoc) {
        docNameEl.textContent = `Chatting with: ${currentDoc}`;
    } else {
        docNameEl.textContent = 'General AI Chat';
    }
});

function getTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function addMessage(text, role) {
    // Hide empty state
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

async function sendMessage() {
    const input = document.getElementById('questionInput');
    const question = input.value.trim();
    if (!question) return;

    // Show user message
    addMessage(question, 'user');
    input.value = '';

    // Disable input
    const btn = document.getElementById('sendBtn');
    btn.disabled = true;
    input.disabled = true;

    // Show typing indicator
    showTyping();

    // Determine target document
    const currentDoc = localStorage.getItem('current_doc') || null;

    try {
        const payload = { question: question };
        // Pass doc_name if backend supports filtering to specific docs, else regular
        if (currentDoc) payload.doc_name = currentDoc;

        const res = await fetch(`${API}/chat/ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        hideTyping();

        if (!res.ok) {
            addMessage('Sorry, something went wrong. Please try again.', 'ai');
            return;
        }

        // Parse markdown if possible
        if (window.marked && data.answer) {
            addMessage(window.marked.parse(data.answer), 'ai');
        } else {
             // Basic newline replace
            const htmlText = data.answer.replace(/\n\n/g, "<br><br>");
            addMessage(htmlText, 'ai');
        }

    } catch (err) {
        hideTyping();
        addMessage('Could not connect to server. Please check your connection.', 'ai');
    } finally {
        btn.disabled = false;
        input.disabled = false;
        input.focus();
    }
}