// Input validation helpers. The original app had none (it only trims and checks for empty strings),
// so this file is intentionally minimal and holds the one shared check.
export const isBlank = s => !s || !String(s).trim();
