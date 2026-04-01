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
            document.getElementById('summarizeBtn').disabled = true;
        }
    } catch (err) {
        select.innerHTML = `<option value="">Error loading documents</option>`;
    }

    // 2. Handle Summarize
    const btn = document.getElementById('summarizeBtn');
    btn.addEventListener('click', async () => {
        const docName = select.value;
        if (!docName) return;

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Summarizing...';
        hideMessage();

        const resultCard = document.getElementById('resultCard');
        const emptyState = document.getElementById('emptyState');
        const summaryContent = document.getElementById('summaryContent');
        const summaryTitle = document.getElementById('summaryTitle');

        try {
            const res = await fetch(`${API}/chat/summarize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ filename: docName })
            });

            const data = await res.json();

            if (!res.ok) {
                showMessage(data.detail || 'Failed to generate summary', 'error');
                return;
            }

            // Render Markdown
            emptyState.style.display = 'none';
            resultCard.style.display = 'block';
            summaryTitle.textContent = `${docName} — Summary`;
            
            // Convert markdown response to HTML
            if (window.marked && data.summary) {
                summaryContent.innerHTML = window.marked.parse(data.summary);
            } else {
                summaryContent.innerHTML = `<p>${data.summary}</p>`;
            }

        } catch (err) {
            showMessage('Connection error while summarizing', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M3 4h18v2H3zm0 7h18v2H3zm0 7h14v2H3z"/></svg>
                Summarize
            `;
        }
    });
});
