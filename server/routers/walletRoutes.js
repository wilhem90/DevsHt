const express = require("express");
const walletController = require("../controllers/walletController.js");
const authUser = require("../middlewares/authUser");

const router = express.Router();

router.post("/funds", authUser.userIsAuthentic, walletController.addOrRemovefunds);
router.post("/withdraw",  authUser.userIsAuthentic, walletController.withdraw);
router.post("/transfer",  authUser.userIsAuthentic, walletController.transferFunds);
router.post("/deposit",  authUser.userIsAuthentic, walletController.depositToMyAccount);

module.exports = router;
