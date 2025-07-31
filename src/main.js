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
        revenueCents: 0,  // хранить сумму в копейках
        profitCents: 0,   // хранить сумму в копейках
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

            // Вычисляем выручку и стоимость в долларах
            const itemRevenue = calculateRevenue(item, product);
            const itemCost = product.purchase_price * item.quantity;

            // Переводим в копейки (целые числа)
            const itemRevenueCents = Math.round(itemRevenue * 100);
            const itemCostCents = Math.round(itemCost * 100);
            const itemProfitCents = itemRevenueCents - itemCostCents;

            seller.revenueCents += itemRevenueCents;
            seller.profitCents += itemProfitCents;

            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        });
    });

    // Сортируем продавцов по прибыли в копейках
    sellerStats.sort((a, b) => b.profitCents - a.profitCents);

    // Присваиваем бонусы и формируем топ товаров
    sellerStats.forEach((seller, index) => {
        // Передаем profit уже в долларах
        const sellerProfit = seller.profitCents / 100;
        seller.bonus = calculateBonus(index, sellerStats.length, { profit: sellerProfit });

        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // Финально преобразуем к валютному виду с двумя знаками
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: parseFloat((seller.revenueCents / 100).toFixed(2)),
        profit: parseFloat((seller.profitCents / 100).toFixed(2)),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: parseFloat(seller.bonus.toFixed(2))
    }));
}