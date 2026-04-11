-- Full System Seed Data (Master Timetable)
-- 1. Clear old data
DELETE FROM Announcement;
DELETE FROM Chat;
DELETE FROM StudyMaterial;
DELETE FROM Report;
DELETE FROM Marks;
DELETE FROM Exam;
DELETE FROM Attendance;
DELETE FROM Session;
DELETE FROM Payment;
DELETE FROM Enrollment;
DELETE FROM Student;
DELETE FROM TeacherSubject;
DELETE FROM Teacher;
DELETE FROM Subject;
DELETE FROM Parent;
DELETE FROM Admin;

-- 2. Admin
INSERT INTO Admin (AdminID, FullName, Email, Password) VALUES 
('A001', 'Super Admin', 'admin@tuition.com', 'admin123');

-- 3. Subjects (Including Mediums for Math/Sci)
INSERT INTO Subject (SubjectID, SubjectName) VALUES 
('SUB_MT', 'Mathematics (Tamil Medium)'),
('SUB_ME', 'Mathematics (English Medium)'),
('SUB_ST', 'Science (Tamil Medium)'),
('SUB_SE', 'Science (English Medium)'),
('SUB_HIS', 'History'),
('SUB_ENG', 'English'),
('SUB_TAM', 'Tamil');

-- 4. Teachers (T1-T7 as per request)
INSERT INTO Teacher (TeacherID, TeacherName, Email, Password, Phone, Grade) VALUES 
-- T1: Math (Tamil)
('T001', 'Mr. Maths(T)', 'math_tm@tuition.com', 'teach123', '0770000001', 6),
-- T2: Math (English)
('T002', 'Mr. Maths(E)', 'math_em@tuition.com', 'teach123', '0770000002', 6),
-- T3: Science (Tamil)
('T003', 'Ms. Science(T)', 'sci_tm@tuition.com', 'teach123', '0770000003', 6),
-- T4: Science (English)
('T004', 'Ms. Science(E)', 'sci_em@tuition.com', 'teach123', '0770000004', 6),
-- T5: History
('T005', 'Mr. History', 'history@tuition.com', 'teach123', '0770000005', 6),
-- T6: English
('T006', 'Ms. English', 'english@tuition.com', 'teach123', '0770000006', 6),
-- T7: Tamil
('T007', 'Mr. Tamil', 'tamil@tuition.com', 'teach123', '0770000007', 6);

-- 5. TeacherSubjects
INSERT INTO TeacherSubject (TeacherID, SubjectID) VALUES 
('T001', 'SUB_MT'),
('T002', 'SUB_ME'),
('T003', 'SUB_ST'),
('T004', 'SUB_SE'),
('T005', 'SUB_HIS'),
('T006', 'SUB_ENG'),
('T007', 'SUB_TAM');

-- 6. Parents
INSERT INTO Parent (ParentID, FullName, Email, Phone, Password, SecretPasscode) VALUES 
('P001', 'Parent One', 'parent1@test.com', '0710000001', 'parent123', 'PASS01'),
('P002', 'Parent Two', 'parent2@test.com', '0710000002', 'parent123', 'PASS02');

-- 7. Students (Covering all grades and mediums)
INSERT INTO Student (StudentID, ParentID, StudentName, Grade, QRCode, IsApproved) VALUES 
-- Grade 6 Students
('S601', 'P001', 'Gr6 Student (Tamil)', 6, 'STU_601', TRUE), 
('S602', 'P001', 'Gr6 Student (English)', 6, 'STU_602', TRUE),
-- Grade 7 Students
('S701', 'P002', 'Gr7 Student (Tamil)', 7, 'STU_701', TRUE),
('S702', 'P002', 'Gr7 Student (English)', 7, 'STU_702', TRUE),
-- Grade 8 Students
('S801', 'P001', 'Gr8 Student', 8, 'STU_801', TRUE),
-- Grade 9 Students
('S901', 'P002', 'Gr9 Student', 9, 'STU_901', TRUE);

-- 8. Enrollments (Simplified generic enrollments + specific medium ones)
INSERT INTO Enrollment (EnrollmentID, StudentID, SubjectID, EnrolledDate) VALUES 
-- S601 (Gr 6 Tamil) -> Math(T), Sci(T), Hist, Eng, Tam
('E001', 'S601', 'SUB_MT', '2025-01-01'),
('E002', 'S601', 'SUB_ST', '2025-01-01'),
('E003', 'S601', 'SUB_HIS', '2025-01-01'),
('E004', 'S601', 'SUB_ENG', '2025-01-01'),
('E005', 'S601', 'SUB_TAM', '2025-01-01'),

-- S602 (Gr 6 English) -> Math(E), Sci(E), Hist, Eng, Tam
('E006', 'S602', 'SUB_ME', '2025-01-01'),
('E007', 'S602', 'SUB_SE', '2025-01-01'),
('E008', 'S602', 'SUB_HIS', '2025-01-01'),
('E009', 'S602', 'SUB_ENG', '2025-01-01'),
('E010', 'S602', 'SUB_TAM', '2025-01-01'),

-- Gr 7, 8, 9 Examples (Reduced for brevity, but enough to view timetable)
('E020', 'S701', 'SUB_MT', '2025-01-01'),
('E021', 'S701', 'SUB_ST', '2025-01-01'),
('E022', 'S701', 'SUB_ENG', '2025-01-01'),
('E030', 'S801', 'SUB_HIS', '2025-01-01'),
('E040', 'S901', 'SUB_TAM', '2025-01-01');


-- 9. SESSIONS (The Master Timetable)
-- Times: 3:00pm - 6:00pm (15:00:00 - 18:00:00)
-- Week: Jan 12 (Mon) to Jan 16 (Fri), 2026

INSERT INTO Session (SessionID, TeacherID, SubjectID, Grade, Date, StartTime, EndTime) VALUES 

-- === TEACHER 1: MATHS (TM) ===
-- Mon Gr 6
('S_T1_M', 'T001', 'SUB_MT', 6, '2026-01-12', '15:00:00', '18:00:00'),
-- Tue Gr 7
('S_T1_T', 'T001', 'SUB_MT', 7, '2026-01-13', '15:00:00', '18:00:00'),
-- Wed Gr 8
('S_T1_W', 'T001', 'SUB_MT', 8, '2026-01-14', '15:00:00', '18:00:00'),
-- Thu Gr 9
('S_T1_TH', 'T001', 'SUB_MT', 9, '2026-01-15', '15:00:00', '18:00:00'),

-- === TEACHER 2: MATHS (EM) ===
-- Mon Gr 6
('S_T2_M', 'T002', 'SUB_ME', 6, '2026-01-12', '15:00:00', '18:00:00'),
-- Tue Gr 7
('S_T2_T', 'T002', 'SUB_ME', 7, '2026-01-13', '15:00:00', '18:00:00'),
-- Wed Gr 8
('S_T2_W', 'T002', 'SUB_ME', 8, '2026-01-14', '15:00:00', '18:00:00'),
-- Thu Gr 9
('S_T2_TH', 'T002', 'SUB_ME', 9, '2026-01-15', '15:00:00', '18:00:00'),

-- === TEACHER 3: SCIENCE (TM) ===
-- Mon Gr 7
('S_T3_M', 'T003', 'SUB_ST', 7, '2026-01-12', '15:00:00', '18:00:00'),
-- Tue Gr 8
('S_T3_T', 'T003', 'SUB_ST', 8, '2026-01-13', '15:00:00', '18:00:00'),
-- Wed Gr 9
('S_T3_W', 'T003', 'SUB_ST', 9, '2026-01-14', '15:00:00', '18:00:00'),
-- Fri Gr 6
('S_T3_F', 'T003', 'SUB_ST', 6, '2026-01-16', '15:00:00', '18:00:00'),

-- === TEACHER 4: SCIENCE (EM) ===
-- Mon Gr 7
('S_T4_M', 'T004', 'SUB_SE', 7, '2026-01-12', '15:00:00', '18:00:00'),
-- Tue Gr 8
('S_T4_T', 'T004', 'SUB_SE', 8, '2026-01-13', '15:00:00', '18:00:00'),
-- Wed Gr 9
('S_T4_W', 'T004', 'SUB_SE', 9, '2026-01-14', '15:00:00', '18:00:00'),
-- Fri Gr 6
('S_T4_F', 'T004', 'SUB_SE', 6, '2026-01-16', '15:00:00', '18:00:00'),

-- === TEACHER 5: HISTORY ===
-- Mon Gr 8
('S_T5_M', 'T005', 'SUB_HIS', 8, '2026-01-12', '15:00:00', '18:00:00'),
-- Tue Gr 9
('S_T5_T', 'T005', 'SUB_HIS', 9, '2026-01-13', '15:00:00', '18:00:00'),
-- Thu Gr 6
('S_T5_TH', 'T005', 'SUB_HIS', 6, '2026-01-15', '15:00:00', '18:00:00'),
-- Fri Gr 7
('S_T5_F', 'T005', 'SUB_HIS', 7, '2026-01-16', '15:00:00', '18:00:00'),

-- === TEACHER 6: ENGLISH ===
-- Mon Gr 9
('S_T6_M', 'T006', 'SUB_ENG', 9, '2026-01-12', '15:00:00', '18:00:00'),
-- Wed Gr 6
('S_T6_W', 'T006', 'SUB_ENG', 6, '2026-01-14', '15:00:00', '18:00:00'),
-- Thu Gr 7
('S_T6_TH', 'T006', 'SUB_ENG', 7, '2026-01-15', '15:00:00', '18:00:00'),
-- Fri Gr 8
('S_T6_F', 'T006', 'SUB_ENG', 8, '2026-01-16', '15:00:00', '18:00:00'),

-- === TEACHER 7: TAMIL ===
-- Tue Gr 6
('S_T7_T', 'T007', 'SUB_TAM', 6, '2026-01-13', '15:00:00', '18:00:00'),
-- Wed Gr 7
('S_T7_W', 'T007', 'SUB_TAM', 7, '2026-01-14', '15:00:00', '18:00:00'),
-- Thu Gr 8
('S_T7_TH', 'T007', 'SUB_TAM', 8, '2026-01-15', '15:00:00', '18:00:00'),
-- Fri Gr 9
('S_T7_F', 'T007', 'SUB_TAM', 9, '2026-01-16', '15:00:00', '18:00:00');

-- 10. Study Materials
INSERT INTO StudyMaterial (MaterialID, TeacherID, SubjectID, Grade, Title, Description, FileName, FileType, UploadDate) VALUES 
('M001', 'T001', 'SUB_MT', 6, 'Algebra Basics (TM)', 'Intro Tamil', 'alg_tm.pdf', 'PDF', '2025-10-01'),
('M002', 'T002', 'SUB_ME', 6, 'Algebra Basics (EM)', 'Intro English', 'alg_em.pdf', 'PDF', '2025-10-02');
