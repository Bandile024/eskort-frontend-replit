/**
 * Time helpers for recipe properties.
 *
 * The CMS stores cooking / preparation times as free text ("20min", "1hr",
 * "1 hour 30 min"). The CMS front-end renders "Total: 30min", where the total
 * is the preparation time plus the cooking time.
 */

const TIME_TOKEN_RE = /(\d+(?:\.\d+)?)\s*(hours?|minutes?|mins?|hrs?|h|m)\b/gi;

/** Parses a free-text duration ("20min", "1hr", "1 hour 30 min") into minutes. */
export function parseMinutes(value: string | null | undefined): number | null {
  if (!value) return null;

  let total = 0;
  let found = false;

  for (const match of value.matchAll(TIME_TOKEN_RE)) {
    const amount = Number(match[1]);
    const unit = (match[2] ?? '').toLowerCase();
    if (Number.isNaN(amount)) continue;
    total += unit.startsWith('h') ? amount * 60 : amount;
    found = true;
  }

  return found ? Math.round(total) : null;
}

/** Formats minutes the way the CMS front-end does: "30min", "1hr", "1hr 30min". */
export function formatMinutes(total: number): string {
  if (total < 60) return `${total}min`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes === 0 ? `${hours}hr` : `${hours}hr ${minutes}min`;
}

/**
 * The recipe's total time = preparation + cooking, as rendered by the CMS
 * front-end. Returns `null` when neither value is usable.
 */
export function totalTime(
  cookTime: string | null | undefined,
  prepTime: string | null | undefined,
): string | null {
  const cook = parseMinutes(cookTime);
  const prep = parseMinutes(prepTime);

  if (cook === null && prep === null) return null;
  return formatMinutes((cook ?? 0) + (prep ?? 0));
}
