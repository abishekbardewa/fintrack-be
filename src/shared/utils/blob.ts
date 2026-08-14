import { del, put } from '@vercel/blob';
import { config } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { messages } from '../../config/messages.js';
import { AppError } from '../errors/AppError.js';

function requireToken(): string {
	const token = config.blob.readWriteToken;
	if (!token) {
		throw new AppError(messages.AVATAR_STORAGE_NOT_CONFIGURED, 503);
	}
	return token;
}

export async function uploadBlob(
	pathname: string,
	body: Buffer,
	contentType: string,
): Promise<string> {
	const token = requireToken();
	const { url } = await put(pathname, body, {
		access: 'public',
		contentType,
		addRandomSuffix: true,
		token,
	});
	return url;
}

export async function deleteBlobByUrl(url: string | null | undefined): Promise<void> {
	if (!url) {
		return;
	}
	const token = config.blob.readWriteToken;
	if (!token) {
		return;
	}
	try {
		await del(url, { token });
	} catch (error) {
		// A failed cleanup only leaks a small orphan file; never block the request.
		logger.warn('Failed to delete blob', { url, error });
	}
}
