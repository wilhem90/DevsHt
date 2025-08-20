const jwt = require("jsonwebtoken");
const modelUser = require("../models/modelUser");
const { checkParams } = require("../validators/validateDataUser");
const bcrypt = require("bcrypt");
const permitions = require("./permitions");
const { FieldValue } = require("firebase-admin/firestore");
require("dotenv").config();

const authUser = {
  createLogin: async (req, res) => {
    try {
      const { passwordUser, deviceId } = req.body;
      const { path, value } = checkParams(req.body);

      if (!passwordUser || !path || !value || !deviceId) {
        return res.status(400).json({
          success: false,
          message: "Verifique seus dados e tente novamente!",
        });
      }

      const user = await modelUser.getUser(path, value);
      if (!user?.success) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado!",
        });
      }

      // Comparar senha
      const isMatch = bcrypt.compareSync(passwordUser, user.passwordUser);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Senha incorreta!",
        });
      }

      // Pegar IP
      const ipUser =
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress;
      if (!ipUser) {
        return res.status(400).json({
          success: false,
          message: "Não conseguimos identificar seu IP!",
        });
      }

      console.log(user);

      const tokenRef = Date.now();

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
        tokenRef,
        accountNumber: user.accountNumber,
      };

    //   Guarda o deviceId do usuario
      if ((user.lastLogins).length < 4) {
        await modelUser.updateUser(user.idUser, {
          emailVerified: Boolean(true),
          lastLogins: FieldValue.arrayUnion(),
        });
      } else {
        throw new Error("Você deve remover alguns aparelho para continuar a conexão!")
      }
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
      });
    } catch (error) {
      console.log(error.message);
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
      const token = req.headers.authorization.split(" ")[1];
      console.log(token);
      if (!token) {
        return res.status(400).json({
          success: true,
          message: "Voce não esta autorizado!",
        });
      }
      const user = jwt.verify(token, process.env.API_KEY_TOKEN);
      console.log(user);
      permitions.isAdminUser(user);
      next();
    } catch (error) {
      console.log(error.message);
      return res
        .status(
          ["Não esta autorizado!", "invalid signature", "jwt expired"].includes(
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
