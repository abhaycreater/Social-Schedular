import { Router } from "express";
import { addAccounts, disconnectAccount, getAccounts } from "../controllers/Account.controller.js";

const accountsRoute = Router();

accountsRoute.get('/' , getAccounts);

accountsRoute.post('/' , addAccounts);

accountsRoute.delete('/:id' , disconnectAccount);

export default accountsRoute;