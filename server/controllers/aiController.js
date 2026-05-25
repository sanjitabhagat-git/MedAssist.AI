const pool = require('../db');

const SAFETY_PROMPT = `You are a medical appointment triage assistant, NOT a doctor.

Safety rules:
- Never diagnose diseases.
- Never prescribe medicines.
- Never recommend dosage.
- Only suggest a medical department and urgency.
- Encourage consulting a licensed healthcare professional.
- Include this disclaimer exactly: "AI cannot diagnose medical conditions."

Return JSON only with this schema:
{
  "department": "Cardiology | Dermatology | Orthopedics | Neurology | General Medicine",
  "urgency": "Low | Medium | High",
  "recommendation": "short appointment recommendation",
  "disclaimer": "AI cannot diagnose medical conditions."
}`;

const allowedDepartments = new Set([
  'Cardiology',
  'Dermatology',
  'Orthopedics',
  'Neurology',
  'General Medicine'
]);

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[0]);
  } catch (_err) {
    return null;
  }
}

function safeFallback() {
  return {
    department: 'General Medicine',
    urgency: 'Medium',
    recommendation: 'Book a consultation with a general physician for further evaluation.',
    disclaimer: 'AI cannot diagnose medical conditions.'
  };
}

function normalizeAiResponse(parsed) {
  const fallback = safeFallback();

  if (!parsed || typeof parsed !== 'object') {
    return fallback;
  }

  const department = allowedDepartments.has(parsed.department)
    ? parsed.department
    : fallback.department;

  const urgency = ['Low', 'Medium', 'High'].includes(parsed.urgency)
    ? parsed.urgency
    : fallback.urgency;

  const recommendation = typeof parsed.recommendation === 'string' && parsed.recommendation.trim().length > 0
    ? parsed.recommendation.trim()
    : fallback.recommendation;

  return {
    department,
    urgency,
    recommendation,
    disclaimer: 'AI cannot diagnose medical conditions.'
  };
}

exports.analyzeSymptoms = async (req, res, next) => {
  try {
    const { user_id, symptoms } = req.body;

    if (!user_id || !symptoms || symptoms.trim().length < 5) {
      return res.status(400).json({ error: 'user_id and valid symptoms are required.' });
    }

    const ollamaUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/generate';
    const model = process.env.OLLAMA_MODEL || 'llama3.1:8b';

    const prompt = `${SAFETY_PROMPT}\n\nPatient symptoms: ${symptoms}`;

    const aiRaw = await fetch(ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false
      })
    });

    if (!aiRaw.ok) {
      let detail = '';
      try {
        const errData = await aiRaw.json();
        detail = errData?.error ? `: ${errData.error}` : '';
      } catch (_err) {
        // Ignore parse errors and keep generic status details.
      }

      throw new Error(`Ollama request failed with status ${aiRaw.status}${detail}`);
    }

    const aiData = await aiRaw.json();
    const parsed = extractJson(aiData.response || '');
    const aiResponse = normalizeAiResponse(parsed);

    await pool.query(
      'INSERT INTO symptom_logs (user_id, symptoms, ai_response) VALUES (?, ?, ?)',
      [user_id, symptoms, JSON.stringify(aiResponse)]
    );

    return res.json(aiResponse);
  } catch (err) {
    next(err);
  }
};

exports.chatSupport = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const ollamaUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/generate';
    const model = process.env.OLLAMA_MODEL || 'llama3.1:8b';

    const supportPrompt = `You are a hospital appointment support assistant.
Rules:
- Do not diagnose.
- Do not prescribe medicine.
- Help with departments, urgency guidance, and appointment workflow.
- Keep answer concise and patient-friendly.
- End with: AI cannot diagnose medical conditions.

Patient message: ${message}`;

    const aiRaw = await fetch(ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: supportPrompt, stream: false })
    });

    if (!aiRaw.ok) {
      let detail = '';
      try {
        const errData = await aiRaw.json();
        detail = errData?.error ? `: ${errData.error}` : '';
      } catch (_err) {
        // Ignore parse errors and keep generic status details.
      }

      throw new Error(`Ollama request failed with status ${aiRaw.status}${detail}`);
    }

    const aiData = await aiRaw.json();
    return res.json({ reply: aiData.response || 'Please consult the hospital front desk for support.' });
  } catch (err) {
    next(err);
  }
};
