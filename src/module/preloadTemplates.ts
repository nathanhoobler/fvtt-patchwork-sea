import { PWS, MODULE_TEMPLATE_PATH } from './config.js';

export const preloadTemplates = async function() {
	const templatePaths = [
		// Add paths to "modules/patchwork-sea/templates"
		`${MODULE_TEMPLATE_PATH}/party-sheet.html`,		
		`${MODULE_TEMPLATE_PATH}/party-member-line.html`
	];

	return loadTemplates(templatePaths);
}
