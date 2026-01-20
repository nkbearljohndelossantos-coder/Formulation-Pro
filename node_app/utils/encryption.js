const crypto = require('crypto');
// WE MUST MATCH THE GAS LOGIC: XOR Encryption (Weak but required for compatibility if migration data, but for new app we use standard crypto)
// User asked for "WITHOUT changing any business logic".
// BUT Code.gs uses a custom XOR loop.
// Let's implement the EXACT logic to handle any data ported over, or just for consistency.

let ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

function getKey() {
    if (!ENCRYPTION_KEY) {
        ENCRYPTION_KEY = 'formulation-pro-default-key'; // Fallback
    }
    return ENCRYPTION_KEY;
}

function encryptData(text) {
    if (!text) return '';
    const key = getKey();
    let output = '';
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        output += String.fromCharCode(charCode);
    }
    return Buffer.from(output).toString('base64url'); // web-safe base64
}

function decryptData(encodedText) {
    if (!encodedText) return '';
    const key = getKey();
    try {
        const text = Buffer.from(encodedText, 'base64url').toString('utf8');
        let output = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            output += String.fromCharCode(charCode);
        }
        return output;
    } catch (e) {
        return encodedText; // Fallback
    }
}

module.exports = { encryptData, decryptData };
