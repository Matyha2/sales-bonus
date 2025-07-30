/**
 * Функция для расчета выручки
 * @param purchase запись о покупке (item)
 * @param _product карточка товара (не используется в расчёте)
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const discountFactor = 1 - purchase.discount / 100;
    const revenue = purchase.sale_price * purchase.quantity * discountFactor;
    // Округляем до копеек с помощью toFixed(2) и преобразуем обратно в число
    return parseFloat(revenue.toFixed(2));
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
    let bonus;
    const profit = seller.profit; // Используем уже округленное значение
    
    if (index === 0) {
        bonus = profit * 0.15;
    } else if (index === 1 || index === 2) {
        bonus = profit * 0.10;
    } else if (index === total - 1) {
        bonus = 0;
    } else {
        bonus = profit * 0.05;
    }
    return parseFloat(bonus.toFixed(2));
}

/**
 * Главная функция анализа данных продаж
 * @param data - объект с данными (продавцы, продукты, чеки)
 * @param options - объект с функциями calculateRevenue и calculateBonus
 * @returns {Array} - массив с результатами для каждого продавца
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data 
        || !Array.isArray(data.sellers) 
        || !Array.isArray(data.products) 
        || !Array.isArray(data.purchase_records)
        || data.sellers.length === 0
        || data.products.length === 0
        || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    // Проверка наличия опций
    const { calculateRevenue, calculateBonus } = options;
    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Не переданы необходимые функции для расчетов');
    }

    // Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = sellerStats.reduce((result, seller) => {
        result[seller.id] = seller;
        return result;
    }, {});

    const productIndex = data.products.reduce((result, product) => {
        result[product.sku] = product;
        return result;
    }, {});

    // Расчёт выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        seller.sales_count += 1;
        seller.revenue = parseFloat((seller.revenue + record.total_amount).toFixed(2));

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            const revenue = calculateRevenue(item, product);
            const cost = product.purchase_price * item.quantity;
            const profit = revenue - cost;

            // Накопление без промежуточного округления
            seller.profit += profit;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // Округление прибыли только после всех расчетов
    sellerStats.forEach(seller => {
        seller.profit = parseFloat(seller.profit.toFixed(2));
    });

    // Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // Подготовка итоговой коллекции с нужными полями
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