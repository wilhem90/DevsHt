const express = require("express");
const walletController = require("../controllers/walletController.js");
const authUser = require("../middlewares/authUser");

const router = express.Router();

router.post("/add", authUser.userIsAuthentic, walletController.addFunds);
router.post("/withdraw",  authUser.userIsAuthentic, walletController.withdraw);
router.post("/transfer",  authUser.userIsAuthentic, walletController.transferFunds);

module.exports = router;
