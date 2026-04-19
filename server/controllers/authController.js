const { sendOTP } = require('../utils/notification');

const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');



const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    try {
        const [users] = await db.query("SELECT * FROM User WHERE UserID = ?", [userId]);
        if (users.length === 0) return res.status(404).json({ message: "User not found" });
        const user = users[0];

        // Verify Current Password
        let match = false;
        if (user.Password === currentPassword) {
            match = true;
        } else {
            try {
                if (user.Password.startsWith('$')) {
                    match = await bcrypt.compare(currentPassword, user.Password);
                }
            } catch (err) {
                // Ignore bcrypt error (e.g. invalid salt) if not a hash
            }
        }

        if (!match) return res.status(400).json({ message: "Incorrect current password" });

        // Update Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.query("UPDATE User SET Password = ? WHERE UserID = ?", [hashedPassword, userId]);

        res.json({ message: "Password updated successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

// Unified Login Logic
const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Please provide email and password." });
    }

    try {
        // Single Query! 4NF ftw.
        const [users] = await db.query("SELECT * FROM User WHERE Email = ?", [email]);

        if (users.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const user = users[0];

        // Verify Password
        let validPassword = false;

        // 1. Check Plaintext (Migration/Seeded Users)
        if (password === user.Password) {
            validPassword = true;
        } else {
            // 2. Check Bcrypt
            try {
                // Only attempt compare if it looks like a hash (starts with $) to avoid throw
                if (user.Password.startsWith('$')) {
                    const match = await bcrypt.compare(password, user.Password);
                    if (match) validPassword = true;
                }
            } catch (bcryptErr) {
                console.warn("Bcrypt compare warning:", bcryptErr.message);
                // Continue, validPassword remains false
            }
        }

        if (!validPassword) {
            return res.status(401).json({ message: "Invalid Credentials" });
        }

        // Check Verification Status
        if (user.IsVerified === 0) {
            // Fetch phone for fallback if needed, via profile
            let phone = '';
            if (user.Role === 'parent') {
                const [profile] = await db.query("SELECT Phone FROM ParentProfile WHERE UserID = ?", [user.UserID]);
                if (profile.length > 0) phone = profile[0].Phone;
            } else if (user.Role === 'teacher') {
                const [profile] = await db.query("SELECT Phone FROM TeacherProfile WHERE UserID = ?", [user.UserID]);
                if (profile.length > 0) phone = profile[0].Phone;
            }

            return res.status(403).json({
                message: "Account not verified.",
                isVerified: false,
                email: user.Email,
                phone: phone
            });
        }

        // Generate Token
        // NOTE: We don't have separate IsFirstLogin column on User table usually, 
        // but if it's there (optional), check it here. Skipping for simplicity as per schema.

        const token = jwt.sign(
            { id: user.UserID, role: user.Role, email: user.Email, name: user.FullName },
            process.env.JWT_SECRET,
            { expiresIn: '30d', algorithm: 'HS256' }
        );

        res.json({
            token,
            user: {
                id: user.UserID,
                name: user.FullName,
                role: user.Role,
                email: user.Email
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

// Admin Register
const registerAdmin = async (req, res) => {
    const { id, fullName, email, password } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await db.query(
            "INSERT INTO User (UserID, FullName, Email, Password, Role, IsVerified) VALUES (?, ?, ?, ?, 'admin', TRUE)",
            [id, fullName, email, hashedPassword]
        );

        res.status(201).json({ message: "Admin registered successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error registering admin", error: err.message });
    }
}

// Helper to generate 6-digit OTP (1,000,000 possible values vs 9,000 for 4-digit)
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Register Parent
const registerParent = async (req, res) => {
    const { fullName, email, phone, password, verificationMethod } = req.body;

    if (!fullName || !email || !phone || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // Check if email exists
        const [existingEmail] = await conn.query("SELECT * FROM User WHERE Email = ?", [email]);
        if (existingEmail.length > 0) {
            await conn.rollback();
            return res.status(400).json({ message: "Email is already registered" });
        }

        // Check if phone exists (in Profiless)
        const [existingPhone] = await conn.query("SELECT * FROM ParentProfile WHERE Phone = ?", [phone]);
        if (existingPhone.length > 0) {
            await conn.rollback();
            return res.status(400).json({ message: "Phone number is already registered" });
        }

        const userId = 'P' + generateOTP() + generateOTP().substring(0, 2); // Simple ID gen
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 1. Insert User
        await conn.query(
            "INSERT INTO User (UserID, FullName, Email, Password, Role, IsVerified) VALUES (?, ?, ?, ?, 'parent', FALSE)",
            [userId, fullName, email, hashedPassword]
        );

        // 2. Insert Parent Profile
        await conn.query(
            "INSERT INTO ParentProfile (UserID, Phone, SecretPasscode) VALUES (?, ?, 'TEMP_PASS')",
            [userId, phone]
        );

        await conn.commit();

        // 3. Send OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60000);

        // USE USERID
        await db.query(
            "INSERT INTO User_Verification (UserID, Code, Type, ExpiresAt) VALUES (?, ?, 'EMAIL_VERIFY', ?)",
            [userId, otp, expiresAt]
        );

        const method = verificationMethod === 'phone' ? 'sms' : 'email';
        const target = method === 'sms' ? phone : email;

        await sendOTP(target, otp, method);

        res.status(201).json({
            message: `Registration successful. Please verify your ${method}.`,
            email: email,
            phone: phone,
            verificationMethod: method
        });

    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ message: "Error registering parent", error: err.message });
    } finally {
        conn.release();
    }
};

// Verify OTP
const verifyOTP = async (req, res) => {
    const { email: identifier, code, type = 'EMAIL_VERIFY' } = req.body;

    try {
        // Resolve Real Email. Identifier could be phone.
        let userId = null;
        let realEmail = identifier;

        // If it looks like a phone (digits only), find the user by phone in profiles
        const isPhone = /^\d+$/.test(String(identifier).replace('+', ''));

        if (isPhone) {
            // Check ParentProfile
            const [parents] = await db.query("SELECT u.UserID, u.Email FROM User u JOIN ParentProfile p ON u.UserID = p.UserID WHERE p.Phone = ?", [identifier]);
            if (parents.length > 0) {
                userId = parents[0].UserID;
                realEmail = parents[0].Email;
            }
            else {
                // Check TeacherProfile
                const [teachers] = await db.query("SELECT u.UserID, u.Email FROM User u JOIN TeacherProfile p ON u.UserID = p.UserID WHERE p.Phone = ?", [identifier]);
                if (teachers.length > 0) {
                    userId = teachers[0].UserID;
                    realEmail = teachers[0].Email;
                }
            }
        } else {
            const [users] = await db.query("SELECT UserID, Email FROM User WHERE Email = ?", [identifier]);
            if (users.length > 0) userId = users[0].UserID;
        }

        if (!userId) return res.status(400).json({ message: "User not found" });

        const [records] = await db.query(
            "SELECT * FROM User_Verification WHERE UserID = ? AND Code = ? AND Type = ? AND ExpiresAt > NOW()",
            [userId, code, type]
        );

        if (records.length === 0) {
            return res.status(400).json({ message: "Invalid or Expired OTP" });
        }

        if (type === 'EMAIL_VERIFY') {
            await db.query("UPDATE User SET IsVerified = TRUE WHERE UserID = ?", [userId]);
            // Only delete for Email Verify. For Password Reset, keep it for the actual reset step.
            await db.query("DELETE FROM User_Verification WHERE ID = ?", [records[0].ID]);
        }
        // If PASSWORD_RESET, do NOT delete yet. resetPassword will delete it.
        res.json({ message: "Verification Successful." });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Verification failed", error: err.message });
    }
};

// Resend OTP
const resendOTP = async (req, res) => {
    const { email: identifier, verificationMethod } = req.body;
    try {
        const [users] = await db.query("SELECT * FROM User WHERE Email = ?", [identifier]);
        // Also support phone search ideally
        if (users.length === 0) return res.status(404).json({ message: "User not found" });

        const user = users[0];

        // Find Phone if needed
        let phone = '';
        if (user.Role === 'parent') {
            const [p] = await db.query("SELECT Phone FROM ParentProfile WHERE UserID = ?", [user.UserID]);
            if (p.length > 0) phone = p[0].Phone;
        } else if (user.Role === 'teacher') {
            const [t] = await db.query("SELECT Phone FROM TeacherProfile WHERE UserID = ?", [user.UserID]);
            if (t.length > 0) phone = t[0].Phone;
        }

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60000);
        await db.query(
            "INSERT INTO User_Verification (UserID, Code, Type, ExpiresAt) VALUES (?, ?, 'EMAIL_VERIFY', ?)",
            [user.UserID, otp, expiresAt]
        );

        const method = verificationMethod === 'phone' ? 'sms' : 'email';
        const target = method === 'sms' ? phone : user.Email;

        if (method === 'sms' && !phone) return res.status(400).json({ message: "No phone on record" });

        await sendOTP(target, otp, method);
        res.json({ message: `OTP Resent.` });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error resending OTP" });
    }
};

// Forgot Password
const forgotPassword = async (req, res) => {
    const { email: identifier } = req.body;
    try {
        let user;
        let isPhone = /^\d+$/.test(String(identifier).replace('+', ''));

        if (isPhone) {
            // Search via join
            const [rows] = await db.query(`
                SELECT u.* FROM User u 
                LEFT JOIN ParentProfile p ON u.UserID = p.UserID
                LEFT JOIN TeacherProfile t ON u.UserID = t.UserID
                WHERE p.Phone = ? OR t.Phone = ?
             `, [identifier, identifier]);
            if (rows.length > 0) user = rows[0];
        } else {
            const [rows] = await db.query("SELECT * FROM User WHERE Email = ?", [identifier]);
            if (rows.length > 0) user = rows[0];
        }

        if (!user) return res.status(404).json({ message: "User not found" });

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60000);

        await db.query(
            "INSERT INTO User_Verification (UserID, Code, Type, ExpiresAt) VALUES (?, ?, 'PASSWORD_RESET', ?)",
            [user.UserID, otp, expiresAt]
        );

        const method = isPhone ? 'sms' : 'email';
        await sendOTP(identifier, otp, method);

        res.json({ message: `OTP sent to ${method}.` });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error initiating password reset" });
    }
};

const resetPassword = async (req, res) => {
    const { email: identifier, code, newPassword } = req.body; // 'email' key from frontend
    try {
        let userId = null;
        let isPhone = /^\d+$/.test(String(identifier).replace('+', ''));

        if (isPhone) {
            const [rows] = await db.query(`
                SELECT u.UserID FROM User u 
                LEFT JOIN ParentProfile p ON u.UserID = p.UserID
                LEFT JOIN TeacherProfile t ON u.UserID = t.UserID
                WHERE p.Phone = ? OR t.Phone = ?
             `, [identifier, identifier]);
            if (rows.length > 0) userId = rows[0].UserID;
        } else {
            const [rows] = await db.query("SELECT UserID FROM User WHERE Email = ?", [identifier]);
            if (rows.length > 0) userId = rows[0].UserID;
        }

        if (!userId) return res.status(400).json({ message: "User not found" });

        const [records] = await db.query(
            "SELECT * FROM User_Verification WHERE UserID = ? AND Code = ? AND Type = 'PASSWORD_RESET' AND ExpiresAt > NOW()",
            [userId, code]
        );

        if (records.length === 0) return res.status(400).json({ message: "Invalid OTP" });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        await db.query("UPDATE User SET Password = ? WHERE UserID = ?", [hash, userId]);

        await db.query("DELETE FROM User_Verification WHERE ID = ?", [records[0].ID]);
        res.json({ message: "Password reset successful." });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error resetting password" });
    }
};

const verifyPassword = async (req, res) => {
    const { password } = req.body;
    const userId = req.user.id;

    if (!password) return res.status(400).json({ message: "Password is required" });

    try {
        const [users] = await db.query("SELECT * FROM User WHERE UserID = ?", [userId]);
        if (users.length === 0) return res.status(404).json({ message: "User not found" });
        const user = users[0];

        let validPassword = false;

        // 1. Check Plaintext
        if (password === user.Password) {
            validPassword = true;
        } else {
            // 2. Check Bcrypt
            try {
                if (user.Password.startsWith('$')) {
                    const match = await bcrypt.compare(password, user.Password);
                    if (match) validPassword = true;
                }
            } catch (err) { }
        }

        if (validPassword) {
            res.json({ success: true, message: "Password verified" });
        } else {
            res.status(401).json({ success: false, message: "Incorrect password" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = { login, registerAdmin, registerParent, verifyOTP, resendOTP, forgotPassword, resetPassword, changePassword, verifyPassword };


