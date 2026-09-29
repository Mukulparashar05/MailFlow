const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CsvParseResult {
  emails: string[];
  invalid: string[];
  errors: string[];
}

/**
 * Parses raw CSV string or newline-delimited text to extract valid email addresses.
 * - Extracts first column from standard CSV rows
 * - Trims quotes and whitespace
 * - Validates email format with regex
 * - Deduplicates emails in lowercase
 * - Returns valid emails, invalid entries, and helpful error messages
 */
export function parseCsvRecipients(csvContent: string): CsvParseResult {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim());
  const emails: string[] = [];
  const invalid: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Support: plain email, email in CSV column (take first column)
    const parts = line.split(',');
    const candidate = parts[0].trim().replace(/^["']|["']$/g, '');

    if (!candidate) continue;

    if (EMAIL_REGEX.test(candidate)) {
      emails.push(candidate.toLowerCase());
    } else {
      invalid.push(candidate);
      errors.push(`Row ${i + 1}: "${candidate}" is not a valid email`);
    }
  }

  return { emails: [...new Set(emails)], invalid, errors };
}
