function analyzeSalesData(data, options) {
    // Проверки входных данных
    if (
        !data ||
        !Array.isArray(data.sellers) || data.sellers.length === 0 ||
        !Array.isArray(data.products) || data.products.length === 0 ||
        !Array.isArray(data.purchase_records) || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    // Используем переданные функции или дефолтные
    const { calculateRevenue = calculateSimpleRevenue, calculateBonus = calculateBonusByProfit } = options || {};

    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Отсутствуют необходимые функции calculateRevenue и/или calculateBonus');
    }

    // Инициализация статистики продавцов
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: seller.first_name + ' ' + seller.last_name,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // Индексы для быстрого доступа
    const sellerIndex = {};
    sellerStats.forEach(seller => { sellerIndex[seller.id] = seller; });

    const productIndex = {};
    data.products.forEach(product => { productIndex[product.sku] = product; });

    // Обработка записей продаж
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        seller.sales_count++;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            const itemRevenue = calculateRevenue(item, product);

            // Высокоточный расчет себестоимости
            const purchasePrice = parseFloat(product.purchase_price.toFixed(10));
            const itemCost = purchasePrice * item.quantity;

            const itemProfit = itemRevenue - itemCost;

            // Накопление значений без промежуточного округления
            seller.revenue += itemRevenue;
            seller.profit += itemProfit;

            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        });
    });

    // Сортировка продавцов по убыванию прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Вычисление бонусов и топ-10 продуктов (без Object.entries)
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);

        const productsArray = [];
        for (const sku in seller.products_sold) {
            if (Object.prototype.hasOwnProperty.call(seller.products_sold, sku)) {
                productsArray.push({ sku: sku, quantity: seller.products_sold[sku] });
            }
        }

        seller.top_products = productsArray
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // Итоговая отдача с округлением в конце
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