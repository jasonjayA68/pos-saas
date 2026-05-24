// Money is stored as integer centavos. Never use floats for arithmetic.

export type Centavos = number;

export function toCentavos(php: number): Centavos {
  return Math.round(php * 100);
}

export function fromCentavos(c: Centavos): number {
  return c / 100;
}

const PHP_FORMATTER = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

export function formatPHP(c: Centavos): string {
  return PHP_FORMATTER.format(fromCentavos(c));
}
