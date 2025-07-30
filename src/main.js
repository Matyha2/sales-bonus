/**
 * Функция для расчета выручки
 * @param purchase запись о покупке (item)
 * @param _product карточка товара (не используется)
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const sizeWithDiscount = 1 - purchase.discount / 100;
    return sizeWithDiscount * purchase.sale_price * purchase.quantity;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function analyzeSalesData(data, options) {

    const calculateRevenue = options.calculateRevenue;
    const calculateBonus = options.calculateBonus;

    function calculateProfit(item, product) {
        const revenue = calculateRevenue(item, product);
        const cost = +(product.purchase_price * item.quantity).toFixed(2);
        return +(revenue - cost).toFixed(2);
    }

    const sellersStats = data.sellers.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    data.purchase_records.forEach(sale => {
        const seller = sellersStats.find(s => s.seller_id === sale.seller_id);
        if (!seller) return;

        seller.sales_count++;

        sale.items.forEach(item => {
            const product = data.products.find(p => p.sku === item.sku);
            if (!product) return;

            const revenue = calculateRevenue(item, product);
            const profit = calculateProfit(item, product);

            seller.revenue += revenue;
            seller.profit += profit;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    sellersStats.sort((a, b) => b.profit - a.profit);

    sellersStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, sellersStats.length, seller);

    const topProductsArray = [];
    for (const sku in seller.products_sold) {
        topProductsArray.push({
            sku: sku,
            quantity: seller.products_sold[sku]
        });
    }

    seller.top_products = topProductsArray
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
});

    return sellersStats.map(seller => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}
