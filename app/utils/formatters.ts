export function formatTVL(value: number | string): string {
    // Преобразуем входное значение в число
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    // Проверяем на NaN и невалидные значения
    if (isNaN(numValue) || typeof numValue !== 'number') {
        return '$0';
    }

    // Для значений меньше 1, форматируем с 3 знаками после запятой
    if (numValue < 1) {
        return `$${numValue.toFixed(3)}`;
    }

    // Для значений больше или равных 1, округляем до целого
    const formattedValue = Math.round(numValue);
    
    // Форматируем с пробелами в качестве разделителей тысяч
    return `$${formattedValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
}

export function shortenAddress(address: string, startLength: number = 6, endLength: number = 4): string {
    if (!address) return '';
    if (address.length <= startLength + endLength) return address;
    
    return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
} 