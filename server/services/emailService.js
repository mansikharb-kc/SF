const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    // User needs to provide these in .env
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendAdminOtp = async (userEmail, otp) => {
    const adminEmail = process.env.PRIMARY_ADMIN_EMAIL || 'mansikharb.kc@gmail.com';

    // If no credentials, log to console for testing
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log(`\n-----------------------------------------`);
        console.log(`📧 MOCK EMAIL SENT TO ADMIN: ${adminEmail}`);
        console.log(`👤 REQUESTING USER: ${userEmail}`);
        console.log(`🔑 OTP CODE: ${otp}`);
        console.log(`-----------------------------------------\n`);
        return { mock: true };
    }

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: adminEmail,
        subject: 'New Access Request – OTP',
        html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px;">
                <h2 style="color: #4f46e5;">New Access Request</h2>
                <p>Hello Admin,</p>
                <p>A new user is requesting access to SyncFlow.</p>
                <p><strong>User Email:</strong> ${userEmail}</p>
                <p><strong>Verification OTP (from Admin):</strong></p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1f2937; margin: 20px 0;">
                    ${otp}
                </div>
                <p style="color: #6b7280; font-size: 14px;">This OTP expires in 10 minutes. Please share this code with the user if you wish to allow them to create a pending account.</p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`❌ SMTP Error: ${error.message}`);
        throw error;
    }
};

module.exports = { sendAdminOtp };
