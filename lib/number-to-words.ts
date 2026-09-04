/**
 * Converts a numerical amount into Indian currency words.
 * Handles Crores, Lakhs, Thousands, Hundreds, Units, and Paise.
 */

const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen"
];

const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
];

function twoDigitsToWords(n: number): string {
  if (n < 20) return ones[n];
  const t = tens[Math.floor(n / 10)];
  const o = ones[n % 10];
  return o ? `${t} ${o}` : t;
}

function threeDigitsToWords(n: number): string {
  const h = Math.floor(n / 100);
  const rem = n % 100;
  let res = "";
  if (h > 0) {
    res += `${ones[h]} Hundred`;
    if (rem > 0) res += " ";
  }
  if (rem > 0) {
    res += twoDigitsToWords(rem);
  }
  return res.trim();
}

export function amountToIndianWords(num: number | string): string {
  const parsed = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(parsed) || parsed <= 0) return "Zero Rupees Only";

  const integerPart = Math.floor(parsed);
  const paisePart = Math.round((parsed - integerPart) * 100);

  if (integerPart === 0 && paisePart > 0) {
    return `${twoDigitsToWords(paisePart)} Paise Only`;
  }

  // Indian format: Crores (10^7), Lakhs (10^5), Thousands (10^3), Hundreds (10^2), Units
  let n = integerPart;
  const parts: string[] = [];

  const crores = Math.floor(n / 10000000);
  n %= 10000000;

  const lakhs = Math.floor(n / 100000);
  n %= 100000;

  const thousands = Math.floor(n / 1000);
  n %= 1000;

  const hundredsAndRest = n;

  if (crores > 0) {
    parts.push(`${threeDigitsToWords(crores)} Crore`);
  }
  if (lakhs > 0) {
    parts.push(`${twoDigitsToWords(lakhs)} Lakh`);
  }
  if (thousands > 0) {
    parts.push(`${twoDigitsToWords(thousands)} Thousand`);
  }
  if (hundredsAndRest > 0) {
    parts.push(threeDigitsToWords(hundredsAndRest));
  }

  let words = parts.join(" ") + " Rupees";
  if (paisePart > 0) {
    words += ` and ${twoDigitsToWords(paisePart)} Paise`;
  }

  words += " Only";
  return words;
}
