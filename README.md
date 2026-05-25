# AI Medical Appointment Assistant

Node.js + MySQL + Ollama + HTML/CSS/Bootstrap project.

## Features
- Patient registration and login
- Admin login and doctor dashboard
- AI symptom analysis and department triage
- Appointment booking
- Invoice PDF download per appointment (with 5% GST)
- Doctor detail popup with booked patient list

## Setup
1. Import `database/schema.sql` in MySQL.
2. Copy `server/.env.example` to `server/.env` and update DB credentials.
3. Run Ollama:
   - `ollama pull llama3.1:8b`
   - `ollama serve`
4. Install dependencies:
   - `cd server`
   - `npm install`
5. Start backend:
   - `npm run dev`
6. Open app:
   - `http://localhost:5000`

## Default Admin Credentials
- Email: `admin@demo.com`
- Password: `admin123`

## API Endpoints
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/admin/login`
- `POST /api/ai/analyze`
- `POST /api/ai/chat`
- `GET /api/appointments/doctors?department=Cardiology`
- `POST /api/appointments/book`
- `GET /api/appointments/user/:userId`
- `GET /api/appointments/:appointmentId/invoice?user_id=:userId`
- `GET /api/admin/doctors`
- `POST /api/admin/doctors`
- `GET /api/admin/doctors/:doctorId`
