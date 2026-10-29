import { editors as base } from './editors.jsx';
import { editorsExtra } from './editorsExtra.jsx';

export { TEMPLATES, TEMPLATE_MAP, CATEGORIES, tName } from './meta.js';
export { DEFAULTS, DEFAULT_SETTINGS } from './defaults.js';
export const editors = { ...base, ...editorsExtra };
