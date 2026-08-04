// Defense-in-depth for stored text: React (native + DOM) already escapes
// interpolated strings by default and nothing in this codebase uses
// dangerouslySetInnerHTML, so there's no live XSS render path today — but
// stripping markup at write time means that stays true even if a future
// screen, export, or other consumer of this data renders it less carefully.
const TAG_RE = /<[^>]*>/g;
// Strip non-printable control chars but keep tab/newline/carriage-return,
// which are legitimate in multi-line descriptions and messages.
const CONTROL_CHARS_RE = new RegExp('[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]', 'g');

export function sanitizeText(input: string): string {
  return input.replace(TAG_RE, '').replace(CONTROL_CHARS_RE, '').trim();
}
