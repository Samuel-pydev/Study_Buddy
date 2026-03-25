const API = 'http://127.0.0.1:8000';
    const token = localStorage.getItem('token');
    const currentDoc = localStorage.getItem('current_doc');

    // Redirect if not logged in
    if (!token) window.location.href = '/static/HTML/index.html';

    // Show document name in navbar
    document.getElementById('docName').textContent = currentDoc || 'Document';

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

        try {
            const res = await fetch(`${API}/chat/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ question })
            });

            const data = await res.json();
            hideTyping();

            if (!res.ok) {
                addMessage('Sorry, something went wrong. Please try again.', 'ai');
                return;
            }

            addMessage(data.answer, 'ai');

        } catch (err) {
            hideTyping();
            addMessage('Could not connect to server. Please check your connection.', 'ai');
        } finally {
            btn.disabled = false;
            input.disabled = false;
            input.focus();
        }
    }