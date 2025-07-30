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
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) return seller.profit * 0.15;
    if (index <= 2) return seller.profit * 0.10;
    if (index === total - 1) return 0;
    return seller.profit * 0.05;
}

/**
 * Анализ данных продаж
 * @param data входные данные
 * @param options настройки
 * @returns {Array}
 */
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
        let sizeWithDiscount = 1 - (discount/100);
        return sizeWithDiscount * sale_price * quantity;
    };

    const calculateProfit = ({discount, sale_price, quantity, purchase_price}) => {
        let sizeWithDiscount = 1 - (discount/100);
        let pricesPerProduct = sizeWithDiscount * sale_price * quantity;
        return pricesPerProduct - purchase_price * quantity;
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
        if (options?.calculateBonus) {
            seller.bonus = options.calculateBonus(index, sellersStats.length, seller);
        } else {
            if (index === 0) seller.bonus = seller.profit * 0.15;
            else if (index <= 2) seller.bonus = seller.profit * 0.10;
            else if (index === sellersStats.length - 1) seller.bonus = 0;
            else seller.bonus = seller.profit * 0.05;
        }

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