export const preloadTemplates = async function() {
	const templatePaths = [
		// Add paths to "modules/patchwork-sea/templates"
	];

	return loadTemplates(templatePaths);
}
