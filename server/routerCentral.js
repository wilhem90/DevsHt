const express = require("express");
const routerCentral = express.Router();
routerCentral.use("/users", require("./routers/routesUser.js"));
routerCentral.use("/topup", require("./routers/routesTopup.js"));
routerCentral.use("/wallet", require("./routers/walletRoutes.js"));
module.exports = routerCentral;
