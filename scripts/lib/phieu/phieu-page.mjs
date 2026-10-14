// phieu-page.mjs — the ticket page itself. The HTML (with its CSS and script) lives in phieu-page.html next to this
// file so it can be edited as plain HTML; it is read once when the server starts. Pictures come from
// overrides/phieu-be-ngoan/ and the main site's logo and font from overrides/home/ (both served under /3qdc-vi/).
import { readFileSync } from 'node:fs';

const HTML = readFileSync(new URL('./phieu-page.html', import.meta.url), 'utf8');

export const renderPhieuPage = () => HTML;
