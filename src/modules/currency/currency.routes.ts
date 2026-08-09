import { Router } from 'express';
import { listCurrencies } from './currency.controller.js';

const currencyRouter = Router();

currencyRouter.get('/', listCurrencies);

export default currencyRouter;
