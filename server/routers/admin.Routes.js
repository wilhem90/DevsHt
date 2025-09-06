const controlUser = require('../controllers/controlUser');
const permitions = require('../middlewares/admins');
const authUser = require('../middlewares/authUser');

const routerAdmin = require('express').Router();

routerAdmin.get("/my-users", authUser.userIsAuthentic, authUser.requireDeviceActive, permitions.isAdminUser, controlUser.getAllUsers)

module.exports = routerAdmin;