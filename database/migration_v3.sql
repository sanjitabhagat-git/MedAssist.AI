USE ai_medical_assistant;

/*
  Convert legacy appointments that stored only the start time
  into the new human-readable range format:
  "2:00 PM to 4:00 PM"
*/
UPDATE appointments a
JOIN doctor_availability da
  ON da.doctor_id = a.doctor_id
 AND da.day_of_week = DAYNAME(a.appointment_date)
 AND (
      TIME_FORMAT(da.start_time, '%H:%i') = a.appointment_time
   OR TIME_FORMAT(da.start_time, '%H:%i:%s') = a.appointment_time
 )
SET a.appointment_time = CONCAT(
  TIME_FORMAT(da.start_time, '%l:%i %p'),
  ' to ',
  TIME_FORMAT(da.end_time, '%l:%i %p')
)
WHERE a.appointment_time NOT LIKE '% to %';
