<?php
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly


/**
* instant_img_admin_menu
* Create admin menu item under 'Media'
*
* @since 2.0
*/

function instant_img_admin_menu() {
   $usplash_settings_page = add_submenu_page(
   	'upload.php',
   	INSTANT_IMG_TITLE,
   	INSTANT_IMG_TITLE,
   	apply_filters('instant_images_user_role', 'upload_files'),
   	INSTANT_IMG_NAME,
   	'instant_img_settings_page'
   );
   add_action( 'load-' . $usplash_settings_page, 'instant_img_load_scripts' ); //Add our admin scripts
}
add_action( 'admin_menu', 'instant_img_admin_menu' );



/**
* instant_img_post_enqueue_scripts
* Classic Editor Only - Add Instant Images scripts to post edit screens
*
* @since 4.3
*/
function instant_img_post_enqueue_scripts($hook) {
	
	// Confirm User Privileges
	if (!current_user_can( apply_filters('instant_images_user_role', 'upload_files') )){
		return false;	
	}
	
	// Exit if not post or edit screen
	if ( $hook !== 'post-new.php' && $hook !== 'post.php' ) {
		return false;
	}
	
	$suffix = ( defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ) ? '' : '.min';
	
	// CSS
	wp_enqueue_style( 'admin-instant-images', INSTANT_IMG_URL. 'dist/css/instant-images'. $suffix .'.css', '', INSTANT_IMAGES_VERSION );

	// JS
	wp_enqueue_script(
		'instant-images-media-router',
		INSTANT_IMG_URL. 'dist/js/instant-images-media'. $suffix .'.js',
		array( 'jquery'),
		INSTANT_IMAGES_VERSION,
		true
	);
	InstantImages::instant_img_localize( 'instant-images-media-router' );
		
}
add_action( 'admin_enqueue_scripts', 'instant_img_post_enqueue_scripts' );



/**
* instant_img_load_scripts
* Load Admin CSS and JS
*
* @since 1.0
*/

function instant_img_load_scripts(){
	add_action( 'admin_enqueue_scripts', 'instant_img_enqueue_scripts' );
}



/**
* instant_img_enqueue_scripts
* Admin Enqueue Scripts
*
* @since 2.0
*/

function instant_img_enqueue_scripts(){
	instant_img_scripts();
}



/**
* instant_img_scripts
* Localize vars and scripts
*
* @since 3.0
*/
function instant_img_scripts(){
   $suffix = ( defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ) ? '' : '.min'; // Use minified libraries if SCRIPT_DEBUG is turned off

	wp_enqueue_style('admin-instant-images', INSTANT_IMG_URL. 'dist/css/instant-images'. $suffix .'.css', '', INSTANT_IMAGES_VERSION);
   wp_enqueue_script('jquery');
   wp_enqueue_script('jquery-form', true);

   wp_enqueue_script('instant-images-react', INSTANT_IMG_URL. 'dist/js/instant-images'. $suffix .'.js', '', INSTANT_IMAGES_VERSION, true);
   wp_enqueue_script('instant-images', INSTANT_IMG_ADMIN_URL. 'assets/js/admin.js', 'jquery', INSTANT_IMAGES_VERSION, true);

   InstantImages::instant_img_localize();

}



/*
* instant_img_settings_page
* Settings page
*
* @since 2.0
*/

function instant_img_settings_page(){
	$show_settings = true;
   echo '<div class="instant-img-container" data-media-popup="false">';
      include( INSTANT_IMG_PATH . 'admin/views/unsplash.php');
   echo '</div>';
}



/*
* instant_img_filter_admin_footer_text
* Filter the WP Admin footer text
*
* @since 2.0
*/

function instant_img_filter_admin_footer_text( $text ) {
	$screen = get_current_screen();
	$base = 'media_page_'.INSTANT_IMG_NAME;
	if($screen->base === $base){
	   echo INSTANT_IMG_TITLE .' '.'is made with <span style="color: #e25555;">♥</span> by <a href="https://connekthq.com/?utm_source=WPAdmin&utm_medium=InstantImages&utm_campaign=Footer" target="_blank" style="font-weight: 500;">Connekt</a> | <a href="https://wordpress.org/support/plugin/instant-images/reviews/#new-post" target="_blank" style="font-weight: 500;">Leave a Review</a> | <a href="https://connekthq.com/plugins/instant-images/faqs/" target="_blank" style="font-weight: 500;">FAQs</a>';
	}
}
add_filter( 'admin_footer_text', 'instant_img_filter_admin_footer_text'); // Admin menu text

