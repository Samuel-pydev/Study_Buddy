let docs = [];

async function fetchDocs() {
    try {
        const res = await fetch(`${API}/documents/my-documents`, {
            headers: { 'authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (res.ok) {
            docs = data.documents;
            renderDocs();
        }
    } catch (err) {
        console.log('Could not fetch documents', err);
    }
}

function renderDocs() {
    const list = document.getElementById('docsList');
    if (docs.length === 0) {
        list.innerHTML = `
            <div class="empty-state card">
                <div class="empty-icon">📁</div>
                <h3>No documents yet</h3>
                <p>Upload your first PDF to begin your learning journey.</p>
            </div>`;
        return;
    }

    list.innerHTML = docs.map(doc => `
        <div class="doc-card" onclick="openDocOptions('${doc.filename}')">
            <div class="doc-icon-container">📄</div>
            <div class="doc-info">
                <div class="doc-name">${doc.filename}</div>
                <div class="doc-meta">${doc.chunks} sections · ${new Date(doc.created_at).toLocaleDateString()}</div>
            </div>
            <button class="btn btn-primary btn-chat" onclick="event.stopPropagation(); openChat('${doc.filename}')">Chat →</button>
        </div>
    `).join('');
}

function openDocOptions(filename) {
    // Basic interaction to store doc and maybe scroll to top for testing
    localStorage.setItem('current_doc', filename);
}

function openChat(filename) {
    localStorage.setItem('current_doc', filename);
    window.location.href = '/static/HTML/chat.html';
}

async function handleUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    hideMessage();
    const btn = document.getElementById('uploadBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Uploading...';

    const formData = new FormData();
    formData.append('uploaded', file);

    try {
        const res = await fetch(`${API}/documents/upload`, {
            method: 'POST',
            headers: { 'authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await res.json();

        if (!res.ok) {
            showMessage(data.detail || 'Upload failed', 'error');
            return;
        }

        showMessage(`✓ ${data.filename} uploaded successfully!`, 'success');
        fetchDocs();

    } catch (err) {
        showMessage('Could not connect to server', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Choose File';
        event.target.value = '';
    }
}

// Drag and drop for upload box
document.addEventListener('DOMContentLoaded', () => {
    const uploadBox = document.getElementById('uploadBox');
    if (uploadBox) {
        uploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadBox.classList.add('dragover');
        });
        uploadBox.addEventListener('dragleave', () => uploadBox.classList.remove('dragover'));
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
                showMessage('Please upload a PDF file only', 'error');
            }
        });
    }

    // Initial render
    fetchDocs();
});