import capitalizeFirstLetter from "./capitalizeFirstLetter";

/**
 * Display a console.warn message about API status.
 *
 * @param {string} provider The API service provider.
 * @param {string} status The API status.
 */
export default function consoleStatus(provider, status = 0) {
	const local = instant_img_localize;
	if (status === 400 || status === 401) {
		// Unsplash/Pixabay incorrect API key.
		console.warn(
			`[${local.instant_images} - ${status} Error] ${capitalizeFirstLetter(
				provider
			)}: ${local.api_invalid_msg}`
		);
	}
	if (status === 429) {
		// Pixabay - too many requests.
		console.warn(
			`[${local.instant_images} - ${status} Error] ${capitalizeFirstLetter(
				provider
			)}: ${local.api_ratelimit_msg}`
		);
	}
}
