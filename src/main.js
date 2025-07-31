/**
 * Главная функция анализа данных продаж
 * @param data - объект с данными
 * @param options - объект с функциями расчетов
 * @returns {Array} - массив с результатами
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data) {
        throw new Error('Отсутствуют входные данные');
    }
    
    if (!Array.isArray(data.sellers) || data.sellers.length === 0) {
        throw new Error('Некорректные данные продавцов: массив sellers пуст или отсутствует');
    }
    
    if (!Array.isArray(data.products) || data.products.length === 0) {
        throw new Error('Некорректные данные товаров: массив products пуст или отсутствует');
    }
    
    if (!Array.isArray(data.purchase_records) || data.purchase_records.length === 0) {
        throw new Error('Некорректные данные покупок: массив purchase_records пуст или отсутствует');
    }

    // Проверка функций расчета
    if (!options || typeof options.calculateRevenue !== 'function' || typeof options.calculateBonus !== 'function') {
        throw new Error('Не переданы необходимые функции для расчетов');
    }

    const { calculateRevenue, calculateBonus } = options;

    // Подготовка данных продавцов
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // Создание индексов для быстрого доступа
    const sellerIndex = {};
    sellerStats.forEach(seller => {
        sellerIndex[seller.id] = seller;
    });

    const productIndex = {};
    data.products.forEach(product => {
        productIndex[product.sku] = product;
    });

    // Обработка записей о покупках
    for (const record of data.purchase_records) {
        const seller = sellerIndex[record.seller_id];
        if (!seller) continue;
        
        seller.sales_count += 1;
        
        for (const item of record.items) {
            const product = productIndex[item.sku];
            if (!product) continue;
            
            // Расчет показателей с точным округлением на каждом шаге
            const itemRevenue = calculateRevenue(item, product);
            const itemCost = Math.round(product.purchase_price * item.quantity * 100) / 100;
            const itemProfit = Math.round((itemRevenue - itemCost) * 100) / 100;
            
            // Обновление статистики с точным округлением
            seller.revenue = Math.round((seller.revenue + itemRevenue) * 100) / 100;
            seller.profit = Math.round((seller.profit + itemProfit) * 100) / 100;
            
            // Учет проданных товаров
            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        }
    }

    // Сортировка по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Расчет бонусов и топ-продуктов
    for (let i = 0; i < sellerStats.length; i++) {
        const seller = sellerStats[i];
        seller.bonus = calculateBonus(i, sellerStats.length, seller);
        
        // Формирование топ-продуктов с правильной сортировкой
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => {
                // Сначала сортируем по количеству (по убыванию)
                if (b.quantity !== a.quantity) {
                    return b.quantity - a.quantity;
                }
                // При одинаковом количестве сортируем по SKU (по возрастанию)
                return a.sku.localeCompare(b.sku);
            })
            .slice(0, 10);
    }

    // Формирование результата
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: seller.revenue,
        profit: seller.profit,
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: seller.bonus
    }));
}