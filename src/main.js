function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    const discountAmount = 1 - (discount / 100);
    return sale_price * quantity * discountAmount;
}

function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    let bonus;
    if (index === 0) bonus = profit * 0.15;
    else if (index === 1 || index === 2) bonus = profit * 0.10;
    else if (index === total - 1) bonus = 0;
    else bonus = profit * 0.05;

    return Math.round(bonus * 100) / 100;
}

function analyzeSalesData(data, options) {
    if (!data || !Array.isArray(data.sellers) || data.sellers.length === 0
        || !Array.isArray(data.products) || data.products.length === 0
        || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0) {
        throw new Error('Некорректные входные данные');
    }

    const { calculateRevenue, calculateBonus } = options;
    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Отсутствуют необходимые функции');
    }

    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
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

        seller.sales_count += 1;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            let itemRevenue = calculateRevenue(item, product);
            itemRevenue = Math.round(itemRevenue * 100) / 100;

            const itemCost = product.purchase_price * item.quantity;
            const itemProfit = itemRevenue - itemCost;
            const roundedItemProfit = Math.round(itemProfit * 100) / 100;

            seller.revenue = Math.round((seller.revenue + itemRevenue) * 100) / 100;
            seller.profit = Math.round((seller.profit + roundedItemProfit) * 100) / 100;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    sellerStats.sort((a, b) => b.profit - a.profit);

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
        revenue: parseFloat(seller.revenue.toFixed(2)),
        profit: parseFloat(seller.profit.toFixed(2)),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: parseFloat(seller.bonus.toFixed(2)),
    }));
}