/**
 * Функция для расчёта выручки
 * @param purchase запись о покупке (item)
 * @param _product карточка товара (не используется в расчёте)
 * @returns {number}
 */

/**
 * Функция для расчёта бонусов
 * @param index - позиция в рейтинге (0 - первая)
 * @param total - общее число продавцов
 * @param seller - объект с данными продавца
 * @returns {number}
 */


/**
 * Главная функция анализа данных продаж
 * @param data - объект с данными
 * @param options - объект с функциями расчёта
 * @returns {Array} - массив с результатами
 */
function round2(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Функция для расчёта выручки
 */
function calculateSimpleRevenue(purchase, _product) {
  const discountFactor = 1 - purchase.discount / 100;
  const revenue = purchase.sale_price * purchase.quantity * discountFactor;
  return round2(revenue);
}

/**
 * Функция расчёта бонусов
 */
function calculateBonusByProfit(index, total, seller) {
  const profit = seller.profit;
  let bonus = 0;

  if (index === 0) {
    bonus = profit * 0.15;
  } else if (index === 1 || index === 2) {
    bonus = profit * 0.1;
  } else if (index === total - 1) {
    bonus = 0;
  } else {
    bonus = profit * 0.05;
  }
  return round2(bonus);
}

/**
 * Главная функция анализа данных продаж
 */
function analyzeSalesData(data, options) {
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.purchase_records) ||
    data.sellers.length === 0 ||
    data.products.length === 0 ||
    data.purchase_records.length === 0
  ) {
    throw new Error('Некорректные входные данные');
  }

  const { calculateRevenue, calculateBonus } = options || {};
  if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
    throw new Error('Не переданы необходимые функции для расчётов');
  }

  const sellerStats = data.sellers.map(seller => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {}
  }));

  // Индексы для быстрого поиска
  const sellerIndex = {};
  sellerStats.forEach(seller => {
    sellerIndex[seller.id] = seller;
  });

  const productIndex = {};
  data.products.forEach(product => {
    productIndex[product.sku] = product;
  });

  // Подсчёт продаж, выручки и товаров
  data.purchase_records.forEach(record => {
    const seller = sellerIndex[record.seller_id];
    if (!seller) return;

    seller.sales_count++;

    // Складываем total_amount, аккуратно без промежуточного округления
    seller.revenue += record.total_amount;

    record.items.forEach(item => {
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity;
    });
  });

  // Расчёт прибыли с полным числом знаков
  data.purchase_records.forEach(record => {
    const seller = sellerIndex[record.seller_id];
    if (!seller) return;

    record.items.forEach(item => {
      const product = productIndex[item.sku];
      if (!product) return;

      const revenue = calculateRevenue(item, product);
      const cost = product.purchase_price * item.quantity;

      seller.profit += revenue - cost;
    });
  });

  // Округление прибыли и выручки в конце, один раз
  sellerStats.forEach(seller => {
    seller.profit = round2(seller.profit);
    seller.revenue = round2(seller.revenue);
  });

  // Сортируем по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);

  // Назначаем бонусы и формируем топ-10 продуктов
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, sellerStats.length, seller);

    const topProductsArray = [];
    for (const sku in seller.products_sold) {
      if (Object.prototype.hasOwnProperty.call(seller.products_sold, sku)) {
        topProductsArray.push({
          sku,
          quantity: seller.products_sold[sku]
        });
      }
    }

    seller.top_products = topProductsArray
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  // Возврат окончательного результата с округлением бонуса
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