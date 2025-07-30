/**
 * Функция для расчета выручки
 * @param purchase запись о покупке (item)
 * @param _product карточка товара (не используется в расчёте)
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const discountFactor = 1 - purchase.discount / 100;
    return purchase.sale_price * purchase.quantity * discountFactor;
}

/**
 * Функция для расчета бонусов
 * @param index - позиция в рейтинге (0 - первая)
 * @param total - общее число продавцов
 * @param seller - объект с данными продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    let bonus;
    const profit = seller.profit;
    
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
 * @param data - объект с данными
 * @param options - объект с функциями расчетов
 * @returns {Array} - массив с результатами
 */
function analyzeSalesData(data, options) {
    if (!data || !Array.isArray(data.sellers) || !Array.isArray(data.products) || 
        !Array.isArray(data.purchase_records) || data.sellers.length === 0 ||
        data.products.length === 0 || data.purchase_records.length === 0) {
        throw new Error('Некорректные входные данные');
    }

    const { calculateRevenue, calculateBonus } = options;
    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Не переданы необходимые функции для расчетов');
    }

    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    const sellerIndex = sellerStats.reduce((result, seller) => {
        result[seller.id] = seller;
        return result;
    }, {});

    const productIndex = data.products.reduce((result, product) => {
        result[product.sku] = product;
        return result;
    }, {});

    // Единый проход для расчета всех показателей
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        seller.sales_count += 1;
        
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;
            
            // Рассчитываем выручку с учетом скидки
            const itemRevenue = calculateRevenue(item, product);
            // Рассчитываем себестоимость
            const itemCost = product.purchase_price * item.quantity;
            // Рассчитываем прибыль
            const itemProfit = itemRevenue - itemCost;
            
            seller.revenue += itemRevenue;
            seller.profit += itemProfit;
            
            // Учет проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // Округление показателей после всех расчетов
    sellerStats.forEach(seller => {
        seller.revenue = parseFloat(seller.revenue.toFixed(2));
        seller.profit = parseFloat(seller.profit.toFixed(2));
    });

    // Сортировка по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Расчет бонусов и топ-продуктов
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

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