const addDays = (days, hour = 10, minutes = 0) => {
    const date = new Date();
    date.setHours(hour, minutes, 0, 0);
    date.setDate(date.getDate() + days);
    return date;
};

export const MOCK_USER = {
    _id: 'demo-patient',
    user_id: 'demo-patient',
    role: 'patient',
    first_name: 'Elena',
    last_name: 'Carter',
    email: 'elena.carter@example.com'
};

export const MOCK_DOCTORS = [
    { _id: 'demo-doctor-1', user_id: 'demo-doctor-1', full_name: 'Dr. Amelia Carter', specialization: 'Obstetrician', schedule_info: 'Mon - Wed, 9:00 AM - 3:00 PM' },
    { _id: 'demo-doctor-2', user_id: 'demo-doctor-2', full_name: 'Dr. Noah Williams', specialization: 'Maternal-fetal medicine', schedule_info: 'Tue - Thu, 10:00 AM - 4:00 PM' },
    { _id: 'demo-doctor-3', user_id: 'demo-doctor-3', full_name: 'Dr. Priya Shah', specialization: 'Sonographer', schedule_info: 'Mon - Fri, 8:00 AM - 2:00 PM' }
];

export const MOCK_APPOINTMENTS = [
    { _id: 'demo-appointment-1', id: 'demo-appointment-1', title: 'Prenatal check-up', start: addDays(2, 9), end: addDays(2, 10), with: 'Dr. Amelia Carter', doctorName: 'Dr. Amelia Carter', doctorId: 'demo-doctor-1', patientId: 'demo-patient', patientName: 'Elena Carter', status: 'scheduled', notes: 'Routine prenatal check-up', location: 'Women\'s Health Clinic' },
    { _id: 'demo-appointment-2', id: 'demo-appointment-2', title: 'Ultrasound scan', start: addDays(5, 11, 30), end: addDays(5, 12, 30), with: 'Dr. Priya Shah', doctorName: 'Dr. Priya Shah', doctorId: 'demo-doctor-3', patientId: 'demo-patient', patientName: 'Elena Carter', status: 'scheduled', notes: '20-week anatomy ultrasound', location: 'Imaging Suite 2' },
    { _id: 'demo-appointment-3', id: 'demo-appointment-3', title: 'Care consultation', start: addDays(9, 14), end: addDays(9, 15), with: 'Dr. Noah Williams', doctorName: 'Dr. Noah Williams', doctorId: 'demo-doctor-2', patientId: 'demo-patient', patientName: 'Elena Carter', status: 'scheduled', notes: 'Review care plan and questions', location: 'Video Call' },
    { _id: 'demo-appointment-4', id: 'demo-appointment-4', title: 'Prenatal check-up', start: addDays(18, 9, 30), end: addDays(18, 10, 30), with: 'Dr. Amelia Carter', doctorName: 'Dr. Amelia Carter', doctorId: 'demo-doctor-1', patientId: 'demo-patient', patientName: 'Elena Carter', status: 'scheduled', notes: 'Routine prenatal check-up', location: 'Women\'s Health Clinic' },
    { _id: 'demo-appointment-5', id: 'demo-appointment-5', title: 'Fetal growth scan', start: addDays(34, 13), end: addDays(34, 14), with: 'Dr. Priya Shah', doctorName: 'Dr. Priya Shah', doctorId: 'demo-doctor-3', patientId: 'demo-patient', patientName: 'Elena Carter', status: 'scheduled', notes: 'Fetal growth and wellbeing scan', location: 'Imaging Suite 2' }
];

export const MOCK_PRESCRIPTIONS = [
    { _id: 'demo-prescription-1', patient_id: 'demo-patient', doctor_id: 'demo-doctor-1', medications: [{ name: 'Prenatal vitamins', dosage: '1 tablet', frequency: 'Daily', duration: '30 days' }], doctorName: 'Dr. Amelia Carter', patientName: 'Elena Carter', prescription: 'Continue prenatal vitamins', date: addDays(-12) },
    { _id: 'demo-prescription-2', patient_id: 'demo-patient', doctor_id: 'demo-doctor-2', medications: [{ name: 'Ferrous sulfate', dosage: '325 mg', frequency: 'Daily with food', duration: '30 days' }], doctorName: 'Dr. Noah Williams', patientName: 'Elena Carter', prescription: 'Iron support', date: addDays(-28) },
    { _id: 'demo-prescription-3', patient_id: 'demo-patient', doctor_id: 'demo-doctor-1', medications: [{ name: 'Calcium supplement', dosage: '500 mg', frequency: 'Twice daily', duration: '60 days' }], doctorName: 'Dr. Amelia Carter', patientName: 'Elena Carter', prescription: 'Calcium support', date: addDays(-42) }
];

export const MOCK_HEART_RATE = [72, 76, 80, 78, 81, 79, 77, 78, 80];
export const MOCK_FHR = [138, 141, 143, 142, 144, 140, 142, 143, 142];
export const MOCK_DAILY_SUMMARY = { heartRate: { min: 72, max: 81, average: 78 }, fetalHeartRate: { min: 138, max: 144, average: 142 }, readings: 18, note: 'Readings are within the normal range.' };

export const MOCK_FHR_HISTORY = Array.from({ length: 7 }, (_, index) => {
    const readings = MOCK_FHR.map((reading, readingIndex) => reading + ((index + readingIndex) % 5) - 2);
    return { date: addDays(-index - 1).toISOString().split('T')[0], bpms: readings, count: readings.length, min: Math.min(...readings), max: Math.max(...readings), avg: Math.round(readings.reduce((sum, reading) => sum + reading, 0) / readings.length) };
});

export const MOCK_DEVICES = [
    { _id: 'demo-doppler', deviceId: 'DOPPLER-DEMO-01', type: 'doppler', isActive: true, patientId: 'demo-patient', connectedAt: addDays(-3, 9).toISOString(), batteryLevel: 86, lastSynced: 'Today, 9:42 AM' },
    { _id: 'demo-watch', deviceId: 'SMARTWATCH-DEMO-01', type: 'smartwatch', isActive: true, patientId: 'demo-patient', connectedAt: addDays(-7, 8).toISOString(), batteryLevel: 64, lastSynced: 'Today, 9:38 AM' }
];

export const MOCK_RECEIVERS = MOCK_DOCTORS.map(doctor => ({ _id: doctor._id, user_id: doctor.user_id, full_name: doctor.full_name }));
export const MOCK_MESSAGES = [
    { id: 'demo-message-1', type: 'received', content: 'Hello Elena. Your care plan is looking great this week.' },
    { id: 'demo-message-2', type: 'sent', content: 'Thank you. I feel good and will see you at my appointment.' },
    { id: 'demo-message-3', type: 'received', content: 'Wonderful. Remember to bring your questions to the ultrasound visit.', timestamp: 'Yesterday' }
];