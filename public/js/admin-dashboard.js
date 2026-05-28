const API_BASE = 'http://localhost:5000/api';

const admin = JSON.parse(localStorage.getItem('adminUser') || 'null');
if (!admin) window.location.href = 'admin-login.html';

const addDoctorModal = new bootstrap.Modal(document.getElementById('addDoctorModal'));
const doctorDetailModal = new bootstrap.Modal(document.getElementById('doctorDetailModal'));
const editDoctorModal = new bootstrap.Modal(document.getElementById('editDoctorModal'));
const deleteConfirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
const dayOptions = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function setStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.className = isError ? 'small mt-3 text-danger' : 'small mt-3 text-muted';
  status.textContent = message;
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

function formatSchedule(schedule) {
  return escapeHtml(schedule || 'Not set').replace(/\n/g, '<br>');
}

function showLoader() {
  const loader = document.getElementById('globalLoader');
  if (!loader) return Promise.resolve();
  loader.style.display = 'flex';
  // return a promise that resolves after 3s fixed delay
  return new Promise((resolve) => setTimeout(resolve, 3000));
}

function hideLoader() {
  const loader = document.getElementById('globalLoader');
  if (loader) loader.style.display = 'none';
}

async function requestJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
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

    document.getElementById('doctorTableWrap').innerHTML = `
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
    // show loader and ensure minimum 3s processing
    const loaderPromise = showLoader();
    const dataPromise = requestJson(`${API_BASE}/admin/doctors/${doctorId}`);
    const [data] = await Promise.all([dataPromise, loaderPromise]);
    const d = data.doctor;
    const appts = data.appointments.length
      ? data.appointments.map((a) => `<tr><td>${a.id}</td><td>${escapeHtml(a.patient_name)}</td><td>${escapeHtml(a.patient_email)}</td><td>${escapeHtml(a.patient_phone)}</td><td>${escapeHtml(a.appointment_date)}</td><td>${escapeHtml(a.appointment_time)}</td><td>${escapeHtml(a.status)}</td></tr>`).join('')
      : '<tr><td colspan="7" class="text-muted">No booked appointments.</td></tr>';

    document.getElementById('doctorDetailBody').innerHTML = `
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

    hideLoader();
    doctorDetailModal.show();
  } catch (err) {
    hideLoader();
    setStatus(err.message, true);
  }
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
  const rows = document.getElementById('availabilityRows');
  rows.innerHTML = '';
  rows.appendChild(createAvailabilityRow());
}

document.getElementById('addAvailabilityBtn').addEventListener('click', () => {
  document.getElementById('availabilityRows').appendChild(createAvailabilityRow());
});

document.getElementById('openAddDoctorBtn').addEventListener('click', () => {
  resetAvailabilityRows();
  addDoctorModal.show();
});

document.getElementById('addDoctorForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const formData = new FormData(e.target);
    // show loader while processing, ensure 3s delay
    const loaderPromise = showLoader();
    const resPromise = fetch(`${API_BASE}/admin/doctors`, { method: 'POST', body: formData });
    const [res] = await Promise.all([resPromise, loaderPromise]);
    const data = await res.json();
    hideLoader();
    if (!res.ok) throw new Error(data.error || 'Failed to add doctor');

    setStatus('Doctor added successfully.');
    e.target.reset();
    resetAvailabilityRows();
    addDoctorModal.hide();
    loadDoctors();
  } catch (err) {
    setStatus(err.message, true);
  }
});

document.getElementById('adminLogoutBtn').addEventListener('click', () => {
  localStorage.removeItem('adminUser');
  window.location.href = 'admin-login.html';
});

resetAvailabilityRows();
loadDoctors();

// Edit doctor handlers
document.getElementById('editAddAvailabilityBtn')?.addEventListener('click', () => {
  document.getElementById('editAvailabilityRows').appendChild(createEditAvailabilityRow());
});

function resetEditAvailabilityRows() {
  const rows = document.getElementById('editAvailabilityRows');
  rows.innerHTML = '';
  rows.appendChild(createEditAvailabilityRow());
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

    // populate availability
    resetEditAvailabilityRows();
    const container = document.getElementById('editAvailabilityRows');
    container.innerHTML = '';
    if (d.availability && d.availability.length) {
      d.availability.forEach((slot) => {
        const row = createEditAvailabilityRow();
        row.querySelector('select[name="availability_day"]').value = slot.day_of_week;
        row.querySelector('input[name="start_time"]').value = slot.start_time;
        row.querySelector('input[name="end_time"]').value = slot.end_time;
        container.appendChild(row);
      });
    } else {
      resetEditAvailabilityRows();
    }

    editDoctorModal.show();
  } catch (err) {
    setStatus(err.message, true);
  }
}

document.getElementById('editDoctorForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const formData = new FormData(e.target);
    const id = formData.get('id');
    const loaderPromise = showLoader();
    const resPromise = fetch(`${API_BASE}/admin/doctors/${id}`, { method: 'PUT', body: formData });
    const [res] = await Promise.all([resPromise, loaderPromise]);
    const data = await res.json();
    hideLoader();
    if (!res.ok) throw new Error(data.error || 'Failed to update doctor');

    setStatus('Doctor updated successfully.');
    editDoctorModal.hide();
    loadDoctors();
  } catch (err) {
    hideLoader();
    setStatus(err.message, true);
  }
});

// Delete handlers
let pendingDeleteId = null;
function openDeleteConfirm(doctorId) {
  pendingDeleteId = doctorId;
  deleteConfirmModal.show();
}

document.getElementById('confirmDeleteBtn')?.addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  try {
    const loaderPromise = showLoader();
    const resPromise = fetch(`${API_BASE}/admin/doctors/${pendingDeleteId}`, { method: 'DELETE' });
    const [res] = await Promise.all([resPromise, loaderPromise]);
    const data = await res.json();
    hideLoader();
    if (!res.ok) throw new Error(data.error || 'Failed to delete doctor');

    setStatus('Doctor deleted successfully.');
    deleteConfirmModal.hide();
    pendingDeleteId = null;
    loadDoctors();
  } catch (err) {
    hideLoader();
    setStatus(err.message, true);
  }
});
