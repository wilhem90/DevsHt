const express = require("express");
const routerCentral = express.Router();
routerCentral.use("/users", require("./routers/routesUser.js"));
module.exports = routerCentral;
