import { Fragment, useRef, useState, useEffect } from '@wordpress/element';
import classNames from 'classnames';
import Masonry from 'masonry-layout';
import API from '../constants/API';
import FILTERS from '../constants/filters';
import buildURL, { buildTestURL } from '../functions/buildURL';
import { checkRateLimit } from '../functions/helpers';
import consoleStatus from '../functions/consoleStatus';
import getQueryParams from '../functions/getQueryParams';
import getResults, { getSearchTotal } from '../functions/getResults';
import { isObjectEmpty } from '../functions/helpers';
import APILightbox from './APILightbox';
import ErrorLightbox from './ErrorLightbox';
import Filter from './Filter';
import LoadingBlock from './LoadingBlock';
import LoadMore from './LoadMore';
import NoResults from './NoResults';
import Photo from './Photo';
import RestAPIError from './RestAPIError';
import ResultsToolTip from './ResultsToolTip';
import Sponsor from './Sponsor';
import Tooltip from './Tooltip';
import ProviderNav from './ProviderNav';
const imagesLoaded = require('imagesloaded');

/**
 * Render the PhotoList component.
 *
 * @param {Object} props The component props.
 * @return {JSX.Element} The PhotoList component.
 */
export default function PhotoList(props) {
	let { editor = 'classic', page, data, error, provider, orderby, container, setFeaturedImage, insertImage } = props;

	let api_provider = API[provider]; // The API settings for the provider.
	const per_page = API.defaults.per_page;

	// API Vars.
	let api_key = instant_img_localize[`${provider}_app_id`];
	let photo_api = api_provider?.photo_api;
	let search_api = api_provider?.search_api;
	let api_error = error;

	const loadingClass = 'loading';
	const searchClass = 'searching';

	// Results state.
	const [results, setResults] = useState(getResults(data));
	const [activeProvider, setActiveProvider] = useState(provider);

	const [state, setState] = useState({
		provider: provider,
		filters: FILTERS[provider].filters,
		search_filters: FILTERS[provider].search,
		restapi_error: false,
		api_lightbox: false,
	});

	let filters = {};
	let search_filters = {};
	let show_search_filters = true;

	let is_search = false;
	let search_term = '';
	let total_results = 0;
	let view = '';
	let isLoading = false; // Loading flag.
	let isDone = false; // Done flag.
	let msnry = '';
	let tooltipInterval = '';
	const delay = 250;

	// Refs.
	const loading = useRef(false);
	const done = useRef(false);
	const photoTarget = useRef();
	const providerNav = useRef();
	const controlNav = useRef();
	const photoSearch = useRef();
	const filterGroups = useRef();
	const filterRef = [];

	// Editor props.
	const is_block_editor = editor === 'gutenberg' ? true : false;
	const is_media_router = editor === 'media-router' ? true : false;
	const plugin = is_block_editor ? document.body : container.parentNode.parentNode;
	const wrapper = is_block_editor ? document.body : plugin.querySelector('.instant-images-wrapper');

	/**
	 * Reset filters.
	 */
	function resetFilters() {
		if (filterRef?.length) {
			filterRef.forEach((filter) => {
				if (filter) {
					filter.reset();
				}
			});
		}
	}

	/**
	 * Trigger Search.
	 *
	 * @param {Event} event The dispatched submit event.
	 * @since 3.0
	 */
	function search(event) {
		event.preventDefault();
		const input = photoSearch.current;
		const term = input.value;
		resetFilters();
		if (term.length > 2) {
			input.classList.add(searchClass);
			search_term = term;
			search_filters = {};
			is_search = true;
			doSearch(search_term);
		} else {
			input.focus();
		}
	}

	/**
	 * Reset search results, settings and results view.
	 *
	 * @since 3.0
	 */
	function clearSearch() {
		photoSearch.current.value = '';
		total_results = 0;
		is_search = false;
		search_term = '';
		search_filters = {}; // Reset search filters.
		toggleFilters(); // Re-enable filters.
	}

	/**
	 * Perform a photo search.
	 *
	 * @param {string} term The search term.
	 * @since 3.0
	 */
	async function doSearch(term) {
		const search_type = term.substring(0, 3) === 'id:' ? 'id' : 'term';

		// Set loading variables and options.
		photoTarget.current.classList.add(loadingClass);
		isLoading = true;
		page = 1; // Reset current page num.
		toggleFilters(); // Disable filters.

		// Get search query.
		let search_query = {};
		if (search_type === 'id') {
			show_search_filters = false;
			search_query = {
				id: search_term.replace('id:', '').replace(/\s+/, ''),
			};
		} else {
			show_search_filters = true;
			search_query = {
				term: search_term,
			};
		}

		// Build URL.
		const search_params = {
			...{ page: page },
			...search_query,
			...search_filters,
		};
		const params = getQueryParams(provider, search_params);
		const url = buildURL('search', params);

		// Create fetch request.
		const response = await fetch(url);
		const { status, headers } = response;
		checkRateLimit(headers);

		try {
			// Get response data.
			const data = await response.json();
			const images = getResults(data);

			// Check returned data.
			total_results = getSearchTotal(data);

			checkTotalResults(images.length);

			// Hide search filters if no results and not filtering.
			show_search_filters = total_results < 2 && isObjectEmpty(search_filters) ? false : true;

			// Update Props.
			setState({
				results: images,
				search_filters: FILTERS[provider].search,
			});

			// Delay for effect.
			setTimeout(function () {
				photoSearch.current.classList.remove(searchClass);
				photoTarget.current.classList.remove(loadingClass);
				isLoading = false;
			}, delay);
		} catch (error) {
			// Reset all search parameters.
			done.current = true;
			loading.current = false;
			show_search_filters = false;
			total_results = 0;
			photoSearch.current.classList.remove(searchClass);
			photoTarget.current.classList.remove(loadingClass);

			// Update Props.
			setState({ results: results });
			consoleStatus(provider, status);
		}
	}

	/**
	 * Get the initial set of photos for the current view (New/Popular/Filters/etc...).
	 *
	 * @param {string}  view     Current view.
	 * @param {Boolean} reset    Is this an app reset.
	 * @param {Boolean} switcher Is this a provider switch.
	 * @since 3.0
	 */
	async function getPhotos(view, reset = false, switcher = false) {
		if (loading.current && !reset) {
			// Exit if loading and not an app reset
			return;
		}
		setLoading();
		clearSearch();

		page = 1;
		orderby = view;

		// Build URL.
		const params = getQueryParams(provider, filters);
		const url = buildURL('photos', params);

		// Create fetch request.
		const response = await fetch(url);
		const { status, headers } = response;
		checkRateLimit(headers);

		// Status OK.
		try {
			const data = await response.json();
			const { error = null } = data; // Get error reporting.
			const images = getResults(data);
			checkTotalResults(images.length); // Check for returned data.
			api_error = error;

			// Set results state.
			if (!switcher) {
				setResults((prevState) => [...prevState, ...images]); // Push images into state.
			} else {
				setResults(images); // Push images into state.
			}
		} catch (error) {
			consoleStatus(provider, status);
			doneLoading();
		}

		// Delay loading animatons for effect.
		setTimeout(function () {
			photoTarget.current.classList.remove(loadingClass);
			isLoading = false;
		}, delay);
	}

	/**
	 * Load next set of photos in infinite scroll style.
	 *
	 * @since 3.0
	 */
	async function loadMorePhotos() {
		setLoading();
		page = parseInt(page) + 1;

		// Get search query.
		const search_query = is_search ? { term: search_term } : {};

		// Build URL.
		const type = is_search ? 'search' : 'photos';
		const filters = is_search ? search_filters : filters;
		const loadmore_params = {
			...{ page: page },
			...search_query,
			...filters,
		};
		const params = getQueryParams(provider, loadmore_params);
		const url = buildURL(type, params);

		// Create fetch request.
		const response = await fetch(url);
		const { status, headers } = response;
		checkRateLimit(headers);

		try {
			const data = await response.json();
			const images = getResults(data);
			checkTotalResults(images.length); // Check the total results.
			setResults((prevState) => [...prevState, ...images]); // Push images into state.
		} catch (error) {
			consoleStatus(provider, status);
			isLoading = false;
		}
	}

	/**
	 * Filter the photo listing.
	 *
	 * @param {string} filter The current filter key.
	 * @param {string} value  The value to filter.
	 */
	function filterPhotos(filter, value) {
		if ((filters[filter] && value === '#') || value === '' || value === 'all') {
			delete filters[filter];
		} else {
			filters[filter] = value;
		}
		getPhotos(view, true);
	}

	/**
	 * Filter the search results.
	 *
	 * @param {string} filter The current filter key.
	 * @param {string} value  The value to filter.
	 */
	function filterSearch(filter, value) {
		if ((search_filters[filter] && value === '#') || value === '' || value === 'all') {
			delete search_filters[filter];
		} else {
			search_filters[filter] = value;
		}
		doSearch(search_term);
	}

	/**
	 * Toggle the active state of all filters.
	 */
	function toggleFilters() {
		const filters = filterGroups.current.querySelectorAll('button.filter-dropdown--button');
		if (filters) {
			filters.forEach((button) => {
				button.disabled = is_search ? true : false;
			});
		}
		if (is_search) {
			filterGroups.current.classList.add('inactive');
		} else {
			filterGroups.current.classList.remove('inactive');
		}
	}

	/**
	 * Callback after activating and verififying an API key.
	 *
	 * @param {string} provider The verified provider.
	 * @since 4.5
	 */
	function afterVerifiedAPICallback(provider) {
		const button = providerNav.current.querySelector(`button[data-provider=${provider}]`);
		if (!button) {
			return;
		}
		setState({ api_lightbox: false }); // Close the lightbox.
		document.body.classList.remove('overflow-hidden');
		button.click();
	}

	/**
	 * Close the API Lightbox.
	 *
	 * @param {string} provider The previous provider.
	 */
	function closeAPILightbox(provider) {
		setState({ api_lightbox: false }); // Close the lightbox.
		document.body.classList.remove('overflow-hidden');

		// Set focus on previous provider button.
		const target = providerNav.current.querySelector(`button[data-provider=${provider}]`);
		if (target) {
			target.focus({ preventScroll: true });
		}
	}

	/**
	 * Toggles the service provider.
	 *
	 * @param {Event} e The clicked element event.
	 * @since 4.5
	 */
	async function switchProvider(e) {
		const target = e.currentTarget;
		const newProvider = target.dataset.provider;

		if (target.classList.contains('active')) {
			// Exit if already active.
			return;
		}

		// API Checker.
		// Bounce if API key for provider is invalid.
		if (API[newProvider].requires_key) {
			try {
				const response = await fetch(buildTestURL(newProvider));
				const { status, headers } = response;
				checkRateLimit(headers);

				if (status !== 200) {
					// Catch API errors and 401s.
					setState({ api_lightbox: newProvider }); // Show API Lightbox.
					document.body.classList.add('overflow-hidden');
					return;
				}
			} catch (error) {
				// Catch all other errors.
				setState({ api_lightbox: provider }); // Show API Lightbox.
				document.body.classList.add('overflow-hidden');
				return;
			}
		}

		// Update API provider params.
		provider = newProvider;
		setActiveProvider(newProvider);
		setState((prevState) => ({ ...prevState, provider }));

		api_provider = API[provider];
		api_key = instant_img_localize[`${provider}_app_id`];
		photo_api = api_provider?.photo_api;
		search_api = api_provider?.search_api;

		// Clear all filters.
		filters = {};
		search_filters = {};

		// Finally, fetch the photos.
		view = 'latest';
		getPhotos(view, true, true);
	}

	/**
	 * Renders the Masonry layout.
	 *
	 * @since 3.0
	 */
	function renderLayout() {
		if (is_block_editor) {
			return false;
		}
		const photoListWrapper = photoTarget.current;
		imagesLoaded(photoListWrapper, function () {
			msnry = new Masonry(photoListWrapper, {
				itemSelector: '.photo',
			});
			photoTarget.current.querySelectorAll('.photo').forEach((el) => {
				el.classList.add('in-view');
			});
		});
	}

	/**
	 * Scrolling function.
	 *
	 * @since 3.0
	 */
	function onScroll() {
		const wHeight = window.innerHeight;
		const scrollTop = window.pageYOffset;
		const scrollH = document.body.scrollHeight - 250;
		if (wHeight + scrollTop >= scrollH && !loading.current && !done.current) {
			loadMorePhotos();
		}
	}

	/**
	 * A checker to determine if there are remaining search results.
	 *
	 * @param {number} num Total search results.
	 * @since 3.0
	 */
	function checkTotalResults(num) {
		done.current = parseInt(num) === 0 || num === undefined ? true : false;
	}

	/**
	 * Finished loading.
	 */
	function doneLoading() {
		setTimeout(function () {
			// Delay to prevent loading to quickly.
			loading.current = false;
			plugin.classList.remove(loadingClass);
		}, 750);
	}

	/**
	 * Started loading.
	 */
	function setLoading() {
		loading.current = true;
		plugin.classList.add(loadingClass);
	}

	/**
	 * Show the tooltip.
	 *
	 * @param {Event} e The clicked element event.
	 * @since 4.3.0
	 */
	function showTooltip(e) {
		const target = e.currentTarget;
		const rect = target.getBoundingClientRect();
		let left = Math.round(rect.left);
		const top = Math.round(rect.top);
		const tooltip = plugin.querySelector('#tooltip');
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
			}, delay);
		}, 400);
	}

	/**
	 * Hide the tooltip.
	 *
	 * @since 4.3.0
	 */
	function hideTooltip() {
		clearInterval(tooltipInterval);
		const tooltip = plugin.querySelector('#tooltip');
		tooltip.classList.remove('over');
	}

	/**
	 * Test access to the REST API.
	 *
	 * @since 3.2
	 */
	function test() {
		const testURL = instant_img_localize.root + 'instant-images/test/'; // REST Route
		const restAPITest = new XMLHttpRequest();
		restAPITest.open('POST', testURL, true);
		restAPITest.setRequestHeader('X-WP-Nonce', instant_img_localize.nonce);
		restAPITest.setRequestHeader('Content-Type', 'application/json');
		restAPITest.send();
		restAPITest.onload = function () {
			if (restAPITest.status >= 200 && restAPITest.status < 400) {
				const response = JSON.parse(restAPITest.response);
				const success = response.success;
				if (!success) {
					setState({ restapi_error: true });
				}
			} else {
				// Error
				setState({ restapi_error: true });
			}
		};
		restAPITest.onerror = function (errorMsg) {
			console.warn(errorMsg);
			setState({ restapi_error: true });
		};
	}

	/**
	 * Escape handler to close edit windows on photos.
	 *
	 * @param {Event} e The key event.
	 */
	function escFunction(e) {
		const { key } = e;
		if (key === 'Escape') {
			const editing = photoTarget.current.querySelectorAll('.edit-screen.editing');
			if (editing) {
				[...editing].forEach((element) => {
					element && element.classList.remove('editing');
				});
			}
		}
	}

	// Results update.
	useEffect(() => {
		renderLayout();
		doneLoading();
	}, [results]);

	// Page load.
	useEffect(() => {
		setLoading();
		test();
		plugin.classList.remove(loadingClass);
		wrapper.classList.add('loaded');
		// Not Gutenberg and Media Popup add scroll listener.
		if (!is_block_editor && !is_media_router) {
			window.addEventListener('scroll', onScroll);
		}
		document.addEventListener('keydown', escFunction, false); // Add escape listener.
	}, []);

	return (
		<div id="photo-listing">
			<ProviderNav switchProvider={switchProvider} activeProvider={activeProvider} />

			{state.api_lightbox && (
				<APILightbox provider={state.api_lightbox} afterVerifiedAPICallback={afterVerifiedAPICallback} closeAPILightbox={closeAPILightbox} />
			)}

			<div className="control-nav" ref={controlNav}>
				<div className={classNames('control-nav--filters-wrap', api_error ? 'inactive' : null)} ref={filterGroups}>
					{!!Object.entries(state.filters)?.length && (
						<div className="control-nav--filters">
							{Object.entries(state.filters).map(([key, filter], i) => (
								<Filter key={`${key}-${provider}-${i}`} filterKey={key} provider={provider} data={filter} function={filterPhotos} />
							))}
						</div>
					)}
				</div>

				<div className={classNames('control-nav--search', 'search-field', api_error ? 'inactive' : null)} id="search-bar">
					<form onSubmit={(e) => search(e)} autoComplete="off">
						<label htmlFor="photo-search" className="offscreen">
							{instant_img_localize.search_label}
						</label>
						<input type="search" id="photo-search" placeholder={instant_img_localize.search} ref={photoSearch} disabled={api_error} />
						<button type="submit" id="photo-search-submit" disabled={api_error}>
							<i className="fa fa-search"></i>
						</button>
						<ResultsToolTip
							container={plugin}
							getPhotos={getPhotos}
							isSearch={is_search}
							total={total_results}
							title={`${total_results} ${instant_img_localize.search_results} ${search_term}`}
						/>
					</form>
				</div>
			</div>

			{state.restapi_error && <RestAPIError title={instant_img_localize.error_restapi} desc={instant_img_localize.error_restapi_desc} type="warning" />}

			{is_search && editor !== 'gutenberg' && (
				<div className="search-results-header">
					<h2>{search_term.replace('id:', 'ID: ')}</h2>
					<div className="search-results-header--text">
						{`${total_results} ${instant_img_localize.search_results}`} <strong>{`${search_term}`}</strong>
						{' - '}
						<button title={instant_img_localize.clear_search} onClick={() => getPhotos('latest')}>
							{instant_img_localize.clear_search}
						</button>
					</div>
					{show_search_filters && Object.entries(state.search_filters).length && (
						<div className="control-nav--filters-wrap">
							<div className="control-nav--filters">
								{Object.entries(state.search_filters).map(([key, filter], index) => (
									<Filter
										ref={(ref) => (filterRef[index] = ref)}
										key={`${key}-${index}`}
										filterKey={key}
										provider={provider}
										data={filter}
										function={filterSearch}
									/>
								))}
							</div>
						</div>
					)}
				</div>
			)}

			<div id="photos" className="photo-target" ref={photoTarget}>
				{!!results?.length &&
					results.map((result, index) => (
						<Fragment key={`${provider}-${result.id}-${index}`}>
							{result && result.type && result.type === 'instant-images-ad' ? (
								<Sponsor result={result} />
							) : (
								<Photo
									provider={provider}
									result={result}
									mediaRouter={is_media_router}
									blockEditor={is_block_editor}
									setFeaturedImage={setFeaturedImage}
									insertImage={insertImage}
									showTooltip={showTooltip}
									hideTooltip={hideTooltip}
								/>
							)}
						</Fragment>
					))}
			</div>
			{total_results < 1 && is_search === true && <NoResults total={total_results} is_search={is_search} />}
			<LoadingBlock />
			<LoadMore loadMorePhotos={loadMorePhotos} />
			<ErrorLightbox error={api_error} provider={provider} />
			<Tooltip />
		</div>
	);
}
