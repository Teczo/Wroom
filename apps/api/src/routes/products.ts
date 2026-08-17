import { productCreateSchema, productUpdateSchema } from '@wroom/shared';
import { Router } from 'express';

import * as controller from '../controllers/productController.js';
import { validateBody } from '../middleware/validate.js';

export const productsRouter: Router = Router();

productsRouter.get('/', controller.list);
productsRouter.post('/', validateBody(productCreateSchema), controller.create);
productsRouter.get('/:id', controller.get);
productsRouter.patch('/:id', validateBody(productUpdateSchema), controller.update);
productsRouter.delete('/:id', controller.remove);
