import CryptoJS from "crypto-js";
import { API } from "../constants/API";

/**
 * Get results from session storage by URL.
 *
 * @param {string} url The API URL.
 * @return {Array|boolean} Session results.
 */
export function getSession(url) {
	if (!url || API.testmode) {
		return false; // Exit if no URL or test mode is enabled.
	}

	const session = sessionStorage.getItem(md5Hash(url));
	if (!session) {
		return false; // Exit if no session data.
	}

	const data = JSON.parse(session);
	const { expires = 0 } = data;

	// Check if expiration time has passed.
	const expired = Date.now() > expires;

	// Delete session data when expired.
	if (expired) {
		deleteSession(url);
	}

	return data && !expired ? data : false;
}

/**
 * Save API data to session storage by URL.
 *
 * @param {string} url     Save results to session by URL.
 * @param {Array}  results The API results.
 */
export function saveSession(url, results) {
	if (!url || !results) {
		return false;
	}
	// Set expiration to 1 hour.
	results.expires = Date.now() + 3600000;

	// Save session data.
	sessionStorage.setItem(md5Hash(url), JSON.stringify(results));
}

/**
 * Remove/delete session storage by URL.
 *
 * @param {string} url The API URL.
 */
export function deleteSession(url) {
	if (!url) {
		return false;
	}
	sessionStorage.removeItem(md5Hash(url));
}

/**
 * Get the MD5 hash value of a URL.
 *
 * @param {string} url The API URL to hash.
 * @return {string} The MD5 hash.
 */
export function md5Hash(url) {
	return CryptoJS.MD5(url).toString();
}
