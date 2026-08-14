import type { NextFunction, Request, Response } from 'express';
import multer, { MulterError } from 'multer';
import { limits } from '../../config/limits.js';
import { messages } from '../../config/messages.js';
import { AppError } from '../errors/AppError.js';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const avatarUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: limits.avatarUploadMaxBytes, files: 1 },
	fileFilter: (_req, file, cb) => {
		if (allowedMimeTypes.has(file.mimetype)) {
			cb(null, true);
			return;
		}
		cb(new AppError(messages.AVATAR_FILE_INVALID, 422));
	},
});

export function uploadAvatarImage(fieldName = 'avatar') {
	const handler = avatarUpload.single(fieldName);
	return (req: Request, res: Response, next: NextFunction): void => {
		handler(req, res, (err: unknown) => {
			if (!err) {
				next();
				return;
			}
			if (err instanceof MulterError) {
				if (err.code === 'LIMIT_FILE_SIZE') {
					next(new AppError(messages.AVATAR_FILE_TOO_LARGE, 413));
					return;
				}
				next(new AppError(messages.AVATAR_FILE_INVALID, 422));
				return;
			}
			next(err);
		});
	};
}
