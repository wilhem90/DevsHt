const express = require("express")
const controlElottoHub = require("../controllers/controlElottoHub")
const routerElotto = express.Router()

routerElotto.post("/create-ticket", controlElottoHub.createTicket)

module.exports = routerElotto