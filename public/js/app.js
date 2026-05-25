const API_BASE = 'http://localhost:5000/api';
const DEMO_USER_ID = 1;

let selectedDepartment = '';
let selectedDoctorId = null;

const statusEl = document.getElementById('status');
const aiResultSection = document.getElementById('aiResultSection');
const doctorSection = document.getElementById('doctorSection');

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = isError ? 'mt-3 small text-danger' : 'mt-3 small text-muted';
}

async function requestJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

document.getElementById('analyzeBtn').addEventListener('click', async () => {
  try {
    const symptoms = document.getElementById('symptoms').value.trim();
    if (symptoms.length < 5) {
      setStatus('Please enter more detailed symptoms.', true);
      return;
    }

    setStatus('Analyzing symptoms with AI...');
    const ai = await requestJson(`${API_BASE}/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: DEMO_USER_ID, symptoms })
    });

    selectedDepartment = ai.department;

    document.getElementById('departmentText').textContent = ai.department;
    document.getElementById('urgencyText').textContent = ai.urgency;
    document.getElementById('recommendationText').textContent = ai.recommendation;

    aiResultSection.classList.remove('d-none');
    setStatus('AI suggestion generated successfully.');
  } catch (err) {
    setStatus(err.message, true);
  }
});

document.getElementById('loadDoctorsBtn').addEventListener('click', async () => {
  try {
    if (!selectedDepartment) {
      setStatus('Analyze symptoms first.', true);
      return;
    }

    setStatus('Loading available doctors...');
    const doctors = await requestJson(`${API_BASE}/appointments/doctors?department=${encodeURIComponent(selectedDepartment)}`);

    const list = document.getElementById('doctorList');
    list.innerHTML = '';

    if (!doctors.length) {
      list.innerHTML = '<p class="text-muted">No doctors found for this department.</p>';
      doctorSection.classList.remove('d-none');
      return;
    }

    doctors.forEach((doc) => {
      const col = document.createElement('div');
      col.className = 'col-md-6';
      col.innerHTML = `
        <div class="doctor-card" data-id="${doc.id}">
          <h6 class="mb-1">${doc.name}</h6>
          <p class="mb-1">${doc.specialization}</p>
          <small class="text-muted">Available: ${doc.available_from} - ${doc.available_to}</small>
        </div>
      `;

      col.querySelector('.doctor-card').addEventListener('click', (e) => {
        document.querySelectorAll('.doctor-card').forEach((card) => card.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        selectedDoctorId = doc.id;
      });

      list.appendChild(col);
    });

    doctorSection.classList.remove('d-none');
    setStatus('Select a doctor and time slot to continue.');
  } catch (err) {
    setStatus(err.message, true);
  }
});

document.getElementById('bookBtn').addEventListener('click', async () => {
  try {
    const appointmentDate = document.getElementById('appointmentDate').value;
    const appointmentTime = document.getElementById('appointmentTime').value;

    if (!selectedDoctorId || !appointmentDate || !appointmentTime) {
      setStatus('Please select doctor, date, and time.', true);
      return;
    }

    setStatus('Booking appointment...');
    const booked = await requestJson(`${API_BASE}/appointments/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: DEMO_USER_ID,
        doctor_id: selectedDoctorId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime
      })
    });

    setStatus(`${booked.message}. Appointment ID: ${booked.appointment_id}`);
    await loadAppointments();
  } catch (err) {
    setStatus(err.message, true);
  }
});

document.getElementById('chatBtn').addEventListener('click', async () => {
  try {
    const message = document.getElementById('chatInput').value.trim();
    if (!message) {
      setStatus('Enter a support question.', true);
      return;
    }

    setStatus('Generating support response...');
    const data = await requestJson(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    const chatOutput = document.getElementById('chatOutput');
    chatOutput.textContent = data.reply;
    chatOutput.classList.remove('d-none');
    setStatus('Support response ready.');
  } catch (err) {
    setStatus(err.message, true);
  }
});

async function loadAppointments() {
  try {
    const appointments = await requestJson(`${API_BASE}/appointments/user/${DEMO_USER_ID}`);
    const container = document.getElementById('appointmentsList');

    if (!appointments.length) {
      container.innerHTML = '<p class="text-muted">No appointments booked yet.</p>';
      return;
    }

    const rows = appointments.map((a) => `
      <tr>
        <td>${a.id}</td>
        <td>${a.department}</td>
        <td>${a.doctor_name}</td>
        <td>${a.appointment_date}</td>
        <td>${a.appointment_time}</td>
        <td><span class="badge text-bg-primary">${a.status}</span></td>
      </tr>
    `).join('');

    container.innerHTML = `
      <table class="table table-striped table-sm">
        <thead>
          <tr>
            <th>ID</th>
            <th>Department</th>
            <th>Doctor</th>
            <th>Date</th>
            <th>Time</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  } catch (err) {
    setStatus(err.message, true);
  }
}

document.getElementById('refreshAppointmentsBtn').addEventListener('click', loadAppointments);
window.addEventListener('DOMContentLoaded', loadAppointments);
