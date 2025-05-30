import CryptoJS from 'crypto-js';

export function getOkxHeaders(method: string, path: string, body: string = '') {
    const timestamp = new Date().toISOString();
    const message = timestamp + method + path + body;
    
    // Получаем учетные данные
    const apiKey = process.env.OKX_API_KEY;
    const secretKey = process.env.OKX_SECRET_KEY;
    const passphrase = process.env.OKX_PASSPHRASE;

    if (!apiKey || !secretKey || !passphrase) {
        throw new Error('Missing required OKX API credentials');
    }

    // Генерируем подпись как в PHP примере
    const sign = CryptoJS.enc.Base64.stringify(
        CryptoJS.HmacSHA256(message, secretKey)
    );

    return {
        'OK-ACCESS-KEY': apiKey,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': passphrase,
        'OK-ACCESS-SIGN': sign,
        'Content-Type': 'application/json'
    };
} 