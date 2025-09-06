const express = require("express");
const routerUser = express.Router();

const controlUser = require("../controllers/controlUser.js");
const authUser = require("../middlewares/authUser.js");

routerUser.post("/create-user", controlUser.createNewUser);
routerUser.get(
  "/all-users",
  authUser.userIsAuthentic,
  authUser.requireDeviceActive,
  controlUser.getAllUsers
);
routerUser.post(
  "/update-user",
  authUser.userIsAuthentic,
  authUser.requireDeviceActive,
  controlUser.updateUser
);
routerUser.delete(
  "/delete-user/:emailUser",
  authUser.userIsAuthentic,
  authUser.requireDeviceActive,
  controlUser.deleteUser
);
routerUser.post("/login", authUser.createLogin);
routerUser.get(
  "/get-user",
  authUser.userIsAuthentic,
  authUser.requireDeviceActive,
  controlUser.getUser
);

routerUser.get("/forget-password", authUser.forgetPassword);
routerUser.post("/activate-device", authUser.activateDevice);

module.exports = routerUser;
