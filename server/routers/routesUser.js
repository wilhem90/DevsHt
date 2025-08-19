const express = require("express");
const routerUser = express.Router();
const controlUser = require("../controllers/controlUser.js");
routerUser.get("/all", controlUser.getAllUsers);
routerUser.get("/:emailUser", controlUser.getUser);
routerUser.post("/create-user", controlUser.createNewUser);
module.exports = routerUser;
