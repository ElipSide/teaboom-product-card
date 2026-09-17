(function () {
  'use strict';

  const product = document.querySelector('[data-product]');
  if (!product) return;

  const form = product.querySelector('[data-buy-form]');
  const packInputs = Array.from(form.querySelectorAll('input[name="pack"]'));

  const els = {
    sku: product.querySelector('[data-product-sku]'),
    price: product.querySelector('[data-product-price]'),
    oldPrice: product.querySelector('[data-product-old-price]'),
    unitPrice: product.querySelector('[data-product-unit-price]'),
    discount: product.querySelector('[data-product-discount]'),

    add: form.querySelector('[data-cart-add]'),
    added: form.querySelector('[data-cart-added]'),
    dec: form.querySelector('[data-cart-dec]'),
    inc: form.querySelector('[data-cart-inc]'),
    qty: form.querySelector('[data-cart-qty]'),

    summary: form.querySelector('[data-cart-summary]'),
    list: form.querySelector('[data-cart-list]'),
    total: form.querySelector('[data-cart-total]'),
  };

  const STORAGE_KEY = 'teaboom-cart';
  const MAX_QTY = 99;

  /* Корзина: { [артикул]: количество }. Реального бэкенда нет — храним в localStorage */
  const cart = loadCart();

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      /* приватный режим и т. п. — корзина просто живёт до перезагрузки */
    }
  }

  /** 326.4 → «326,40 ₽», 1432 → «1 432 ₽» */
  function formatPrice(value) {
    const hasKopecks = !Number.isInteger(value);
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: hasKopecks ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(value);
  }

  function getSelectedPack() {
    return packInputs.find(function (input) { return input.checked; }) || packInputs[0];
  }

  function getQty(input) {
    return cart[input.dataset.sku] || 0;
  }

  function setQty(input, qty) {
    const value = Math.max(0, Math.min(MAX_QTY, qty));
    if (value) {
      cart[input.dataset.sku] = value;
    } else {
      delete cart[input.dataset.sku];
    }
    saveCart();
    renderCart();
  }

  /* Цена, артикул, скидка выбранной фасовки */
  function renderPack(input) {
    const grams = Number(input.value);
    const price = Number(input.dataset.price);
    const oldPrice = Number(input.dataset.oldPrice) || 0;
    const hasDiscount = oldPrice > price;

    els.sku.textContent = input.dataset.sku;
    els.price.textContent = formatPrice(price);
    els.unitPrice.textContent = formatPrice(Math.round((price / grams) * 10000) / 100) + ' за 100 г';

    els.oldPrice.textContent = hasDiscount ? formatPrice(oldPrice) : '';
    els.oldPrice.parentElement.hidden = !hasDiscount;

    els.discount.hidden = !hasDiscount;
    if (hasDiscount) {
      els.discount.textContent = '−' + Math.round((1 - price / oldPrice) * 100) + '%';
    }
  }

  /* Кнопка/счётчик, бейджи на фасовках и сводка */
  function renderCart() {
    const selectedQty = getQty(getSelectedPack());

    els.add.hidden = selectedQty > 0;
    els.added.hidden = selectedQty === 0;
    els.qty.textContent = selectedQty;
    els.inc.disabled = selectedQty >= MAX_QTY;

    let total = 0;
    els.list.textContent = '';

    packInputs.forEach(function (input) {
      const qty = getQty(input);
      const badge = input.parentElement.querySelector('[data-pack-qty]');
      badge.hidden = qty === 0;
      badge.textContent = qty;

      if (!qty) return;

      const sum = Math.round(Number(input.dataset.price) * qty * 100) / 100;
      total += sum;

      const item = document.createElement('li');
      const name = document.createElement('span');
      const cost = document.createElement('span');
      item.className = 'cart-summary__item';
      name.textContent = input.value + ' г × ' + qty;
      cost.textContent = formatPrice(sum);
      item.append(name, cost);
      els.list.append(item);
    });

    els.summary.hidden = total === 0;
    els.total.textContent = formatPrice(Math.round(total * 100) / 100);
  }

  form.addEventListener('change', function (event) {
    if (event.target.name !== 'pack') return;
    renderPack(event.target);
    renderCart();
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    setQty(getSelectedPack(), 1);
    els.inc.focus(); // кнопка «В корзину» скрылась — не теряем фокус
  });

  els.inc.addEventListener('click', function () {
    const pack = getSelectedPack();
    setQty(pack, getQty(pack) + 1);
  });

  els.dec.addEventListener('click', function () {
    const pack = getSelectedPack();
    setQty(pack, getQty(pack) - 1);
    if (!getQty(pack)) els.add.focus();
  });

  renderPack(getSelectedPack());
  renderCart();
})();
