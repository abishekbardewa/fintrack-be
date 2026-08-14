import sharp from 'sharp';
import { limits } from '../../config/limits.js';

export type ProcessedImage = {
	buffer: Buffer;
	contentType: string;
	extension: string;
};

export async function toAvatarWebp(input: Buffer): Promise<ProcessedImage> {
	const buffer = await sharp(input)
		.rotate()
		.resize(limits.avatarSizePx, limits.avatarSizePx, {
			fit: 'cover',
			position: 'centre',
			withoutEnlargement: false,
		})
		.webp({ quality: limits.avatarWebpQuality })
		.toBuffer();

	return { buffer, contentType: 'image/webp', extension: 'webp' };
}
