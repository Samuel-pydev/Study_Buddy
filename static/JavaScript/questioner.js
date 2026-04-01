document.addEventListener('DOMContentLoaded', async () => {
    // 1. Fetch documents to populate the select dropdown
    const select = document.getElementById('docSelect');
    
    try {
        const res = await fetch(`${API}/documents/my-documents`, {
            headers: { 'authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (res.ok && data.documents.length > 0) {
            select.innerHTML = data.documents.map(doc => 
                `<option value="${doc.filename}">${doc.filename}</option>`
            ).join('');
        } else {
            select.innerHTML = `<option value="">No documents found</option>`;
            document.getElementById('generateBtn').disabled = true;
        }
    } catch (err) {
        select.innerHTML = `<option value="">Error loading documents</option>`;
    }

    // 2. Handle Generate Quiz
    const btn = document.getElementById('generateBtn');
    btn.addEventListener('click', async () => {
        const docName = select.value;
        const numQ = document.getElementById('numQuestions').value;
        
        if (!docName) return;

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Generating...';
        hideMessage();

        const container = document.getElementById('quizContainer');
        const emptyState = document.getElementById('emptyState');

        try {
            // Note: Using the chat endpoint heavily to do document Q&A logic 
            // since we'll build a dedicated Questioner backend later.
            const res = await fetch(`${API}/chat/questioner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ filename: docName, num_questions: parseInt(numQ) })
            });

            const data = await res.json();

            if (!res.ok) {
                showMessage(data.detail || 'Failed to generate quiz', 'error');
                return;
            }

            // Render Flashcards
            emptyState.style.display = 'none';
            container.style.display = 'flex';
            
            // Expected data.quiz is an array of { question, answer }
            if (data.quiz && data.quiz.length > 0) {
                container.innerHTML = data.quiz.map((q, idx) => `
                    <div class="flashcard" onclick="this.classList.toggle('flipped')">
                        <div class="flashcard-inner">
                            <div class="flashcard-front">
                                <span class="q-badge">Question ${idx + 1}</span>
                                <h3 class="q-text">${q.question}</h3>
                                <div class="flip-hint">Click to reveal <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2m5 11h-4v4h-2v-4H7v-2h4V7h2v4h4z"/></svg></div>
                            </div>
                            <div class="flashcard-back">
                                <span class="q-badge">Answer</span>
                                <p class="a-text">${q.answer}</p>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                showMessage("I couldn't generate a quiz for this document.", "error");
            }

        } catch (err) {
            showMessage('Connection error while generating quiz', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<span>Generate Quiz</span><div class="action-icon" style="width:20px; height:20px; background:none;">✨</div>`;
        }
    });
});
