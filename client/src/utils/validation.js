export const validateEmail = (email) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
};

export const validatePhone = (phone) => {
    const re = /^07[0-9]{8}$/; // Sri Lankan mobile format: 07xxxxxxxx
    return re.test(phone);
};

export const validatePassword = (password) => {
    // Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special char
    // Allows any non-alphanumeric character as the special char
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])[A-Za-z\d\S]{8,}$/;
    return re.test(password);
};

export const validateName = (name) => {
    return name && name.trim().length >= 3;
};

export const getPasswordStrengthMsg = (password) => {
    if (!password) return "";
    if (password.length < 8) return "Must be at least 8 characters.";
    if (!/[A-Z]/.test(password)) return "Must contain an uppercase letter.";
    if (!/[a-z]/.test(password)) return "Must contain a lowercase letter.";
    if (!/\d/.test(password)) return "Must contain a number.";
    if (!/[^a-zA-Z\d]/.test(password)) return "Must contain a special character (e.g. @, !, #, $, %).";
    return "";
};
