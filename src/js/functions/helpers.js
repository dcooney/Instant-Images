/**
 * Check if an object is empty.
 *
 * @param {object}   obj The object to test against.
 * @return {Boolean}     Is this an object.
 */
export function isObjectEmpty(obj) {
	if (obj === null || obj === undefined) {
		return true;
	}
	return Object.keys(obj).length === 0;
}

/**
 * Check the `x-ratelimit-remaining` headers to confirm the API is available.
 *
 * @param {object} headers The request headers object.
 */
export function checkRateLimit(headers) {
	if (!headers) {
		return;
	}
	const limit = headers.get('X-RateLimit-Limit') || -1;
	const remaining = headers.get('X-RateLimit-Remaining') || -1;
	if (limit > -1 && parseInt(remaining) < 2) {
		alert(instant_img_localize.api_ratelimit_msg);
	}
}

/**
 * Capitalize the first letter of a string.
 *
 * @param  {string} str The string to format.
 * @return {string}     The formatted string.
 */
export function capitalizeFirstLetter(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

let tooltipInterval = '';

/**
 * Show the tooltip.
 *
 * @param {Event} e The target tooltip element.
 * @since 4.3.0
 */
export function showTooltip(e) {
	const target = e.currentTarget;
	const rect = target.getBoundingClientRect();
	let left = Math.round(rect.left);
	const top = Math.round(rect.top);

	const container = target.closest('#photo-listing');
	const tooltip = container.querySelector('#tooltip');
	tooltip.classList.remove('over');

	if (target.classList.contains('tooltip--above')) {
		tooltip.classList.add('above');
	} else {
		tooltip.classList.remove('above');
	}

	// Delay Tooltip Reveal.
	tooltipInterval = setInterval(function () {
		clearInterval(tooltipInterval);
		tooltip.innerHTML = target.dataset.title; // Tooltip content.

		// Position Tooltip.
		left = left - tooltip.offsetWidth + target.offsetWidth + 5;
		tooltip.style.left = `${left}px`;
		tooltip.style.top = `${top}px`;

		setTimeout(function () {
			tooltip.classList.add('over');
		}, 25);
	}, 750);
}

/**
 * Hide the tooltip.
 *
 * @param {Event} e The target tooltip element.
 * @since 4.3.0
 */
export function hideTooltip(e) {
	clearInterval(tooltipInterval);
	const container = e.currentTarget.closest('#photo-listing');
	const tooltip = container.querySelector('#tooltip');
	tooltip.classList.remove('over');
}
