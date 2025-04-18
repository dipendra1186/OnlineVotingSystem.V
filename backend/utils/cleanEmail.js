function cleanEmail(email) {
    return email.split(/[,\s]/)[0].trim(); // Keep only the first part
}

module.exports = { cleanEmail };
