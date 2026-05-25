const API_BASE = 'http://localhost:5000/api';

const patient = JSON.parse(localStorage.getItem('patientUser') || 'null');
if (!patient) window.location.href = 'login.html';

document.getElementById('patientName').textContent = `${patient.name} (${patient.email})`;

let selectedDepartment = '';
let selectedDoctorId = null;

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

document.getElementById('analyzeBtn').addEventListener('click', async () => {
  try {
    const symptoms = document.getElementById('symptoms').value.trim();
    if (symptoms.length < 5) return setStatus('Please enter detailed symptoms.', true);

    const ai = await requestJson(`${API_BASE}/ai/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: patient.id, symptoms })
    });

    selectedDepartment = ai.department;
    document.getElementById('departmentText').textContent = ai.department;
    document.getElementById('urgencyText').textContent = ai.urgency;
    document.getElementById('recommendationText').textContent = ai.recommendation;
    document.getElementById('aiResultSection').classList.remove('d-none');
    setStatus('AI recommendation ready.');
  } catch (err) {
    setStatus(err.message, true);
  }
});

document.getElementById('loadDoctorsBtn').addEventListener('click', async () => {
  try {
    if (!selectedDepartment) return setStatus('Analyze symptoms first.', true);

    const doctors = await requestJson(`${API_BASE}/appointments/doctors?department=${encodeURIComponent(selectedDepartment)}`);
    const list = document.getElementById('doctorList');
    list.innerHTML = '';

    doctors.forEach((doc) => {
      const col = document.createElement('div');
      col.className = 'col-md-6';
      col.innerHTML = `
        <div class="doctor-card" data-id="${doc.id}">
          <div class="d-flex gap-2 align-items-center">
            <img src="${doc.photo_url || 'https://via.placeholder.com/60'}" class="doctor-thumb" alt="doctor" />
            <div>
              <h6 class="mb-1">${doc.name}</h6>
              <p class="mb-1">${doc.degree}</p>
              <small>Fee: INR ${doc.fees} | ${doc.available_schedule}</small>
            </div>
          </div>
        </div>`;

      col.querySelector('.doctor-card').addEventListener('click', (e) => {
        document.querySelectorAll('.doctor-card').forEach((card) => card.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        selectedDoctorId = doc.id;
      });

      list.appendChild(col);
    });

    document.getElementById('doctorSection').classList.remove('d-none');
  } catch (err) {
    setStatus(err.message, true);
  }
});

document.getElementById('bookBtn').addEventListener('click', async () => {
  try {
    const appointment_date = document.getElementById('appointmentDate').value;
    const appointment_time = document.getElementById('appointmentTime').value;

    if (!selectedDoctorId || !appointment_date || !appointment_time) {
      return setStatus('Select doctor, date and time.', true);
    }

    const booked = await requestJson(`${API_BASE}/appointments/book`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: patient.id, doctor_id: selectedDoctorId, appointment_date, appointment_time })
    });

    setStatus(`${booked.message} ID: ${booked.appointment_id}`);
    loadAppointments();
  } catch (err) {
    setStatus(err.message, true);
  }
});

async function loadAppointments() {
  try {
    const appointments = await requestJson(`${API_BASE}/appointments/user/${patient.id}`);
    const container = document.getElementById('appointmentsList');

    if (!appointments.length) {
      container.innerHTML = '<p class="text-muted">No appointments booked yet.</p>';
      return;
    }

    const rows = appointments.map((a) => `
      <tr>
        <td>${a.id}</td><td>${a.department}</td><td>${a.doctor_name}</td>
        <td>${a.appointment_date}</td><td>${a.appointment_time}</td>
        <td><span class="badge text-bg-primary">${a.status}</span> <button class="btn btn-link btn-sm p-0 ms-2 invoice-btn" data-id="${a.id}" title="Download Invoice">PDF</button></td>
      </tr>
    `).join('');

    container.innerHTML = `<table class="table table-striped table-sm"><thead><tr><th>ID</th><th>Department</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;

    document.querySelectorAll('.invoice-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        window.open(`${API_BASE}/appointments/${id}/invoice?user_id=${patient.id}`, '_blank');
      });
    });
  } catch (err) {
    setStatus(err.message, true);
  }
}

document.getElementById('refreshAppointmentsBtn').addEventListener('click', loadAppointments);
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('patientUser');
  window.location.href = 'login.html';
});

loadAppointments();
