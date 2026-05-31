const API_BASE = 'http://localhost:5000/api';
const auth = window.AppAuth;
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const state = {
  user: null,
  selectedDepartment: '',
  selectedDoctorId: null,
  selectedDoctor: null,
  activeRequests: 0,
  datePicker: null
};

const elements = {
  status: document.getElementById('status'),
  patientName: document.getElementById('patientName'),
  symptoms: document.getElementById('symptoms'),
  aiResultSection: document.getElementById('aiResultSection'),
  departmentText: document.getElementById('departmentText'),
  urgencyText: document.getElementById('urgencyText'),
  recommendationText: document.getElementById('recommendationText'),
  doctorSection: document.getElementById('doctorSection'),
  doctorList: document.getElementById('doctorList'),
  appointmentDate: document.getElementById('appointmentDate'),
  appointmentTime: document.getElementById('appointmentTime'),
  appointmentsList: document.getElementById('appointmentsList')
};

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

function formatAppointmentDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function formatSchedule(schedule) {
  return escapeHtml(schedule || 'Not set').replace(/\n/g, '<br>');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function showPageLoader() {
  const loader = document.getElementById('pageLoader');
  if (!loader) return;
  loader.classList.remove('d-none');
}

function hidePageLoader() {
  if (state.activeRequests > 0) return;
  const loader = document.getElementById('pageLoader');
  if (!loader) return;
  loader.classList.add('d-none');
}

function beginRequest() {
  state.activeRequests += 1;
  showPageLoader();
}

function endRequest() {
  state.activeRequests = Math.max(0, state.activeRequests - 1);
  hidePageLoader();
}

async function requestJson(url, options = {}) {
  beginRequest();
  try {
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
      if ((res.status === 401 || res.status === 403) && auth) {
        auth.clearStoredUsers();
        window.location.replace('index.html');
      }
      throw new Error(data.error || 'Request failed');
    }

    return data;
  } finally {
    endRequest();
  }
}

function setButtonLoading(buttonId, loading) {
  const button = document.getElementById(buttonId);
  if (!button) return;

  button.disabled = loading;
  const spinner = button.querySelector('.btn-spinner');
  if (spinner) {
    spinner.classList.toggle('d-none', !loading);
  }
}

async function runWithButtonLoader(buttonId, task) {
  setButtonLoading(buttonId, true);
  try {
    const [taskResult] = await Promise.allSettled([task(), delay(3000)]);
    if (taskResult.status === 'rejected') {
      throw taskResult.reason;
    }
    return taskResult.value;
  } finally {
    setButtonLoading(buttonId, false);
  }
}

function resetAppointmentFields() {
  if (state.datePicker) {
    state.datePicker.clear();
    state.datePicker.destroy();
    state.datePicker = null;
  }

  elements.appointmentDate.value = '';
  elements.appointmentDate.disabled = true;

  elements.appointmentTime.innerHTML = '<option value="">Select Time Slot</option>';
  elements.appointmentTime.disabled = true;
  document.getElementById('bookBtn').disabled = true;
}

function clearDoctorSelection(clearList = false) {
  state.selectedDoctorId = null;
  state.selectedDoctor = null;
  if (clearList) {
    elements.doctorList.innerHTML = '';
  }
  resetAppointmentFields();
}

function updateBookButtonState() {
  const hasDoctor = Boolean(state.selectedDoctorId);
  const hasDate = Boolean(elements.appointmentDate.value);
  const hasTime = Boolean(elements.appointmentTime.value);
  document.getElementById('bookBtn').disabled = !(hasDoctor && hasDate && hasTime);
}

function getAvailableDays(doctor) {
  return [...new Set((doctor?.availability || []).map((slot) => slot.day_of_week))];
}

function getSlotsForSelectedDate(dateValue) {
  if (!state.selectedDoctor || !dateValue) return [];
  const selectedDay = dayNames[new Date(`${dateValue}T00:00:00`).getDay()];
  return (state.selectedDoctor.availability || []).filter((slot) => slot.day_of_week === selectedDay);
}

function populateTimeSlots(dateValue) {
  const timeSelect = elements.appointmentTime;
  timeSelect.innerHTML = '<option value="">Select Time Slot</option>';
  timeSelect.disabled = true;
  timeSelect.value = '';

  const slots = getSlotsForSelectedDate(dateValue);
  slots.forEach((slot) => {
    const option = document.createElement('option');
    option.value = `${slot.start_time}|${slot.end_time}`;
    option.textContent = `${formatTime(slot.start_time)} to ${formatTime(slot.end_time)}`;
    timeSelect.appendChild(option);
  });

  timeSelect.disabled = slots.length === 0;
  updateBookButtonState();
}

function setupDatePicker() {
  if (state.datePicker) {
    state.datePicker.destroy();
    state.datePicker = null;
  }

  const allowedDays = getAvailableDays(state.selectedDoctor);
  elements.appointmentDate.disabled = allowedDays.length === 0;

  if (!allowedDays.length || typeof flatpickr === 'undefined') {
    return;
  }

  state.datePicker = flatpickr(elements.appointmentDate, {
    dateFormat: 'Y-m-d',
    minDate: 'today',
    disable: [
      (date) => !allowedDays.includes(dayNames[date.getDay()])
    ],
    onChange: (_selectedDates, dateStr) => {
      populateTimeSlots(dateStr);
    }
  });
}

function renderDoctorCards(doctors) {
  elements.doctorList.innerHTML = '';

  if (!doctors.length) {
    elements.doctorList.innerHTML = '<p class="text-muted">No doctors found for this department.</p>';
    return;
  }

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

    col.querySelector('.doctor-card').addEventListener('click', (event) => {
      document.querySelectorAll('.doctor-card').forEach((card) => card.classList.remove('selected'));
      event.currentTarget.classList.add('selected');

      state.selectedDoctorId = doc.id;
      state.selectedDoctor = doc;
      elements.appointmentDate.value = '';
      elements.appointmentTime.innerHTML = '<option value="">Select Time Slot</option>';
      elements.appointmentTime.disabled = true;
      setupDatePicker();
      updateBookButtonState();
    });

    elements.doctorList.appendChild(col);
  });
}

function clearAppointmentContext() {
  clearDoctorSelection(true);
  state.selectedDepartment = '';
  elements.aiResultSection.classList.add('d-none');
}

async function loadAppointments(useButtonLoader = false) {
  try {
    const fetchAppointments = () => requestJson(`${API_BASE}/appointments/user`);
    const appointments = useButtonLoader
      ? await runWithButtonLoader('refreshAppointmentsBtn', fetchAppointments)
      : await fetchAppointments();

    if (!appointments.length) {
      elements.appointmentsList.innerHTML = '<p class="text-muted">No appointments booked yet.</p>';
      return;
    }

    const rows = appointments.map((a) => `
      <tr>
        <td>${a.id}</td>
        <td>${escapeHtml(a.department)}</td>
        <td>${escapeHtml(a.doctor_name)}</td>
        <td>${escapeHtml(formatAppointmentDate(a.appointment_date))}</td>
        <td>${escapeHtml(String(a.appointment_time ?? ''))}</td>
        <td>
          <span class="badge text-bg-primary">${a.status}</span>
          <button class="btn btn-link btn-sm p-0 ms-2 invoice-btn" type="button" data-id="${a.id}">
            PDF
            <span class="spinner-border spinner-border-sm ms-1 d-none invoice-spinner" role="status" aria-hidden="true"></span>
          </button>
        </td>
      </tr>
    `).join('');

    elements.appointmentsList.innerHTML = `
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
      </table>`;

    document.querySelectorAll('.invoice-btn').forEach((button) => {
      button.addEventListener('click', () => downloadInvoice(button));
    });
  } catch (err) {
    setStatus(err.message, true);
  }
}

async function loadDoctors() {
  try {
    if (!state.selectedDepartment) {
      throw new Error('Analyze symptoms first.');
    }

    const fetchDoctors = () => requestJson(
      `${API_BASE}/appointments/doctors?department=${encodeURIComponent(state.selectedDepartment)}`
    );
    const doctors = await runWithButtonLoader('loadDoctorsBtn', fetchDoctors);

    clearDoctorSelection();
    renderDoctorCards(doctors);
    elements.doctorSection.classList.remove('d-none');

    if (!doctors.length) {
      setStatus('No available doctors found for this department.', true);
      return;
    }

    setStatus('Select a doctor, date, and available time slot to continue.');
  } catch (err) {
    setStatus(err.message, true);
  }
}

async function analyzeSymptoms() {
  try {
    const symptoms = elements.symptoms.value.trim();
    if (symptoms.length < 5) {
      throw new Error('Please enter detailed symptoms.');
    }

    const ai = await runWithButtonLoader('analyzeBtn', () => requestJson(`${API_BASE}/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptoms })
    }));

    state.selectedDepartment = ai.department;
    elements.departmentText.textContent = ai.department;
    elements.urgencyText.textContent = ai.urgency;
    elements.recommendationText.textContent = ai.recommendation;
    elements.aiResultSection.classList.remove('d-none');
    elements.doctorSection.classList.add('d-none');
    clearDoctorSelection(true);
    setStatus('AI recommendation ready.');
  } catch (err) {
    setStatus(err.message, true);
  }
}

async function bookAppointment() {
  try {
    const appointmentDate = elements.appointmentDate.value;
    const appointmentSlot = elements.appointmentTime.value;
    const [startTime, endTime] = appointmentSlot.split('|');

    if (!state.selectedDoctorId || !appointmentDate || !startTime || !endTime) {
      throw new Error('Select a doctor, appointment date, and available time slot.');
    }

    const allowedSlots = getSlotsForSelectedDate(appointmentDate);
    const matchedSlot = allowedSlots.find((slot) => slot.start_time === startTime && slot.end_time === endTime);
    if (!matchedSlot) {
      throw new Error('Selected time slot is not available for the chosen doctor and date.');
    }

    const appointmentTime = `${formatTime(matchedSlot.start_time)} to ${formatTime(matchedSlot.end_time)}`;

    const booked = await runWithButtonLoader('bookBtn', () => requestJson(`${API_BASE}/appointments/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctor_id: state.selectedDoctorId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime
      })
    }));

    setStatus(`${booked.message} ID: ${booked.appointment_id}`);
    elements.appointmentTime.value = '';
    updateBookButtonState();
    await loadAppointments();
  } catch (err) {
    setStatus(err.message, true);
  }
}

async function downloadInvoice(button) {
  if (button.disabled) return;

  const appointmentId = button.getAttribute('data-id');
  const spinner = button.querySelector('.invoice-spinner');
  button.disabled = true;
  if (spinner) spinner.classList.remove('d-none');

  try {
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const response = await fetch(`${API_BASE}/appointments/${appointmentId}/invoice`, {
      credentials: 'include'
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      if ((response.status === 401 || response.status === 403) && auth) {
        auth.clearStoredUsers();
        window.location.replace('index.html');
      }
      throw new Error(data.error || 'Failed to download invoice');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `invoice_appointment_${appointmentId}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    if (spinner) spinner.classList.add('d-none');
    button.disabled = false;
  }
}

function bindEvents() {
  document.getElementById('analyzeBtn').addEventListener('click', analyzeSymptoms);
  document.getElementById('loadDoctorsBtn').addEventListener('click', loadDoctors);
  document.getElementById('bookBtn').addEventListener('click', bookAppointment);
  document.getElementById('refreshAppointmentsBtn').addEventListener('click', () => loadAppointments(true));
  document.getElementById('logoutBtn').addEventListener('click', () => {
    if (window.confirm('Are you sure you want to logout?')) {
      auth.logout('index.html');
    }
  });
  elements.appointmentTime.addEventListener('change', updateBookButtonState);
}

async function init() {
  state.user = await auth.requireSession('patient', 'index.html');
  if (!state.user) return;

  auth.watchProtectedPage('patient', 'index.html');

  elements.patientName.textContent = `${state.user.name} (${state.user.email})`;
  bindEvents();
  resetAppointmentFields();
  await loadAppointments();
}

init();
