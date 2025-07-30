/**
 * Функция для расчета выручки
 * @param purchase запись о покупке (item)
 * @param _product карточка товара (не используется в расчёте)
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const discountFactor = 1 - purchase.discount / 100;
    return +(purchase.sale_price * purchase.quantity * discountFactor).toFixed(2);
}

/**
 * Функция для расчета бонусов
 * Методика:
 * - 15% от прибыли у первого места
 * - 10% у второго и третьего
 * - 0% у последнего
 * - 5% у всех остальных
 * @param index - позиция в рейтинге (0 - первая)
 * @param total - общее число продавцов
 * @param seller - объект с данными продавца (с полем profit)
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) {
        return +(seller.profit * 0.15).toFixed(2);
    } else if (index === 1 || index === 2) {
        return +(seller.profit * 0.10).toFixed(2);
    } else if (index === total - 1) {
        return 0;
    } else {
        return +(seller.profit * 0.05).toFixed(2);
    }
}

/**
 * Главная функция анализа данных продаж
 * @param data - объект с данными (продавцы, продукты, чеки)
 * @param options - объект с функциями calculateRevenue и calculateBonus
 * @returns {Array} - массив с результатами для каждого продавца
 */
function analyzeSalesData(data, options) {
    if (
        !data ||
        !Array.isArray(data.sellers) ||
        !Array.isArray(data.products) ||
        !Array.isArray(data.purchase_records)
    ) {
        throw new Error('Некорректные входные данные');
    }

    if (
        !options ||
        typeof options.calculateRevenue !== 'function' ||
        typeof options.calculateBonus !== 'function'
    ) {
        throw new Error('Недостаточно параметров для расчётов');
    }

    const { calculateRevenue, calculateBonus } = options;

    // Создаём промежуточную структуру для сбора статистики по продавцам
    const sellerStats = data.sellers.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // Индексы для быстрого доступа
    const sellerIndex = Object.fromEntries(sellerStats.map(seller => [seller.seller_id, seller]));
    const productIndex = Object.fromEntries(data.products.map(product => [product.sku, product]));

    // Основной цикл по продажам (чекам)
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return; // Продавец не найден - пропускаем

        seller.sales_count += 1;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return; // Товар не найден - пропускаем

            const revenue = calculateRevenue(item, product);
            const cost = +(product.purchase_price * item.quantity).toFixed(2);
            const profit = +(revenue - cost).toFixed(2);

            seller.revenue += revenue;
            seller.profit += profit;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // Сортируем продавцов по убыванию прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Назначаем бонусы и формируем топ-10 товаров
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);

        // Формируем топ-10 продаваемых товаров
        const topProductsArray = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        seller.top_products = topProductsArray;
    });

    // Формируем итоговый массив для возвращения
    return sellerStats.map(seller => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}

/* Экспорт функций для тестов и использования */
export { calculateSimpleRevenue, calculateBonusByProfit, analyzeSalesData };