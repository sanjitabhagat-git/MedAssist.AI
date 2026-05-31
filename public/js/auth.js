(function () {
  const API_BASE = 'http://localhost:5000/api';
  const STORAGE_KEYS = {
    patient: 'patientUser',
    admin: 'adminUser'
  };

  function clearStoredUsers() {
    localStorage.removeItem(STORAGE_KEYS.patient);
    localStorage.removeItem(STORAGE_KEYS.admin);
  }

  function storeUser(user) {
    if (!user || !user.role) return;

    if (user.role === 'admin') {
      localStorage.setItem(STORAGE_KEYS.admin, JSON.stringify(user));
      localStorage.removeItem(STORAGE_KEYS.patient);
      return;
    }

    localStorage.setItem(STORAGE_KEYS.patient, JSON.stringify(user));
    localStorage.removeItem(STORAGE_KEYS.admin);
  }

  async function getSessionUser() {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || 'Session expired.');
    }

    return data.user;
  }

  async function requireSession(role, redirectTo = 'index.html') {
    try {
      const user = await getSessionUser();

      if (role && user.role !== role) {
        throw new Error('Session role mismatch.');
      }

      storeUser(user);
      return user;
    } catch (_err) {
      clearStoredUsers();
      window.location.replace(redirectTo);
      return null;
    }
  }

  function watchProtectedPage(role, redirectTo = 'index.html') {
    const verify = () => requireSession(role, redirectTo);
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        verify();
      }
    });
    return verify;
  }

  async function logout(redirectTo = 'index.html') {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (_err) {
      // Always clear the client state even if the network call fails.
    } finally {
      clearStoredUsers();
      window.location.replace(redirectTo);
    }
  }

  async function redirectIfSession(role, redirectTo) {
    try {
      const user = await getSessionUser();
      if (!role || user.role === role) {
        window.location.replace(redirectTo);
        return true;
      }
    } catch (_err) {
      // No active session, stay on the page.
    }

    return false;
  }

  window.AppAuth = {
    clearStoredUsers,
    getSessionUser,
    logout,
    redirectIfSession,
    requireSession,
    storeUser,
    watchProtectedPage
  };
})();
