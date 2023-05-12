<?php
/**
 * Uninstall Instant Images.
 *
 * Deletes all the plugin data.
 *  1. Plugin options/settings.
 *
 * @since 4.5
 * @package InstantImages
 */

// Exit if accessed directly.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// Delete options.
delete_option( INSTANT_IMAGES_SETTINGS );
delete_option( INSTANT_IMAGES_API_SETTINGS );
