const priceFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function formatPrice(value) {
  const number = Number(value);
  return Number.isFinite(number) ? priceFormatter.format(number) : '—';
}

export function formatDateTime(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? dateTimeFormatter.format(date) : '—';
}

export function formatWeight(grams) {
  const number = Number(grams);
  if (!Number.isFinite(number) || number <= 0) return '—';
  return number >= 1000
    ? `${(number / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} kg`
    : `${number.toLocaleString('vi-VN')} g`;
}
