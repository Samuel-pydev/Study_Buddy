// Profile Javascript for Study Buddy

const API = 'http://127.0.0.1:8000';
const token = localStorage.getItem('token');

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Fetch user info
    try {
        const res = await fetch(`${API}/auth/me`, {
            headers: { 'authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            document.getElementById('userName').textContent = data.display_name || 'Study Buddy Scholar';
            document.getElementById('userEmail').textContent = data.email || 'student@university.edu';
            document.getElementById('userInitial').textContent = (data.display_name || data.email || 'S').charAt(0).toUpperCase();
            
            if (data.display_name) {
                document.getElementById('displayName').value = data.display_name;
            }
        }
    } catch (err) {
        console.error("Could not fetch user info");
    }

    // 2. Fetch dummy or real stats
    // We'll mock this for now since we haven't built a stats table in the backend
    document.getElementById('docCount').textContent = Math.floor(Math.random() * 10) + 1;
    document.getElementById('quizCount').textContent = Math.floor(Math.random() * 5) + 2;
    document.getElementById('streakCount').textContent = 3;

    // 3. Initialize Chart.js Performance Chart
    initChart();
});

function initChart() {
    const ctx = document.getElementById('performanceChart')?.getContext('2d');
    if (!ctx) return;

    // Detect theme for chart colors
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const textColor = isDark ? '#b0b0cc' : '#4a4a6a';
    const gridColor = isDark ? '#1f1f35' : '#e0e0ef';

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Study Hours',
                data: [1.5, 2, 1.2, 3, 2.5, 4, 3.5],
                borderColor: '#7c6af7',
                backgroundColor: 'rgba(124, 106, 247, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#12121e',
                pointBorderColor: '#7c6af7',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#1f1f35' : '#ffffff',
                    titleColor: isDark ? '#e8e8f4' : '#1a1a2e',
                    bodyColor: isDark ? '#b0b0cc' : '#4a4a6a',
                    borderColor: isDark ? '#2a2a45' : '#e0e0ef',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + ' hrs';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor, drawBorder: false },
                    ticks: { color: textColor, padding: 10, stepSize: 1 }
                },
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: { color: textColor, padding: 10 }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            },
        }
    });
}

function saveProfile() {
    const name = document.getElementById('displayName').value;
    alert(`Profile updated! Your new display name is ${name}.`);
    // Ideally this would PUT to /auth/me
    document.getElementById('userName').textContent = name || 'Student';
    document.getElementById('userInitial').textContent = (name || 'S').charAt(0).toUpperCase();
}
