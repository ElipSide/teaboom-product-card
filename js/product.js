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

    cartButton: document.querySelector('.cart-button'),
    cartCount: document.querySelector('[data-cart-count]'),

    modal: document.querySelector('[data-cart-modal]'),
    modalList: document.querySelector('[data-modal-list]'),
    modalEmpty: document.querySelector('[data-modal-empty]'),
    modalFooter: document.querySelector('[data-modal-footer]'),
    modalCount: document.querySelector('[data-modal-count]'),
    modalTotal: document.querySelector('[data-modal-total]'),
    checkoutNote: document.querySelector('[data-checkout-note]'),
    itemTemplate: document.getElementById('cart-item-template'),
  };

  const STORAGE_KEY = 'teaboom-cart';
  const MAX_QTY = 99;

  /* Корзина: { [артикул]: количество }. Реального бэкенда нет — храним в localStorage */
  const cart = loadCart();

  /* ---------- Утилиты ---------- */

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
    const rounded = Math.round(value * 100) / 100;
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(rounded);
  }

  const pluralRules = new Intl.PluralRules('ru-RU');
  const ITEM_WORDS = { one: 'товар', few: 'товара', many: 'товаров', other: 'товара' };

  /** 1 товар, 3 товара, 5 товаров */
  function formatItems(count) {
    return count + ' ' + ITEM_WORDS[pluralRules.select(count)];
  }

  function getSelectedPack() {
    return packInputs.find(function (input) { return input.checked; }) || packInputs[0];
  }

  function getPackBySku(sku) {
    return packInputs.find(function (input) { return input.dataset.sku === sku; });
  }

  function getQty(input) {
    return cart[input.dataset.sku] || 0;
  }

  function setQty(input, qty) {
    const prevCount = getCartCount();
    const value = Math.max(0, Math.min(MAX_QTY, qty));

    if (value) {
      cart[input.dataset.sku] = value;
    } else {
      delete cart[input.dataset.sku];
    }

    saveCart();
    renderCart();
    if (getCartCount() > prevCount) bumpCartButton();
  }

  /** Позиции корзины в порядке фасовок на странице */
  function getCartItems() {
    return packInputs
      .filter(function (input) { return getQty(input) > 0; })
      .map(function (input) {
        const qty = getQty(input);
        return { input: input, qty: qty, sum: Number(input.dataset.price) * qty };
      });
  }

  function getCartCount() {
    return getCartItems().reduce(function (acc, item) { return acc + item.qty; }, 0);
  }

  /* ---------- Рендер ---------- */

  /* Цена, артикул, скидка выбранной фасовки */
  function renderPack(input) {
    const grams = Number(input.value);
    const price = Number(input.dataset.price);
    const oldPrice = Number(input.dataset.oldPrice) || 0;
    const hasDiscount = oldPrice > price;

    els.sku.textContent = input.dataset.sku;
    els.price.textContent = formatPrice(price);
    els.unitPrice.textContent = formatPrice((price / grams) * 100) + ' за 100 г';

    els.oldPrice.textContent = hasDiscount ? formatPrice(oldPrice) : '';
    els.oldPrice.parentElement.hidden = !hasDiscount;

    els.discount.hidden = !hasDiscount;
    if (hasDiscount) {
      els.discount.textContent = '−' + Math.round((1 - price / oldPrice) * 100) + '%';
    }
  }

  function renderCart() {
    const items = getCartItems();
    const count = getCartCount();
    const total = items.reduce(function (acc, item) { return acc + item.sum; }, 0);

    renderBuyControl();
    renderPackBadges();
    renderSummary(items, total);
    renderCartButton(count);
    renderModal(items, count, total);
  }

  /* Кнопка «В корзину» ⇄ счётчик выбранной фасовки */
  function renderBuyControl() {
    const qty = getQty(getSelectedPack());

    els.add.hidden = qty > 0;
    els.added.hidden = qty === 0;
    els.qty.textContent = qty;
    els.inc.disabled = qty >= MAX_QTY;
  }

  function renderPackBadges() {
    packInputs.forEach(function (input) {
      const qty = getQty(input);
      const badge = input.parentElement.querySelector('[data-pack-qty]');
      badge.hidden = qty === 0;
      badge.textContent = qty;
    });
  }

  function renderSummary(items, total) {
    els.list.textContent = '';

    items.forEach(function (item) {
      const li = document.createElement('li');
      const name = document.createElement('span');
      const cost = document.createElement('span');
      li.className = 'cart-summary__item';
      name.textContent = item.input.value + ' г × ' + item.qty;
      cost.textContent = formatPrice(item.sum);
      li.append(name, cost);
      els.list.append(li);
    });

    els.summary.hidden = items.length === 0;
    els.total.textContent = formatPrice(total);
  }

  function renderCartButton(count) {
    els.cartCount.hidden = count === 0;
    els.cartCount.textContent = count;
    els.cartButton.setAttribute('aria-label', count ? 'Корзина, ' + formatItems(count) : 'Корзина пуста');
  }

  function renderModal(items, count, total) {
    // Список пересобирается целиком — запоминаем фокус, чтобы вернуть его на ту же кнопку
    const focused = document.activeElement;
    const focusedItem = els.modalList.contains(focused) ? focused.closest('[data-sku]') : null;
    const focusedAction = focusedItem ? focused.dataset.itemAction : null;

    els.modalList.textContent = '';

    items.forEach(function (item) {
      const node = els.itemTemplate.content.firstElementChild.cloneNode(true);
      const packName = item.input.value + ' г';

      node.dataset.sku = item.input.dataset.sku;
      node.querySelector('[data-item-meta]').textContent =
        packName + ' · арт. ' + item.input.dataset.sku + ' · ' + formatPrice(Number(item.input.dataset.price)) + '\u2060/\u2060шт.'; // word joiner: без переноса по «/»
      node.querySelector('[data-item-qty]').textContent = item.qty;
      node.querySelector('[data-item-sum]').textContent = formatPrice(item.sum);

      node.querySelector('[role="group"]').setAttribute('aria-label', 'Количество, фасовка ' + packName);
      node.querySelector('[data-item-action="dec"]').setAttribute('aria-label', 'Убрать одну упаковку ' + packName);
      node.querySelector('[data-item-action="inc"]').setAttribute('aria-label', 'Добавить упаковку ' + packName);
      node.querySelector('[data-item-action="inc"]').disabled = item.qty >= MAX_QTY;
      node.querySelector('[data-item-action="remove"]').setAttribute('aria-label', 'Удалить фасовку ' + packName + ' из корзины');

      els.modalList.append(node);
    });

    els.modalList.hidden = items.length === 0;
    els.modalEmpty.hidden = items.length > 0;
    els.modalFooter.hidden = items.length === 0;
    els.modalCount.textContent = formatItems(count);
    els.modalTotal.textContent = formatPrice(total);

    if (focusedItem) {
      restoreModalFocus(focusedItem.dataset.sku, focusedAction);
    }
  }

  function restoreModalFocus(sku, action) {
    const row = els.modalList.querySelector('[data-sku="' + sku + '"]');
    const target = row && row.querySelector('[data-item-action="' + action + '"]:not(:disabled)');

    if (target) {
      target.focus();
    } else {
      // Позицию удалили — фокус на следующую позицию или на кнопку закрытия/«Продолжить покупки»
      const next = els.modalList.querySelector('[data-item-action="remove"]');
      (next || els.modal.querySelector(els.modalEmpty.hidden ? '.modal__close' : '.cart-empty .button')).focus();
    }
  }

  function bumpCartButton() {
    els.cartButton.classList.remove('is-bumped');
    void els.cartButton.offsetWidth; // перезапуск анимации
    els.cartButton.classList.add('is-bumped');
  }

  /* ---------- Модалка ---------- */

  function openModal() {
    els.checkoutNote.hidden = true;
    els.modal.showModal();
  }

  document.querySelectorAll('[data-cart-open]').forEach(function (button) {
    button.addEventListener('click', openModal);
  });

  els.modal.addEventListener('click', function (event) {
    // Клик по подложке: сам <dialog> виден только за пределами .modal__inner
    if (event.target === els.modal || event.target.closest('[data-cart-close]')) {
      els.modal.close();
      return;
    }

    if (event.target.closest('[data-cart-checkout]')) {
      els.checkoutNote.hidden = false;
      return;
    }

    const actionButton = event.target.closest('[data-item-action]');
    if (!actionButton) return;

    const pack = getPackBySku(actionButton.closest('[data-sku]').dataset.sku);
    const qty = getQty(pack);
    const nextQty = { inc: qty + 1, dec: qty - 1, remove: 0 }[actionButton.dataset.itemAction];

    setQty(pack, nextQty);
  });

  /* ---------- Карточка ---------- */

  form.addEventListener('change', function (event) {
    if (event.target.name !== 'pack') return;
    renderPack(event.target);
    renderBuyControl();
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
