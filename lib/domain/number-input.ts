// Canonical values keep a decimal point for exact server-side Decimal math.
// Only presentation uses Indonesian grouping dots and a decimal comma.
export function formatNumberInput(value: string): string {
  if (!value) return "";
  const [integer, fraction] = value.split(".");
  const normalized = integer.replace(/^0+(?=\d)/, "") || "0";
  return (
    normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ".") +
    (fraction !== undefined ? `,${fraction}` : "")
  );
}
export function parseNumberInput(value: string): string | null {
  const cleaned = value.replace(/^\s*Rp\s*/i, "").replace(/\s/g, "");
  if (!cleaned) return "";
  if (!/^[\d.,]+$/.test(cleaned) || (cleaned.match(/,/g) || []).length > 1)
    return null;
  const stripped = cleaned.replace(/\./g, "");
  if (!stripped) return "";
  const [integer, fraction] = stripped.split(",");
  if (integer.length > 12 || (fraction?.length || 0) > 4) return null;
  return (
    (integer.replace(/^0+(?=\d)/, "") || "0") +
    (fraction !== undefined ? `.${fraction}` : "")
  );
}
export function numberCaret(display: string, meaningfulCharacters: number) {
  if (!meaningfulCharacters) return 0;
  let seen = 0;
  for (let i = 0; i < display.length; i++)
    if (/[\d,]/.test(display[i]) && ++seen >= meaningfulCharacters)
      return i + 1;
  return display.length;
}
