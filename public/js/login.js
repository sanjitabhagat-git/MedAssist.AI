const API_BASE = 'http://localhost:5000/api';

window.AppAuth?.redirectIfSession('patient', 'appointment.html');

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
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    window.AppAuth?.storeUser(data.user);
    window.location.replace('appointment.html');
  } catch (err) {
    status.className = 'small mt-3 text-danger';
    status.textContent = err.message;
  }
});
