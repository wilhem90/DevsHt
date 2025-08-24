const jwt = require("jsonwebtoken");
const modelUser = require("../models/modelUser");
const { checkParams } = require("../validators/validateData");
const bcrypt = require("bcrypt");
require("dotenv").config();

const authUser = {
  createLogin: async (req, res) => {
    try {
      // Pegar IP
      const ipUser = req.ip || req.connection.remoteAddress;
      let { passwordUser, deviceId, deviceName } = req.body;
      const { path, value } = checkParams(req.body);

      if ((!passwordUser && !deviceId) || !path || !value) {
        return res.status(400).json({
          success: false,
          message: "Verifique seus dados e tente novamente!"
        });
      }

      const user = await modelUser.getUser(path, value);
      if (user?.idUser === "") {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado!",
        });
      }

      // Comparar senha
      const isMatch = passwordUser
        ? bcrypt.compareSync(passwordUser, user.passwordUser)
        : false;

      const isContains = user?.lastLogins?.[deviceId] ? true : false;

      if (!passwordUser && !isContains) {
        return res.status(401).json({
          success: false,
          message: "Algo deu errado!",
        });
      }

      if (passwordUser && !isMatch) {
        return res.status(400).json({
          success: false,
          message: "Senha incorreta!",
        });
      }

      if (!ipUser) {
        return res.status(400).json({
          success: false,
          message: "Não conseguimos identificar seu IP!",
        });
      }

      deviceId = deviceId ? deviceId : Date.now();

      // Payload
      const payload = {
        countryUser: user.countryUser,
        currencyIso: user.currencyIso,
        emailUser: user.emailUser,
        firstNameUser: user.firstNameUser,
        lastNameUser: user.lastNameUser,
        phoneNumber: user.phoneNumber,
        roleUser: user.roleUser,
        userAcitve: user.userAcitve,
        cpfUser: user.cpfUser,
        ipUser,
        deviceId,
        deviceName: deviceName || req.headers["user-agent"],
        accountNumber: user.accountNumber,
      };

      //   Guarda o deviceId do usuario
      await modelUser.updateUser(user.idUser, {
        emailVerified: Boolean(true),
        lastLogins: {
          ...user.lastLogins,
          [deviceId]: {
            ipUser,
            deviceName: deviceName || req.headers["user-agent"],
            createdAt: new Date(),
            updatedAt: new Date(),
            active: Boolean(false),
          },
        },
      });

      // Criar JWT válido por 1h
      const access_token = jwt.sign(payload, process.env.API_KEY_TOKEN, {
        expiresIn: "1h",
      });

      return res.status(200).json({
        success: true,
        message: "Login realizado com sucesso!",
        token: access_token,
        user: {
          firstNameUser: user.firstNameUser,
          lastNameUser: user.lastNameUser,
          emailUser: user.emailUser,
          roleUser: user.roleUser,
          accountNumber: user.accountNumber,
        },
        expiresIn: new Date().setMinutes(59),
      });
    } catch (error) {
      console.log(error);
      return res
        .status(["Não esta autorizado!"].includes(error.message) ? 401 : 500)
        .json({
          success: false,
          message: error.message,
        });
    }
  },

  //   Check user is authorized
  userIsAuthentic: async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: "Token de autenticação não fornecido!",
        });
      }

      const token = authHeader.split(" ")[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Token inválido!",
        });
      }

      if (
        req.method === "POST" &&
        (!req.body || Object.keys(req.body).length === 0)
      ) {
        return res.status(400).json({
          success: false,
          message: "Nenhum dado foi enviado.",
        });
      }

      const userDecoded = jwt.verify(token, process.env.API_KEY_TOKEN);

      const userInfo = await modelUser.getUser(
        "emailUser",
        userDecoded?.emailUser
      );
      if (!userInfo?.idUser || !userInfo?.userAcitve) {
        throw new Error("Não está autorizado!");
      }

      req.user = userInfo;
      next();
    } catch (error) {
      console.log("userIsAuthentic:", error.message);
      return res
        .status(
          ["Não está autorizado!", "invalid signature", "jwt expired"].includes(
            error.message
          )
            ? 401
            : 500
        )
        .json({
          success: false,
          message: error.message,
        });
    }
  },
};

module.exports = authUser;
