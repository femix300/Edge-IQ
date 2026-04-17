export const formatPercent = (value, digits = 0) =>
  `${(value * 100).toFixed(digits)}%`;

export const formatCompactNumber = (value) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);

export const formatSignedPercent = (value, digits = 0) => {
  const percent = (value * 100).toFixed(digits);
  return `${value > 0 ? "+" : ""}${percent}%`;
};

export const formatSignalAction = (action) => {
  if (action === "buy_yes") return "BUY YES";
  if (action === "buy_no") return "BUY NO";
  return "WAIT";
};
