const API = 'http://127.0.0.1:8000';
    let currentTab = 'login';

    function switchTab(tab) {
        currentTab = tab;
        document.querySelectorAll('.tab')[0].classList.toggle('active', tab === 'login');
        document.querySelectorAll('.tab')[1].classList.toggle('active', tab === 'signup');
        document.getElementById('formTitle').textContent = tab === 'login' ? 'Welcome back' : 'Create account';
        document.getElementById('formSubtitle').textContent = tab === 'login' ? 'Sign in to your account to continue' : 'Start learning smarter today';
        document.getElementById('submitBtn').textContent = tab === 'login' ? 'Sign In' : 'Create Account';
        hideMessage();
    }

    function showMessage(text, type) {
        const el = document.getElementById('message');
        el.textContent = text;
        el.className = `message ${type}`;
    }

    function hideMessage() {
        document.getElementById('message').className = 'message';
    }

    function setLoading(loading) {
        const btn = document.getElementById('submitBtn');
        btn.disabled = loading;
        btn.innerHTML = loading ? '<span class="spinner"></span> Please wait...' : (currentTab === 'login' ? 'Sign In' : 'Create Account');
    }

    async function handleSubmit(e) {
        e.preventDefault();
        hideMessage();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        setLoading(true);
        try {
            const endpoint = currentTab === 'login' ? '/auth/signin' : '/auth/signup';
            const res = await fetch(`${API}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) { showMessage(data.detail || 'Something went wrong', 'error'); return; }
            if (currentTab === 'login') {
                console.log('Login response:', data)
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('user_id', data.user_id);
                showMessage('Login successful! Redirecting...', 'success');
                setTimeout(() => window.location.href = '/static/HTML/dashboard.html', 1000);
            } else {
                showMessage('Account created! You can now sign in.', 'success');
                setTimeout(() => switchTab('login'), 1500);
            }
        } catch (err) {
            showMessage('Could not connect to server', 'error');
        } finally {
            setLoading(false);
        }
    }

    if (localStorage.getItem('token')) window.location.href = '/static/HTML/dashboard.html';