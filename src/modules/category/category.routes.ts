import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import {
	createCategory,
	deleteCategory,
	listCategories,
	updateCategory,
} from './category.controller.js';
import {
	categoryIdParamsSchema,
	createCategoryBodySchema,
	listCategoriesQuerySchema,
	updateCategoryBodySchema,
} from './category.validation.js';

const categoryRouter = Router();

categoryRouter.use(requireAuth);
categoryRouter.get('/', validate({ query: listCategoriesQuerySchema }), listCategories);
categoryRouter.post('/', validate({ body: createCategoryBodySchema }), createCategory);
categoryRouter.patch(
	'/:id',
	validate({ params: categoryIdParamsSchema, body: updateCategoryBodySchema }),
	updateCategory,
);
categoryRouter.delete('/:id', validate({ params: categoryIdParamsSchema }), deleteCategory);

export default categoryRouter;
