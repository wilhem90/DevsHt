const express = require("express");
const routerUser = express.Router();
const controlUser = require("../controllers/controlUser.js");
const authUser = require("../middlewares/authUser.js");
routerUser.get("/all", authUser.userIsAuthentic, controlUser.getAllUsers);
routerUser.get("/get-user", controlUser.getUser);
routerUser.post("/create-user", controlUser.createNewUser);
routerUser.post("/auth-user", authUser.createLogin);
module.exports = routerUser;
