const API_BASE = 'http://localhost:5000/api';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = document.getElementById('status');

  try {
    const payload = {
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value
    };

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    localStorage.setItem('patientUser', JSON.stringify(data.user));
    window.location.href = 'appointment.html';
  } catch (err) {
    status.className = 'small mt-3 text-danger';
    status.textContent = err.message;
  }
});
