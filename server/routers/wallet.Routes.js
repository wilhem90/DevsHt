const express = require("express");
const walletController = require("../controllers/walletController.js");
const authUser = require("../middlewares/authUser.js");

const router = express.Router();

router.post(
  "/funds",
  authUser.userIsAuthentic,
  authUser.requireDeviceActive,
  walletController.addOrRemovefunds
);
router.post(
  "/withdraw",
  authUser.userIsAuthentic,
  authUser.requireDeviceActive,
  walletController.withdrawFunds
);
router.post(
  "/transfer",
  authUser.userIsAuthentic,
  authUser.requireDeviceActive,
  walletController.transferFunds
);
router.post(
  "/deposit",
  authUser.userIsAuthentic,
  authUser.requireDeviceActive,
  walletController.depositToMyAccount
);

module.exports = router;
