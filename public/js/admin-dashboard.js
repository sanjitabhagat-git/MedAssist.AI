const API_BASE = 'http://localhost:5000/api';
const auth = window.AppAuth;
const dayOptions = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const state = {
  activeRequests: 0,
  pendingDeleteId: null
};

const elements = {
  status: document.getElementById('status'),
  globalLoader: document.getElementById('globalLoader'),
  doctorTableWrap: document.getElementById('doctorTableWrap'),
  doctorDetailBody: document.getElementById('doctorDetailBody'),
  availabilityRows: document.getElementById('availabilityRows'),
  editAvailabilityRows: document.getElementById('editAvailabilityRows')
};

const addDoctorModal = new bootstrap.Modal(document.getElementById('addDoctorModal'));
const doctorDetailModal = new bootstrap.Modal(document.getElementById('doctorDetailModal'));
const editDoctorModal = new bootstrap.Modal(document.getElementById('editDoctorModal'));
const deleteConfirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));

function setStatus(message, isError = false) {
  elements.status.className = isError ? 'small mt-3 text-danger' : 'small mt-3 text-muted';
  elements.status.textContent = message;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function formatTime(time) {
  const [hours, minutes] = String(time).split(':');
  const date = new Date(2000, 0, 1, Number(hours), Number(minutes));
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatSchedule(schedule) {
  return escapeHtml(schedule || 'Not set').replace(/\n/g, '<br>');
}

function showLoader() {
  state.activeRequests += 1;
  if (elements.globalLoader) {
    elements.globalLoader.style.display = 'flex';
  }
}

function hideLoader() {
  state.activeRequests = Math.max(0, state.activeRequests - 1);
  if (state.activeRequests === 0) {
    if (elements.globalLoader) {
      elements.globalLoader.style.display = 'none';
    }
  }
}

async function withLoader(task) {
  showLoader();
  try {
    return await task();
  } finally {
    hideLoader();
  }
}

async function requestJson(url, options = {}) {
  return withLoader(async () => {
    const res = await fetch(url, {
      credentials: 'include',
      ...options,
      headers: {
        ...(options.headers || {})
      }
    });

    const text = await res.text();
    let data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_err) {
        data = {};
      }
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        auth.clearStoredUsers();
        window.location.replace('index.html');
      }
      throw new Error(data.error || 'Request failed');
    }

    return data;
  });
}

function createAvailabilityRow() {
  const row = document.createElement('div');
  row.className = 'row g-2 align-items-center availability-row';
  row.innerHTML = `
    <div class="col-md-4">
      <select name="availability_day" class="form-select" required>
        <option value="">Select Day</option>
        ${dayOptions.map((day) => `<option value="${day}">${day}</option>`).join('')}
      </select>
    </div>
    <div class="col-md-3"><input name="start_time" type="time" class="form-control" required /></div>
    <div class="col-md-3"><input name="end_time" type="time" class="form-control" required /></div>
    <div class="col-md-2"><button class="btn btn-outline-danger btn-sm remove-availability-btn" type="button">Remove</button></div>
  `;

  row.querySelector('.remove-availability-btn').addEventListener('click', () => {
    if (document.querySelectorAll('.availability-row').length > 1) row.remove();
  });

  return row;
}

function createEditAvailabilityRow() {
  const row = document.createElement('div');
  row.className = 'row g-2 align-items-center availability-row';
  row.innerHTML = `
    <div class="col-md-4">
      <select name="availability_day" class="form-select" required>
        <option value="">Select Day</option>
        ${dayOptions.map((day) => `<option value="${day}">${day}</option>`).join('')}
      </select>
    </div>
    <div class="col-md-3"><input name="start_time" type="time" class="form-control" required /></div>
    <div class="col-md-3"><input name="end_time" type="time" class="form-control" required /></div>
    <div class="col-md-2"><button class="btn btn-outline-danger btn-sm remove-availability-btn" type="button">Remove</button></div>
  `;

  row.querySelector('.remove-availability-btn').addEventListener('click', () => {
    if (document.querySelectorAll('#editAvailabilityRows .availability-row').length > 1) row.remove();
  });

  return row;
}

function resetAvailabilityRows() {
  elements.availabilityRows.innerHTML = '';
  elements.availabilityRows.appendChild(createAvailabilityRow());
}

function resetEditAvailabilityRows() {
  elements.editAvailabilityRows.innerHTML = '';
  elements.editAvailabilityRows.appendChild(createEditAvailabilityRow());
}

async function loadDoctors() {
  try {
    const doctors = await requestJson(`${API_BASE}/admin/doctors`);
    const rows = doctors.map((d) => `
      <tr>
        <td><img src="${escapeHtml(d.photo_url || 'https://via.placeholder.com/50')}" class="doctor-thumb" /></td>
        <td>${escapeHtml(d.name)}</td>
        <td>${escapeHtml(d.department)}</td>
        <td>${escapeHtml(d.degree)}</td>
        <td>INR ${escapeHtml(d.fees)}</td>
        <td>${formatSchedule(d.available_schedule)}</td>
        <td class="text-center">
          <button title="View" class="btn btn-sm btn-outline-secondary me-1 view-btn" data-id="${d.id}"><i class="bi bi-eye"></i></button>
          <button title="Edit" class="btn btn-sm btn-outline-primary me-1 edit-btn" data-id="${d.id}"><i class="bi bi-pencil-square"></i></button>
          <button title="Delete" class="btn btn-sm btn-outline-danger delete-btn" data-id="${d.id}"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('');

    elements.doctorTableWrap.innerHTML = `
      <table class="table table-bordered table-hover">
        <thead><tr><th>Photo</th><th>Name</th><th>Department</th><th>Degree</th><th>Fees</th><th>Available Day/Time</th><th>Action</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    document.querySelectorAll('.view-btn').forEach((btn) => {
      btn.addEventListener('click', () => showDoctorDetail(btn.getAttribute('data-id')));
    });

    document.querySelectorAll('.edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => openEditDoctor(btn.getAttribute('data-id')));
    });

    document.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => openDeleteConfirm(btn.getAttribute('data-id')));
    });
  } catch (err) {
    setStatus(err.message, true);
  }
}

async function showDoctorDetail(doctorId) {
  try {
    const data = await requestJson(`${API_BASE}/admin/doctors/${doctorId}`);
    const d = data.doctor;
    const appts = data.appointments.length
      ? data.appointments.map((a) => `<tr><td>${a.id}</td><td>${escapeHtml(a.patient_name)}</td><td>${escapeHtml(a.patient_email)}</td><td>${escapeHtml(a.patient_phone)}</td><td>${escapeHtml(a.appointment_date)}</td><td>${escapeHtml(a.appointment_time)}</td><td>${escapeHtml(a.status)}</td></tr>`).join('')
      : '<tr><td colspan="7" class="text-muted">No booked appointments.</td></tr>';

    elements.doctorDetailBody.innerHTML = `
      <div class="d-flex gap-3 mb-3 align-items-center">
        <img src="${escapeHtml(d.photo_url || 'https://via.placeholder.com/120')}" style="width:120px;height:120px;object-fit:cover;border-radius:10px;" />
        <div>
          <h5>${escapeHtml(d.name)}</h5>
          <p class="mb-1">${escapeHtml(d.degree)}</p>
          <p class="mb-1">${escapeHtml(d.department)}</p>
          <p class="mb-1">INR ${escapeHtml(d.fees)}</p>
          <p class="mb-0">${formatSchedule(d.available_schedule)}</p>
        </div>
      </div>
      <h6>Booked Appointments</h6>
      <table class="table table-sm table-striped"><thead><tr><th>ID</th><th>Patient Name</th><th>Email</th><th>Phone</th><th>Date</th><th>Time</th><th>Status</th></tr></thead><tbody>${appts}</tbody></table>
    `;

    doctorDetailModal.show();
  } catch (err) {
    setStatus(err.message, true);
  }
}

async function openEditDoctor(doctorId) {
  try {
    const data = await requestJson(`${API_BASE}/admin/doctors/${doctorId}`);
    const d = data.doctor;
    const form = document.getElementById('editDoctorForm');
    form.id.value = d.id;
    form.name.value = d.name;
    form.degree.value = d.degree;
    form.department.value = d.department;
    form.fees.value = d.fees;

    elements.editAvailabilityRows.innerHTML = '';
    if (d.availability && d.availability.length) {
      d.availability.forEach((slot) => {
        const row = createEditAvailabilityRow();
        row.querySelector('select[name="availability_day"]').value = slot.day_of_week;
        row.querySelector('input[name="start_time"]').value = slot.start_time;
        row.querySelector('input[name="end_time"]').value = slot.end_time;
        elements.editAvailabilityRows.appendChild(row);
      });
    } else {
      resetEditAvailabilityRows();
    }

    editDoctorModal.show();
  } catch (err) {
    setStatus(err.message, true);
  }
}

function openDeleteConfirm(doctorId) {
  state.pendingDeleteId = doctorId;
  deleteConfirmModal.show();
}

async function addDoctor(form) {
  const formData = new FormData(form);
  await withLoader(async () => {
    const res = await fetch(`${API_BASE}/admin/doctors`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        auth.clearStoredUsers();
        window.location.replace('index.html');
      }
      throw new Error(data.error || 'Failed to add doctor');
    }
  });
}

async function updateDoctor(form) {
  const formData = new FormData(form);
  const id = formData.get('id');
  await withLoader(async () => {
    const res = await fetch(`${API_BASE}/admin/doctors/${id}`, {
      method: 'PUT',
      credentials: 'include',
      body: formData
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        auth.clearStoredUsers();
        window.location.replace('index.html');
      }
      throw new Error(data.error || 'Failed to update doctor');
    }
  });
}

async function deleteDoctor() {
  await withLoader(async () => {
    const res = await fetch(`${API_BASE}/admin/doctors/${state.pendingDeleteId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        auth.clearStoredUsers();
        window.location.replace('index.html');
      }
      throw new Error(data.error || 'Failed to delete doctor');
    }
  });
}

function bindEvents() {
  document.getElementById('addAvailabilityBtn').addEventListener('click', () => {
    elements.availabilityRows.appendChild(createAvailabilityRow());
  });

  document.getElementById('openAddDoctorBtn').addEventListener('click', () => {
    resetAvailabilityRows();
    addDoctorModal.show();
  });

  document.getElementById('addDoctorForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await addDoctor(event.target);
      setStatus('Doctor added successfully.');
      event.target.reset();
      resetAvailabilityRows();
      addDoctorModal.hide();
      loadDoctors();
    } catch (err) {
      setStatus(err.message, true);
    }
  });

  document.getElementById('adminLogoutBtn').addEventListener('click', () => {
    if (window.confirm('Are you sure you want to logout?')) {
      auth.logout('index.html');
    }
  });

  document.getElementById('editAddAvailabilityBtn')?.addEventListener('click', () => {
    elements.editAvailabilityRows.appendChild(createEditAvailabilityRow());
  });

  document.getElementById('editDoctorForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await updateDoctor(event.target);
      setStatus('Doctor updated successfully.');
      editDoctorModal.hide();
      loadDoctors();
    } catch (err) {
      setStatus(err.message, true);
    }
  });

  document.getElementById('confirmDeleteBtn')?.addEventListener('click', async () => {
    if (!state.pendingDeleteId) return;

    try {
      await deleteDoctor();
      setStatus('Doctor deleted successfully.');
      deleteConfirmModal.hide();
      state.pendingDeleteId = null;
      loadDoctors();
    } catch (err) {
      setStatus(err.message, true);
    }
  });
}

async function init() {
  const user = await auth.requireSession('admin', 'index.html');
  if (!user) return;

  auth.watchProtectedPage('admin', 'index.html');
  bindEvents();
  resetAvailabilityRows();
  await loadDoctors();
}

init();
