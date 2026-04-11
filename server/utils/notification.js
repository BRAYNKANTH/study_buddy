const nodemailer = require('nodemailer');
const axios = require('axios');

// Configure Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendSMS = async (phone, message) => {
    try {
        const token = process.env.TEXTLK_API_TOKEN;
        const response = await axios.post('https://app.text.lk/api/v3/sms/send', {
            recipient: phone,
            sender_id: process.env.TEXTLK_SENDER_ID || 'Luggo', // Updated to authorized ID
            message: message
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`[SMS - Text.lk] Sent to ${phone}:`, response.data);
        return true;
    } catch (error) {
        console.error(`[SMS Error] Failed to send to ${phone}:`, error.response ? error.response.data : error.message);
        return false;
    }
};

const sendEmail = async (email, subject, body) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: subject,
            text: body,
            // html: body // Optional: if you want to send HTML
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email] Sent to ${email}: ${info.response}`);
        return true;
    } catch (error) {
        console.error(`[Email Error] Failed to send to ${email}:`, error);
        return false;
    }
};

const sendOTP = async (dest, otp, type = 'sms') => {
    const message = `Your Verification Code is: ${otp}`;
    if (type === 'sms') {
        return await sendSMS(dest, message);
    } else {
        return await sendEmail(dest, "Verification Code", message);
    }
};

module.exports = { sendSMS, sendEmail, sendOTP };

