/**
 * PII Stripping Service
 *
 * Strips personally identifiable information from text before it is
 * transmitted to external AI providers (Anthropic). Required for GDPR
 * compliance when processing investor data through US-based APIs.
 *
 * Replaces detected PII with category placeholders:
 *   [EMAIL], [PHONE], [IBAN], [LEI], [TAX_ID], [UUID]
 */

/** Email addresses */
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

/** International phone numbers */
const PHONE_RE = /(?:\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,6}\b/g;

/** IBAN (international bank account numbers) */
const IBAN_RE = /\b[A-Z]{2}\d{2}\s?[A-Z0-9]{4}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,4})?\b/g;

/** LEI (Legal Entity Identifiers — 20 alphanumeric chars) */
const LEI_RE = /\b[A-Z0-9]{4}00[A-Z0-9]{12}\d{2}\b/g;

/** German Steuer-ID (11 digits) */
const STEUER_ID_RE = /\b\d{2}\s?\d{3}\s?\d{3}\s?\d{3}\b/g;

/** Luxembourg national ID (13 digits starting with year) */
const LU_ID_RE = /\b(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}\d{2}\b/g;

/** UUIDs (may reference investor/fund/asset IDs) */
const UUID_RE = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\b/g;

/**
 * Strip PII from text, replacing with category placeholders.
 * Designed to be applied to user messages before sending to external AI APIs.
 */
export function stripPII(text: string): string {
  return text
    .replace(EMAIL_RE, '[EMAIL]')
    .replace(IBAN_RE, '[IBAN]')
    .replace(LEI_RE, '[LEI]')
    .replace(LU_ID_RE, '[NATIONAL_ID]')
    .replace(STEUER_ID_RE, '[TAX_ID]')
    .replace(UUID_RE, '[ID]')
    .replace(PHONE_RE, '[PHONE]');
}
