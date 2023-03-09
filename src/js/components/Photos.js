import { Fragment } from '@wordpress/element';
import Photo from './Photo';
import Sponsor from './Sponsor';

/**
 * Render the Photos component.
 *
 * @param {Object} props The component props.
 * @return {JSX.Element} The Photos component.
 */
export default function Photos(props) {
	const { results, provider, is_media_router, is_block_editor, setFeaturedImage, insertImage } = props;
	return (
		<Fragment>
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
							/>
						)}
					</Fragment>
				))}
		</Fragment>
	);
}
