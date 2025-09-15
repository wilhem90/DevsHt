const express = require("express");
const controlTopUp = require("../controllers/controlTopup.js");
const authUser = require("../middlewares/authUser.js");
const routerUser = express.Router();

routerUser.get("/countries", authUser.userIsAuthentic, controlTopUp.GetCountries)
routerUser.get("/providers", authUser.userIsAuthentic, controlTopUp.GetProviders)
routerUser.get("/products", authUser.userIsAuthentic, controlTopUp.GetProducts)
routerUser.post("/create-topup", authUser.userIsAuthentic, authUser.requireDeviceActive, controlTopUp.SendTransfer)
routerUser.get("/get-topups", controlTopUp.GetTopups)
module.exports = routerUser;
