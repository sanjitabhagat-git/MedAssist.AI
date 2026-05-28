const API_BASE = 'http://localhost:5000/api';

const patient = JSON.parse(localStorage.getItem('patientUser') || 'null');
if (!patient) window.location.href = 'login.html';

document.getElementById('patientName').textContent = `${patient.name} (${patient.email})`;

let selectedDepartment = '';
let selectedDoctorId = null;
let selectedDoctor = null;
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

function formatTime(time) {
  const [hours, minutes] = String(time).split(':');
  const date = new Date(2000, 0, 1, Number(hours), Number(minutes));
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatSchedule(schedule) {
  return escapeHtml(schedule || 'Not set').replace(/\n/g, '<br>');
}

async function requestJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function resetSlotFields() {
  const daySelect = document.getElementById('appointmentDay');
  const timeSelect = document.getElementById('appointmentTime');

  daySelect.innerHTML = '<option value="">Select Day</option>';
  timeSelect.innerHTML = '<option value="">Select Time Slot</option>';
  daySelect.disabled = true;
  timeSelect.disabled = true;
}

function populateDayOptions(doctor) {
  resetSlotFields();

  const daySelect = document.getElementById('appointmentDay');
  const availableDays = [...new Set((doctor.availability || []).map((slot) => slot.day_of_week))];

  availableDays.forEach((day) => {
    const option = document.createElement('option');
    option.value = day;
    option.textContent = day;
    daySelect.appendChild(option);
  });

  daySelect.disabled = availableDays.length === 0;
}

function populateTimeSlots(day) {
  const timeSelect = document.getElementById('appointmentTime');
  timeSelect.innerHTML = '<option value="">Select Time Slot</option>';

  const slots = (selectedDoctor?.availability || []).filter((slot) => slot.day_of_week === day);
  slots.forEach((slot) => {
    const option = document.createElement('option');
    option.value = slot.start_time;
    option.textContent = `${formatTime(slot.start_time)} to ${formatTime(slot.end_time)}`;
    timeSelect.appendChild(option);
  });

  timeSelect.disabled = slots.length === 0;
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
    selectedDoctorId = null;
    selectedDoctor = null;
    resetSlotFields();

    doctors.forEach((doc) => {
      const col = document.createElement('div');
      col.className = 'col-md-6';
      col.innerHTML = `
        <div class="doctor-card" data-id="${doc.id}">
          <div class="d-flex gap-2 align-items-center">
            <img src="${escapeHtml(doc.photo_url || 'https://via.placeholder.com/60')}" class="doctor-thumb" alt="doctor" />
            <div>
              <h6 class="mb-1">${escapeHtml(doc.name)}</h6>
              <p class="mb-1">${escapeHtml(doc.degree)}</p>
              <small>Fee: INR ${escapeHtml(doc.fees)}</small>
              <small class="d-block">${formatSchedule(doc.available_schedule)}</small>
            </div>
          </div>
        </div>`;

      col.querySelector('.doctor-card').addEventListener('click', (e) => {
        document.querySelectorAll('.doctor-card').forEach((card) => card.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        selectedDoctorId = doc.id;
        selectedDoctor = doc;
        populateDayOptions(doc);
      });

      list.appendChild(col);
    });

    document.getElementById('doctorSection').classList.remove('d-none');
  } catch (err) {
    setStatus(err.message, true);
  }
});

document.getElementById('appointmentDay').addEventListener('change', (e) => {
  populateTimeSlots(e.target.value);
});

document.getElementById('bookBtn').addEventListener('click', async () => {
  try {
    const appointment_day = document.getElementById('appointmentDay').value;
    const appointment_date = document.getElementById('appointmentDate').value;
    const appointment_time = document.getElementById('appointmentTime').value;

    if (!selectedDoctorId || !appointment_day || !appointment_date || !appointment_time) {
      return setStatus('Select doctor, available day, date and time slot.', true);
    }

    const selectedDateDay = dayNames[new Date(`${appointment_date}T00:00:00`).getDay()];
    if (selectedDateDay !== appointment_day) {
      return setStatus(`Selected date is ${selectedDateDay}. Please choose a ${appointment_day} date.`, true);
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
        <td>${a.id}</td><td>${escapeHtml(a.department)}</td><td>${escapeHtml(a.doctor_name)}</td>
        <td>${escapeHtml(a.appointment_date)}</td><td>${escapeHtml(a.appointment_time)}</td>
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

resetSlotFields();
loadAppointments();
