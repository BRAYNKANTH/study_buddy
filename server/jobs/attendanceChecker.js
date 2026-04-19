const cron = require('node-cron');
const db = require('../config/db');
const { createNotification } = require('../controllers/notificationController');
const { sendSMS } = require('../utils/notification');

// Sri Lanka is UTC+5:30
const SL_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

const toSLTime = (d) => new Date(d.getTime() + SL_OFFSET_MS);

// Format a SL-offset Date as HH:MM:SS for DB TIME comparison
const fmtTime = (d) => {
    const h = String(d.getUTCHours()).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    const s = String(d.getUTCSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
};

// Format HH:MM:SS → "6:00 PM" style for SMS/notification
const fmtDisplay = (timeStr) => {
    const [hStr, mStr] = timeStr.toString().slice(0, 5).split(':');
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${mStr} ${ampm}`;
};

const checkAbsentStudents = async () => {
    const nowSL = toSLTime(new Date());
    const todaySL = nowSL.toISOString().split('T')[0]; // YYYY-MM-DD in SL

    // Window: sessions whose StartTime falls between 10 and 11 minutes ago in SL time
    // Cron fires every minute → each session is caught exactly once in this 1-min window
    const t4Ago = new Date(nowSL.getTime() - 11 * 60 * 1000);
    const t3Ago = new Date(nowSL.getTime() - 10 * 60 * 1000);

    try {
        const [sessions] = await db.query(
            `SELECT s.SessionID, s.SubjectGradeID, sg.Grade, sub.SubjectName,
                    s.StartTime, s.EndTime
             FROM Session s
             JOIN SubjectGrade sg ON sg.SubjectGradeID = s.SubjectGradeID
             JOIN Subject sub ON sub.SubjectID = sg.SubjectID
             WHERE s.Date = ?
               AND s.StartTime != '00:00:00'
               AND s.StartTime BETWEEN ? AND ?`,
            [todaySL, fmtTime(t4Ago), fmtTime(t3Ago)]
        );

        for (const session of sessions) {
            // Students enrolled in this subject-grade but not yet scanned
            const [absentStudents] = await db.query(
                `SELECT st.StudentID, st.StudentName, st.ParentID, pp.Phone
                 FROM Enrollment e
                 JOIN Student st ON st.StudentID = e.StudentID
                 LEFT JOIN ParentProfile pp ON pp.UserID = st.ParentID
                 WHERE e.SubjectGradeID = ?
                   AND st.StudentID NOT IN (
                       SELECT StudentID FROM Attendance WHERE SessionID = ?
                   )`,
                [session.SubjectGradeID, session.SessionID]
            );

            if (absentStudents.length === 0) continue;

            const startDisplay = fmtDisplay(session.StartTime);
            const endDisplay = fmtDisplay(session.EndTime);

            for (const student of absentStudents) {
                const msg =
                    `Your child ${student.StudentName} (Grade ${student.Grade}) has not checked in ` +
                    `for the ${session.SubjectName} session (${startDisplay} – ${endDisplay}). ` +
                    `Please follow up with the teacher.`;

                await createNotification(
                    student.ParentID,
                    'Attendance Alert',
                    msg,
                    'ATTENDANCE'
                );

                if (student.Phone) {
                    await sendSMS(student.Phone, `StudyBuddy Alert: ${msg}`);
                }
            }

            console.log(
                `[AttendanceChecker] Session ${session.SessionID} (${session.SubjectName} G${session.Grade} ` +
                `${startDisplay}–${endDisplay}): notified parents of ${absentStudents.length} absent student(s).`
            );
        }
    } catch (err) {
        console.error('[AttendanceChecker] Error:', err.message);
    }
};

const startAttendanceChecker = () => {
    cron.schedule('* * * * *', checkAbsentStudents);
    console.log('[AttendanceChecker] Started — checks every minute for sessions that began 3 min ago.');
};

module.exports = { startAttendanceChecker };
