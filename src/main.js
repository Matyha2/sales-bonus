/**
 * Функция расчета выручки с учетом скидки
 * Сохраняем высокую точность, чтобы избежать накопления ошибок.
 */
function calculateSimpleRevenue(purchase, product) {
    const discountFactor = 1 - purchase.discount / 100;
    const itemRevenue = product.sale_price * purchase.quantity * discountFactor;
    return itemRevenue;
}

/**
 * Функция расчета бонуса по позиции
 */
function calculateBonusByProfit(index, total, seller) {
    const profit = seller.profit;
    if (index === 0) return profit * 0.15;
    if (index === 1 || index === 2) return profit * 0.10;
    if (index === total - 1) return 0;
    return profit * 0.05;
}

/**
 * Главная функция анализа данных продаж
 */
function analyzeSalesData(data, options) {
    if (
        !data ||
        !Array.isArray(data.sellers) || data.sellers.length === 0 ||
        !Array.isArray(data.products) || data.products.length === 0 ||
        !Array.isArray(data.purchase_records) || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    const { calculateRevenue, calculateBonus } = options;
    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Отсутствуют необходимые функции');
    }

    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,  // Накопление без toFixed на каждом шаге
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    const sellerIndex = {};
    sellerStats.forEach(seller => { sellerIndex[seller.id] = seller; });

    const productIndex = {};
    data.products.forEach(product => { productIndex[product.sku] = product; });

    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        seller.sales_count++;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            const itemRevenue = calculateRevenue(item, product);

            // Сохраняем точность purchase_price
            const purchasePrice = parseFloat(product.purchase_price.toFixed(10));
            const itemCost = purchasePrice * item.quantity;

            const itemProfit = itemRevenue - itemCost;

            // Просто аккуратно складываем числа, без toFixed в промежуточном шаге
            seller.revenue += itemRevenue;
            seller.profit += itemProfit;

            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        });
    });

    // Сортируем по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);

        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // Финальное округление — именно здесь
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: parseFloat(seller.revenue.toFixed(2)),
        profit: parseFloat(seller.profit.toFixed(2)),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: parseFloat(seller.bonus.toFixed(2)),
    }));
}