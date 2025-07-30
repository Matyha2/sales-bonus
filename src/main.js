function analyzeSalesData(data, options) {
    if (!options || !options.calculateRevenue || !options.calculateBonus) {
        throw new Error("Missing required options");
    }
    if (!data) throw new Error("Некорректные входные данные");
    if (!Array.isArray(data.sellers) || data.sellers.length === 0) {
        throw new Error("Массив sellers пуст или не является массивом");
    }
    if (!Array.isArray(data.products) || data.products.length === 0) {
        throw new Error("Массив products пуст или не является массивом");
    }
    if (!Array.isArray(data.purchase_records) || data.purchase_records.length === 0) {
        throw new Error("Массив purchase_records пуст или не является массивом");
    }

    const calculateRevenue = ({discount, sale_price, quantity}) => {
        const discountedPrice = sale_price * (1 - discount/100);
        return discountedPrice * quantity; // Don't round here
    };

    const calculateProfit = ({discount, sale_price, quantity, purchase_price}) => {
        const discountedPrice = sale_price * (1 - discount/100);
        const revenue = discountedPrice * quantity;
        const cost = purchase_price * quantity;
        return revenue - cost; // Don't round here
    };

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

            const revenue = calculateRevenue(item);
            const profit = calculateProfit({
                ...item,
                purchase_price: product.purchase_price
            });

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
        // Calculate bonus without intermediate rounding
        if (options?.calculateBonus) {
            seller.bonus = options.calculateBonus(index, sellersStats.length, seller);
        } else {
            const bonus = index === 0 ? seller.profit * 0.15 :
                         index <= 2 ? seller.profit * 0.10 :
                         index === sellersStats.length - 1 ? 0 :
                         seller.profit * 0.05;
            seller.bonus = bonus;
        }

        const topProductsArray = [];
        for (const sku in seller.products_sold) {
            topProductsArray.push({
                sku: sku,
                quantity: seller.products_sold[sku]
            });
        }

        seller.top_products = topProductsArray
            .sort((a,b) => b.quantity - a.quantity)
            .slice(0,10);
    });

    // Apply rounding only in the final output
    return sellersStats.map(seller => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: parseFloat(seller.revenue.toFixed(2)),
        profit: parseFloat(seller.profit.toFixed(2)),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: parseFloat(seller.bonus.toFixed(2))
    }));
}