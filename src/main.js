/**
 * Функция для расчета выручки
 * @param purchase запись о покупке (item)
 * @param _product карточка товара (не используется в расчёте)
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const discountFactor = 1 - purchase.discount / 100;
    return Math.round(purchase.sale_price * purchase.quantity * discountFactor * 100) / 100;
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
    return Math.round(bonus * 100) / 100;
}

/**
 * Главная функция анализа данных продаж
 * @param data - объект с данными
 * @param options - объект с функциями расчетов
 * @returns {Array} - массив с результатами
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data) {
        throw new Error('Отсутствуют входные данные');
    }
    
    if (!Array.isArray(data.sellers) || data.sellers.length === 0) {
        throw new Error('Некорректные данные продавцов: массив sellers пуст или отсутствует');
    }
    
    if (!Array.isArray(data.products) || data.products.length === 0) {
        throw new Error('Некорректные данные товаров: массив products пуст или отсутствует');
    }
    
    if (!Array.isArray(data.purchase_records) || data.purchase_records.length === 0) {
        throw new Error('Некорректные данные покупок: массив purchase_records пуст или отсутствует');
    }

    // Проверка функций расчета
    if (!options || typeof options.calculateRevenue !== 'function' || typeof options.calculateBonus !== 'function') {
        throw new Error('Не переданы необходимые функции для расчетов');
    }

    const { calculateRevenue, calculateBonus } = options;

    // Подготовка данных продавцов
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // Создание индексов для быстрого доступа
    const sellerIndex = Object.create(null);
    sellerStats.forEach(seller => {
        sellerIndex[seller.id] = seller;
    });

    const productIndex = Object.create(null);
    data.products.forEach(product => {
        productIndex[product.sku] = product;
    });

    // Обработка записей о покупках
    for (const record of data.purchase_records) {
        const seller = sellerIndex[record.seller_id];
        if (!seller) continue;
        
        seller.sales_count += 1;
        
        for (const item of record.items) {
            const product = productIndex[item.sku];
            if (!product) continue;
            
            // Расчет показателей с точным округлением на каждом шаге
            const itemRevenue = calculateRevenue(item, product);
            const itemCost = Math.round(product.purchase_price * item.quantity * 100) / 100;
            const itemProfit = Math.round((itemRevenue - itemCost) * 100) / 100;
            
            // Обновление статистики с точным округлением
            seller.revenue = Math.round((seller.revenue + itemRevenue) * 100) / 100;
            seller.profit = Math.round((seller.profit + itemProfit) * 100) / 100;
            
            // Учет проданных товаров
            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        }
    }

    // Сортировка по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Расчет бонусов и топ-продуктов
    for (let i = 0; i < sellerStats.length; i++) {
        const seller = sellerStats[i];
        seller.bonus = calculateBonus(i, sellerStats.length, seller);
        
        // Формирование топ-продуктов с стабильной сортировкой
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => {
                if (b.quantity !== a.quantity) {
                    return b.quantity - a.quantity;
                }
                return b.sku.localeCompare(a.sku);
            })
            .slice(0, 10);
    }

    // Формирование результата
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
