import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false,
    // Добавляем параметры для повторных попыток подключения
    max: 20, // максимальное количество клиентов в пуле
    idleTimeoutMillis: 30000, // время простоя клиента перед закрытием
    connectionTimeoutMillis: 2000, // время ожидания подключения
});

// Обработка ошибок пула
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
});

// Функция для проверки соединения
export async function testConnection(): Promise<boolean> {
    try {
        const client = await pool.connect();
        client.release();
        return true;
    } catch (error) {
        console.error('Error testing database connection:', error);
        return false;
    }
}

// Проверка подключения при старте
pool.connect()
    .then(client => {
        console.log('Successfully connected to database');
        client.release();
    })
    .catch(err => {
        console.error('Error connecting to database:', err);
    });

export default pool; 