export function formatDate(date?: string | Date | null, locale = "en-US"): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date?: string | Date | null, locale = "en-US"): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function capitalize(str?: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ");
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function formatEligibility(isGlobal?: boolean, departments?: string[]): string {
  if (isGlobal) return "All Departments";
  if (!departments || departments.length === 0) return "All Departments";
  
  if (departments.length === 1) return departments[0];
  if (departments.length <= 2) return departments.join(", ");
  if (departments.length === 3) return departments.join(", "); // user said QA, HR for multiple, but more than 3 is QA +2 more.
  // Actually let's follow:
  // Single: QA
  // Multiple: QA, HR
  // More than 3: QA +2 more
  
  if (departments.length > 3) {
    return `${departments[0]} +${departments.length - 1} more`;
  }
  
  return departments.join(", ");
}
