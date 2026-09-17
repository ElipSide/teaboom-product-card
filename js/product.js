(function () {
  'use strict';

  const product = document.querySelector('[data-product]');
  if (!product) return;

  const form = product.querySelector('[data-buy-form]');
  const packInputs = form.querySelectorAll('input[name="pack"]');

  const els = {
    sku: product.querySelector('[data-product-sku]'),
    price: product.querySelector('[data-product-price]'),
    oldPrice: product.querySelector('[data-product-old-price]'),
    unitPrice: product.querySelector('[data-product-unit-price]'),
    discount: product.querySelector('[data-product-discount]'),
    submit: form.querySelector('[data-buy-submit]'),
    submitLabel: form.querySelector('[data-buy-label]'),
  };

  const ADDED_STATE_MS = 1800;

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

  function render(input) {
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

  form.addEventListener('change', function (event) {
    if (event.target.name === 'pack') render(event.target);
  });

  // Реальной корзины нет — только визуальный отклик
  let resetTimer;
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearTimeout(resetTimer);

    els.submit.classList.add('is-added');
    els.submitLabel.textContent = 'Добавлено';

    resetTimer = setTimeout(function () {
      els.submit.classList.remove('is-added');
      els.submitLabel.textContent = 'В корзину';
    }, ADDED_STATE_MS);
  });

  const checked = Array.from(packInputs).find(function (input) { return input.checked; });
  if (checked) render(checked);
})();
