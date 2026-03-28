const API = 'http://127.0.0.1:8000';
    const token = localStorage.getItem('token');

    // Redirect to login if not logged in
    if (!token) window.location.href = '/static/index.html';

    
    let docs = []

    function showMessage(text, type) {
        const el = document.getElementById('message');
        el.textContent = text;
        el.className = `message ${type}`;
    }

    function hideMessage() {
        document.getElementById('message').className = 'message';
    }

    async function fetchDocs() {
    try {
        const res = await fetch(`${API}/documents/my-documents`, {
            headers: { 'authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        console.log('Fetch docs response:', data)  // add this
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
                <div class="empty-state">
                    <div class="empty-icon">
                    
                    <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 16 16"><path fill="#fff" d="M9 4.5V1H5.5A1.5 1.5 0 0 0 4 2.5v2.707A5.5 5.5 0 0 1 8.663 15H12.5a1.5 1.5 0 0 0 1.5-1.5V6h-3.5A1.5 1.5 0 0 1 9 4.5m1 0V1.25L13.75 5H10.5a.5.5 0 0 1-.5-.5M2.318 7.318a4.5 4.5 0 1 0 6.364 6.364a4.5 4.5 0 0 0-6.364-6.364m4.95 4.95a.5.5 0 0 1-.707 0L5.5 11.208l-1.06 1.06a.5.5 0 0 1-.708-.707l1.06-1.061l-1.06-1.06a.5.5 0 0 1 .707-.708L5.5 9.792l1.06-1.06a.5.5 0 0 1 .708.707L6.208 10.5l1.06 1.06a.5.5 0 0 1 0 .708"/></svg>

                    </div>
                    <p>No documents yet.<br>Upload your first PDF above!</p>
                </div>`;
            return;
        }
        list.innerHTML = docs.map(doc => `
            <div class="doc-card">
                <div class="doc-icon"> 
                
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#fff" fill-rule="evenodd" d="M5.879 2.879C5 3.757 5 5.172 5 8v8c0 2.828 0 4.243.879 5.121C6.757 22 8.172 22 11 22h2c2.828 0 4.243 0 5.121-.879C19 20.243 19 18.828 19 16V8c0-2.828 0-4.243-.879-5.121C17.243 2 15.828 2 13 2h-2c-2.828 0-4.243 0-5.121.879M8.25 17a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75M9 12.25a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5zM8.25 9A.75.75 0 0 1 9 8.25h6a.75.75 0 0 1 0 1.5H9A.75.75 0 0 1 8.25 9" clip-rule="evenodd"/><path fill="#fff" d="M5.235 4.058C5 4.941 5 6.177 5 8v8c0 1.823 0 3.058.235 3.942L5 19.924c-.975-.096-1.631-.313-2.121-.803C2 18.243 2 16.828 2 14v-4c0-2.829 0-4.243.879-5.121c.49-.49 1.146-.707 2.121-.803zm13.53 15.884C19 19.058 19 17.822 19 16V8c0-1.823 0-3.059-.235-3.942l.235.018c.975.096 1.631.313 2.121.803C22 5.757 22 7.17 22 9.999v4c0 2.83 0 4.243-.879 5.122c-.49.49-1.146.707-2.121.803z" opacity="0.5"/></svg>

                </div>
                <div class="doc-info">
                    <div class="doc-name">${doc.filename}</div>
                    <div class="doc-meta">${doc.chunks} chunks · ${new Date(doc.created_at).toLocaleDateString()}</div>
                </div>
                <button class="btn-chat" onclick="openChat('${doc.filename}')">Chat →</button>
            </div>
        `).join('');
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

            console.log('Error details:', data)

            if (!res.ok) {
                showMessage(data.detail || 'Upload failed', 'error');
                return;
            }

    
            // docs.push({
            //     filename: data.filename,
            //     chunks: data.chunks,
            //     date: new Date().toLocaleDateString()
            // });

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

    function openChat(filename) {
        localStorage.setItem('current_doc', filename);
        window.location.href = '/static/HTML/chat.html';
    }

    async function logout() {
        try {
            await fetch(`${API}/auth/logout`, {
                method: 'POST',
                headers: { 'authorization': `Bearer ${token}` }
            });
        } catch (err) {}
        localStorage.clear();
        window.location.href = '/static/HTML/index.html';
    }

    // Drag and drop
    const uploadBox = document.getElementById('uploadBox');
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

    // Initial render
    fetchDocs();