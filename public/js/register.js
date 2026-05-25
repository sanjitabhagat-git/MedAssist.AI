const API_BASE = 'http://localhost:5000/api';

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = document.getElementById('status');

  try {
    const payload = {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      password: document.getElementById('password').value
    };

    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    status.className = 'small mt-3 text-success';
    status.textContent = 'Registration successful. Redirecting to login...';
    setTimeout(() => { window.location.href = 'login.html'; }, 1000);
  } catch (err) {
    status.className = 'small mt-3 text-danger';
    status.textContent = err.message;
  }
});
