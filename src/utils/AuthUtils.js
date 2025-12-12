// Simulate OTP storage in localStorage (mock database)
const OTP_STORAGE_KEY = 'pmis_mock_otps';

export const generateMockOtp = async (email) => {
    // Generate random 6-digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry

    // Store in mock DB
    const otps = getStoredOtps();
    otps[email] = { code: otp, expiresAt };
    saveStoredOtps(otps);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Log to console (Simulation)
    console.group('🔐 Mock Email Service');
    console.log(`To: ${email}`);
    console.log(`Subject: Your Login OTP`);
    console.log(`Body: Your verification code is: %c${otp}`, 'font-weight: bold; font-size: 1.2em; color: #4ade80');
    console.groupEnd();

    return { success: true, message: 'OTP sent to console' };
};

export const verifyMockOtp = async (email, code) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));

    const otps = getStoredOtps();
    const record = otps[email];

    if (!record) {
        return { success: false, message: 'No OTP requested for this email' };
    }

    if (Date.now() > record.expiresAt) {
        return { success: false, message: 'OTP has expired' };
    }

    if (record.code !== code) {
        return { success: false, message: 'Invalid OTP code' };
    }

    // Success - consume OTP
    delete otps[email];
    saveStoredOtps(otps);

    return { success: true };
};

// Helper to access localStorage
const getStoredOtps = () => {
    try {
        const stored = localStorage.getItem(OTP_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        return {};
    }
};

const saveStoredOtps = (otps) => {
    localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(otps));
};
