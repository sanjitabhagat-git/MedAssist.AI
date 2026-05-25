const API_BASE = 'http://localhost:5000/api';

const admin = JSON.parse(localStorage.getItem('adminUser') || 'null');
if (!admin) window.location.href = 'admin-login.html';

const addDoctorModal = new bootstrap.Modal(document.getElementById('addDoctorModal'));
const doctorDetailModal = new bootstrap.Modal(document.getElementById('doctorDetailModal'));

function setStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.className = isError ? 'small mt-3 text-danger' : 'small mt-3 text-muted';
  status.textContent = message;
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
        <td><img src="${d.photo_url || 'https://via.placeholder.com/50'}" class="doctor-thumb" /></td>
        <td>${d.name}</td>
        <td>${d.department}</td>
        <td>${d.degree}</td>
        <td>INR ${d.fees}</td>
        <td>${d.available_schedule}</td>
        <td><button class="btn btn-sm btn-outline-primary detail-btn" data-id="${d.id}">View Detail</button></td>
      </tr>`).join('');

    document.getElementById('doctorTableWrap').innerHTML = `
      <table class="table table-bordered table-hover">
        <thead><tr><th>Photo</th><th>Name</th><th>Department</th><th>Degree</th><th>Fees</th><th>Available Day/Time</th><th>Action</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    document.querySelectorAll('.detail-btn').forEach((btn) => {
      btn.addEventListener('click', () => showDoctorDetail(btn.getAttribute('data-id')));
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
      ? data.appointments.map((a) => `<tr><td>${a.id}</td><td>${a.patient_name}</td><td>${a.patient_email}</td><td>${a.patient_phone}</td><td>${a.appointment_date}</td><td>${a.appointment_time}</td><td>${a.status}</td></tr>`).join('')
      : '<tr><td colspan="7" class="text-muted">No booked appointments.</td></tr>';

    document.getElementById('doctorDetailBody').innerHTML = `
      <div class="d-flex gap-3 mb-3 align-items-center">
        <img src="${d.photo_url || 'https://via.placeholder.com/120'}" style="width:120px;height:120px;object-fit:cover;border-radius:10px;" />
        <div>
          <h5>${d.name}</h5>
          <p class="mb-1">${d.degree}</p>
          <p class="mb-1">${d.department}</p>
          <p class="mb-0">INR ${d.fees} | ${d.available_schedule}</p>
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

document.getElementById('openAddDoctorBtn').addEventListener('click', () => addDoctorModal.show());

document.getElementById('addDoctorForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const formData = new FormData(e.target);
    const res = await fetch(`${API_BASE}/admin/doctors`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add doctor');

    setStatus('Doctor added successfully.');
    e.target.reset();
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

loadDoctors();
