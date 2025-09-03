const express = require("express");
const routerUser = express.Router();

const controlUser = require("../controllers/controlUser.js");
const authUser = require("../middlewares/authUser.js");

routerUser.post("/create-user", controlUser.createNewUser);
routerUser.get("/all-users", authUser.userIsAuthentic, controlUser.getAllUsers);
routerUser.post("/update-user", authUser.userIsAuthentic, controlUser.updateUser);
routerUser.delete("/delete-user/:emailUser", controlUser.deleteUser);
routerUser.post("/login", authUser.createLogin);
routerUser.get("/get-user", authUser.userIsAuthentic, controlUser.getUser);
routerUser.get("/forget-password", authUser.forgetPassword);
routerUser.post("/activate-device", authUser.sendCodeValidateDevice);

module.exports = routerUser;
