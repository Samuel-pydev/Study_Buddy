 const API = 'http://127.0.0.1:8000';
 let tab = 'login';

 /* ── THEME ── */
 function toggleTheme() {
   const html = document.documentElement;
   const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
   html.setAttribute('data-theme', next);
   localStorage.setItem('sb-theme', next);
 }

 (function initTheme() {
   const saved = localStorage.getItem('sb-theme');
   const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
   document.documentElement.setAttribute('data-theme', saved || preferred);
 })();

 /* ── AUTH REDIRECT ── */
 if (localStorage.getItem('token')) {
   window.location.href = '/static/HTML/dashboard.html';
 }

 /* ── TABS ── */
 function switchTab(t) {
   tab = t;
   document.querySelectorAll('.tab')[0].classList.toggle('active', t === 'login');
   document.querySelectorAll('.tab')[1].classList.toggle('active', t === 'signup');
   document.getElementById('fTitle').textContent    = t === 'login' ? 'Welcome back'    : 'Create an account';
   document.getElementById('fSub').textContent      = t === 'login' ? 'Sign in to pick up where you left off' : 'Start learning smarter today';
   document.getElementById('submitBtn').textContent = t === 'login' ? 'Sign in'          : 'Create account';
   clearMsg();
 }

 /* ── MESSAGES ── */
 function showMsg(text, type) {
   const el = document.getElementById('msg');
   el.textContent = text;
   el.className = 'msg ' + (type === 'error' ? 'err' : 'ok');
 }
 function clearMsg() { document.getElementById('msg').className = 'msg'; }

 /* ── LOADING ── */
 function setLoading(on) {
   const btn = document.getElementById('submitBtn');
   btn.disabled = on;
   btn.innerHTML = on
     ? '<span class="spin"></span>Please wait…'
     : (tab === 'login' ? 'Sign in' : 'Create account');
 }

 /* ── SUBMIT ── */
 async function handleSubmit() {
   clearMsg();
   const email    = document.getElementById('email').value.trim();
   const password = document.getElementById('password').value;
   if (!email || !password) { showMsg('Please fill in all fields.', 'error'); return; }
   setLoading(true);
   try {
     const endpoint = tab === 'login' ? '/auth/signin' : '/auth/signup';
     const res  = await fetch(API + endpoint, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ email, password })
     });
     const data = await res.json();
     if (!res.ok) { showMsg(data.detail || 'Something went wrong.', 'error'); return; }
     if (tab === 'login') {
       localStorage.setItem('token',   data.access_token);
       localStorage.setItem('user_id', data.user_id);
       showMsg('Signed in! Redirecting…', 'success');
       setTimeout(() => window.location.href = '/static/HTML/dashboard.html', 1000);
     } else {
       showMsg('Account created — you can now sign in.', 'success');
       setTimeout(() => switchTab('login'), 1500);
     }
   } catch (err) {
     showMsg('Could not reach the server.', 'error');
   } finally {
     setLoading(false);
   }
 }

 /* ── ENTER KEY ── */
 document.addEventListener('keydown', e => {
   if (e.key === 'Enter') handleSubmit();
 });