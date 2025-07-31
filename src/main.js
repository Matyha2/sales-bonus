/**
 * Функция для расчета выручки с учетом скидки
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    const discountAmount = 1 - (discount / 100);
    // Округляем доход по позиции, чтобы избежать накопления ошибок
    const revenue = sale_price * quantity * discountAmount;
    return Math.round(revenue * 100) / 100;
}

/**
 * Функция для расчета бонуса на основе позиции в рейтинге
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    
    let bonus;
    
    if (index === 0) {
        // Первое место - 15%
        bonus = profit * 0.15;
    } else if (index === 1 || index === 2) {
        // Второе и третье место - 10%
        bonus = profit * 0.10;
    } else if (index === total - 1) {
        // Последнее место - 0%
        bonus = 0;
    } else {
        // Все остальные - 5%
        bonus = profit * 0.05;
    }
    // Округляем бонус
    return Math.round(bonus * 100) / 100;
}

/**
 * Главная функция анализа данных продаж
 */
function analyzeSalesData(data, options) {
    
    // 1. Проверка входных данных
    if (!data 
        || !Array.isArray(data.sellers) || data.sellers.length === 0
        || !Array.isArray(data.products) || data.products.length === 0
        || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0) {
        throw new Error('Некорректные входные данные');
    }

    // 2. Проверка функций
    const { calculateRevenue, calculateBonus } = options;
    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Отсутствуют необходимые функции');
    }

    // 3. Создание статистики по продавцам
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // 4. Создание индексов для быстрого поиска
    const sellerIndex = {};
    sellerStats.forEach(seller => {
        sellerIndex[seller.id] = seller;
    });

    const productIndex = {};
    data.products.forEach(product => {
        productIndex[product.sku] = product;
    });

    // 5. Обработка всех покупок с аккуратным промежуточным округлением
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        seller.sales_count += 1;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            const itemRevenue = calculateRevenue(item, product);
            const itemCost = product.purchase_price * item.quantity;
            const itemProfit = itemRevenue - itemCost;

            // Округляем на каждом шаге, чтобы избежать накопления ошибок
            seller.revenue = Math.round((seller.revenue + itemRevenue) * 100) / 100;
            seller.profit = Math.round((seller.profit + itemProfit) * 100) / 100;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // 6. Сортируем продавцов по прибыли (по убыванию)
    sellerStats.sort((a, b) => b.profit - a.profit);

    // 7. Назначаем бонусы и формируем топ товаров
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // 8. Формируем итоговый результат с финальным округлением
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: parseFloat(seller.revenue.toFixed(2)),
        profit: parseFloat(seller.profit.toFixed(2)),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: parseFloat(seller.bonus.toFixed(2))
    }));
}