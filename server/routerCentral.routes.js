const express = require("express");
const routerCentral = express.Router();

// Users
routerCentral.use("/users", require("./routers/user.Routes.js"));

// Recargas
routerCentral.use("/topup", require("./routers/topup.Routes.js"));

// Wallet
routerCentral.use("/wallet", require("./routers/wallet.Routes.js"));

// Loterias
routerCentral.use("/tickets", require("./routers/elottoHub.Routes.js"))

// Admins router
routerCentral.use("/admins", require("./routers/admin.Routes.js"))

// routerCentral.use("/winners", require("./elottoHub/lottoHub/winners/winnersNumbers.routes"))
module.exports = routerCentral;
