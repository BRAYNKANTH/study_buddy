
CREATE TABLE IF NOT EXISTS User (
    UserID VARCHAR(50) PRIMARY KEY,
    FullName VARCHAR(100) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Password VARCHAR(100) NOT NULL,
    Role ENUM('admin', 'teacher', 'parent') NOT NULL,
    IsVerified BOOLEAN DEFAULT FALSE,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Profiles (1:1 with User)
CREATE TABLE IF NOT EXISTS TeacherProfile (
    UserID VARCHAR(50) PRIMARY KEY,
    Phone VARCHAR(15) NOT NULL,
    FOREIGN KEY (UserID) REFERENCES User(UserID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ParentProfile (
    UserID VARCHAR(50) PRIMARY KEY,
    Phone VARCHAR(15) UNIQUE NOT NULL, -- Phone unique for parents usually
    SecretPasscode VARCHAR(50) NOT NULL,
    FOREIGN KEY (UserID) REFERENCES User(UserID) ON DELETE CASCADE
);

-- 3. Subject Table
CREATE TABLE IF NOT EXISTS Subject (
    SubjectID VARCHAR(50) PRIMARY KEY,
    SubjectName VARCHAR(50) NOT NULL,
    Medium VARCHAR(20) DEFAULT 'Tamil',
    Fee DECIMAL(10,2) DEFAULT 350.00,
    Grades VARCHAR(255)
);

-- 3.1 SubjectGrade (New: Normalization for Course-Grade specific IDs)
CREATE TABLE IF NOT EXISTS SubjectGrade (
    SubjectGradeID INT AUTO_INCREMENT PRIMARY KEY,
    SubjectID VARCHAR(50) NOT NULL,
    Grade INT NOT NULL,
    UNIQUE(SubjectID, Grade),
    FOREIGN KEY (SubjectID) REFERENCES Subject(SubjectID) ON DELETE CASCADE
);

-- 4. Teacher_Subject (Many-to-Many)
CREATE TABLE IF NOT EXISTS TeacherSubject (
    TeacherID VARCHAR(50),
    SubjectID VARCHAR(50),
    PRIMARY KEY (TeacherID, SubjectID),
    FOREIGN KEY (TeacherID) REFERENCES User(UserID) ON DELETE CASCADE,
    FOREIGN KEY (SubjectID) REFERENCES Subject(SubjectID) ON DELETE CASCADE
);

-- 4.1 Teacher_Grade (New: Many-to-Many)
CREATE TABLE IF NOT EXISTS TeacherGrade (
    TeacherID VARCHAR(50),
    Grade INT,
    PRIMARY KEY (TeacherID, Grade),
    FOREIGN KEY (TeacherID) REFERENCES User(UserID) ON DELETE CASCADE
);

-- 5. Student Table (Dependent of Parent)
CREATE TABLE IF NOT EXISTS Student (
    StudentID VARCHAR(50) PRIMARY KEY,
    ParentID VARCHAR(50) NOT NULL,
    StudentName VARCHAR(100) NOT NULL,
    Grade INT NOT NULL,
    QRCode VARCHAR(255) NOT NULL UNIQUE,
    IsApproved BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (ParentID) REFERENCES User(UserID)
);

-- 6. Enrollment Table
CREATE TABLE IF NOT EXISTS Enrollment (
    EnrollmentID VARCHAR(50) PRIMARY KEY,
    StudentID VARCHAR(50) NOT NULL,
    SubjectGradeID INT NOT NULL,
    EnrolledDate DATE NOT NULL,
    FOREIGN KEY (StudentID) REFERENCES Student(StudentID),
    FOREIGN KEY (SubjectGradeID) REFERENCES SubjectGrade(SubjectGradeID)
);

-- 7. Payment Table
CREATE TABLE IF NOT EXISTS Payment (
    PaymentID VARCHAR(50) PRIMARY KEY,
    StudentID VARCHAR(50) NOT NULL,
    AdminID VARCHAR(50), -- UserID of Admin
    Month VARCHAR(20) NOT NULL,
    ReferenceNo VARCHAR(50) NOT NULL,
    Amount DECIMAL(10,2) NOT NULL,
    ReceiptFile VARCHAR(255),
    PaymentDate DATE NOT NULL,
    Status VARCHAR(20) DEFAULT 'Pending',
    FOREIGN KEY (StudentID) REFERENCES Student(StudentID),
    FOREIGN KEY (AdminID) REFERENCES User(UserID)
);

-- 8. Session Table
CREATE TABLE IF NOT EXISTS Session (
    SessionID VARCHAR(50) PRIMARY KEY,
    TeacherID VARCHAR(50) NOT NULL, -- UserID of Teacher
    SubjectGradeID INT NOT NULL,
    Date DATE NOT NULL,
    StartTime TIME NOT NULL,
    EndTime TIME NOT NULL,
    FOREIGN KEY (TeacherID) REFERENCES User(UserID),
    FOREIGN KEY (SubjectGradeID) REFERENCES SubjectGrade(SubjectGradeID)
);

-- 9. Attendance Table
CREATE TABLE IF NOT EXISTS Attendance (
    AttendanceID VARCHAR(50) PRIMARY KEY,
    SessionID VARCHAR(50) NOT NULL,
    StudentID VARCHAR(50) NOT NULL,
    Status VARCHAR(50) NOT NULL, -- Present, Absent
    ScannedAt DATETIME,
    FOREIGN KEY (SessionID) REFERENCES Session(SessionID),
    FOREIGN KEY (StudentID) REFERENCES Student(StudentID)
);

-- 10. Exam Table
CREATE TABLE IF NOT EXISTS Exam (
    ExamID VARCHAR(50) PRIMARY KEY,
    ExamName VARCHAR(100) NOT NULL,
    Term VARCHAR(50),
    SubjectGradeID INT NOT NULL,
    Date DATE NOT NULL,
    FOREIGN KEY (SubjectGradeID) REFERENCES SubjectGrade(SubjectGradeID)
);

-- 11. Marks Table
CREATE TABLE IF NOT EXISTS Marks (
    MarkID VARCHAR(50) PRIMARY KEY,
    ExamID VARCHAR(50) NOT NULL,
    StudentID VARCHAR(50) NOT NULL,
    Marks INT NOT NULL,
    Remarks VARCHAR(255),
    UploadDate DATE NOT NULL,
    UNIQUE KEY uq_exam_student (ExamID, StudentID),
    FOREIGN KEY (ExamID) REFERENCES Exam(ExamID),
    FOREIGN KEY (StudentID) REFERENCES Student(StudentID)
);

-- 12. Report Table
CREATE TABLE IF NOT EXISTS Report (
    ReportID VARCHAR(50) PRIMARY KEY,
    StudentID VARCHAR(50) NOT NULL,
    ExamID VARCHAR(50) NOT NULL,
    PerformanceSummary VARCHAR(255),
    GeneratedDate DATE NOT NULL,
    FOREIGN KEY (StudentID) REFERENCES Student(StudentID),
    FOREIGN KEY (ExamID) REFERENCES Exam(ExamID)
);

-- 13. StudyMaterial Table
CREATE TABLE IF NOT EXISTS StudyMaterial (
    MaterialID VARCHAR(50) PRIMARY KEY,
    TeacherID VARCHAR(50) NOT NULL,
    SubjectGradeID INT NOT NULL,
    Title VARCHAR(100) NOT NULL,
    Description VARCHAR(255),
    FileName VARCHAR(255) NOT NULL,
    FileType VARCHAR(50) NOT NULL,
    UploadDate DATE NOT NULL,
    FOREIGN KEY (TeacherID) REFERENCES User(UserID),
    FOREIGN KEY (SubjectGradeID) REFERENCES SubjectGrade(SubjectGradeID)
);

-- 14. Chat Table (Now simpler!)
CREATE TABLE IF NOT EXISTS Chat (
    ChatID VARCHAR(50) PRIMARY KEY,
    SenderID VARCHAR(50) NOT NULL,
    ReceiverID VARCHAR(50) NOT NULL,
    Message VARCHAR(255) NOT NULL,
    Timestamp DATETIME NOT NULL,
    IsRead BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (SenderID) REFERENCES User(UserID) ON DELETE CASCADE,
    FOREIGN KEY (ReceiverID) REFERENCES User(UserID) ON DELETE CASCADE
);

-- 15. Announcement Table
CREATE TABLE IF NOT EXISTS Announcement (
    AnnouncementID INT AUTO_INCREMENT PRIMARY KEY,
    AdminID VARCHAR(50),
    Title VARCHAR(100) NOT NULL,
    Content TEXT,
    TargetAudience VARCHAR(50) DEFAULT 'All',
    Grade VARCHAR(50) DEFAULT 'All',
    Date DATE NOT NULL,
    FOREIGN KEY (AdminID) REFERENCES User(UserID)
);

-- 16. Timetable Table
CREATE TABLE IF NOT EXISTS Timetable (
    TimetableID VARCHAR(50) PRIMARY KEY,
    TeacherID VARCHAR(50) NOT NULL,
    SubjectGradeID INT NOT NULL,
    DayOfWeek VARCHAR(20) NOT NULL,
    StartTime TIME NOT NULL,
    EndTime TIME NOT NULL,
    FOREIGN KEY (TeacherID) REFERENCES User(UserID),
    FOREIGN KEY (SubjectGradeID) REFERENCES SubjectGrade(SubjectGradeID)
);

-- 17. UserVerification Table
CREATE TABLE IF NOT EXISTS User_Verification (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    UserID VARCHAR(50) NOT NULL,
    Code VARCHAR(50) NOT NULL,
    Type VARCHAR(20) NOT NULL,
    ExpiresAt DATETIME NOT NULL,
    INDEX (Code),
    FOREIGN KEY (UserID) REFERENCES User(UserID) ON DELETE CASCADE
);

-- 18. Notification Table
CREATE TABLE IF NOT EXISTS Notification (
    NotificationID INT AUTO_INCREMENT PRIMARY KEY,
    UserID VARCHAR(50) NOT NULL,
    Title VARCHAR(100) NOT NULL,
    Message TEXT,
    IsRead BOOLEAN DEFAULT FALSE,
    Type VARCHAR(20) DEFAULT 'SYSTEM',
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES User(UserID) ON DELETE CASCADE
);
