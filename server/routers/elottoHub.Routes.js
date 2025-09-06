const express = require("express");
const controlElottoHub = require("../controllers/controlElottoHub");
const authUser = require("../middlewares/authUser");
const routerElotto = express.Router();

routerElotto.post(
  "/create-ticket",
  authUser.userIsAuthentic,
  authUser.requireDeviceActive,
  controlElottoHub.createTicket
);
routerElotto.put(
  "/update-ticket",
  authUser.userIsAuthentic,
  authUser.requireDeviceActive,
  controlElottoHub.updateTicket
);

module.exports = routerElotto;
