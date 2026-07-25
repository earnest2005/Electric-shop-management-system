/**
 * Financial Precision Utility Module for Electrical Shop POS.
 * All monetary amounts in the database are stored as Integer Base Units (Paise)
 * where ₹1.00 = 100 Paise to prevent floating point double precision errors.
 */

/**
 * Converts Rupees (float/number/string) to Integer Paise.
 * @param {number|string} rupees 
 * @returns {number} Integer Paise
 */
export function rupeesToPaise(rupees) {
  if (rupees === null || rupees === undefined || rupees === '') return 0;
  const numeric = typeof rupees === 'string' ? parseFloat(rupees.replace(/,/g, '')) : rupees;
  if (isNaN(numeric)) return 0;
  return Math.round(numeric * 100);
}

/**
 * Converts Integer Paise back to float Rupees.
 * @param {number} paise 
 * @returns {number} Rupees float
 */
export function paiseToRupees(paise) {
  if (!paise || isNaN(paise)) return 0;
  return paise / 100;
}

/**
 * Formats Integer Paise into Indian Rupee currency format (e.g., ₹45,200.00 or ₹350)
 * @param {number} paise Amount in paise
 * @param {boolean} showDecimals Whether to force .00 decimals
 * @returns {string} Formatted Indian Rupee string
 */
export function formatRupees(paise, showDecimals = true) {
  const rupees = paiseToRupees(paise);
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return formatter.format(rupees);
}

/**
 * Helper to display plain formatted number without ₹ symbol
 */
export function formatNumberIN(paise) {
  const rupees = paiseToRupees(paise);
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}
