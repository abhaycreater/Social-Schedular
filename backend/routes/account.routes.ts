import { Router } from "express";
import { addAccounts, disconnectAccount, getAccounts } from "../controllers/Account.controller.js";
import protect from "../middleware/auth.middleware.js";

const accountsRoute = Router();

accountsRoute.get('/' , protect, getAccounts);

accountsRoute.post('/' , protect , addAccounts);

accountsRoute.delete('/:id' ,protect ,  disconnectAccount);

export default accountsRoute;