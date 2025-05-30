import { updateProducts } from './products';

// Функция для запуска обновления продуктов
export async function startProductsUpdate(intervalMinutes: number = 5) {
    // Первоначальное обновление
    await updateProducts();

    // Установка интервала для периодического обновления
    setInterval(async () => {
        await updateProducts();
    }, intervalMinutes * 60 * 1000);
}

// Экспорт всех подмодулей
export * from './products'; 