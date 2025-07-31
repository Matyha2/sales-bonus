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

    // Первый проход: расчет выручки и количества
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        seller.sales_count += 1;
        // добавляем выручку в центах
        seller.revenue += Math.round(record.total_amount * 100);

        record.items.forEach(item => {
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // Второй проход: расчет прибыли
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            const revenueInCents = Math.round(calculateRevenue(item, product));
            const costInCents = Math.round(product.purchase_price * item.quantity * 100);
            seller.profit += revenueInCents - costInCents;
        });
    });

    // Округление прибыли после всех расчетов
    sellerStats.forEach(seller => {
        seller.profit = parseFloat((seller.profit / 100).toFixed(2));
      // revenue уже в центах — переводим обратно при выводе
      // аналогично для остальных полей
      });

    // Сортировка по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Расчет бонусов и топ-продуктов
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        
        // преобразуем revenue из центов к рублям с двумя знаками
        seller.revenue_display = (seller.revenue / 100).toFixed(2);
        
        // Аналогично для profit:
        // уже есть как число с точностью до двух знаков
        
        // Топ продукты:
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a,b)=>b.quantity - a.quantity)
            .slice(0,10);
        
     });

     return sellerStats.map(seller => ({
         seller_id: seller.id,
         name: seller.name,
         revenue: parseFloat(seller.revenue_display),
         profit: parseFloat(seller.profit.toFixed(2)),
         sales_count: seller.sales_count,
         top_products: seller.top_products,
         bonus: seller.bonus
     }));
}