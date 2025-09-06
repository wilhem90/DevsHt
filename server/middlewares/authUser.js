const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config();

const modelUser = require("../models/modelUser.js");
const { checkParams } = require("../validators/validateData.js");
const sendEmail = require("../services/senderEmail.js");

const authUser = {
  // Criar login
  createLogin: async (req, res) => {
    try {
      const { path, value } = checkParams(req.body);
      const { passwordUser } = req.body;
      const { deviceid: deviceId } = req.headers;

      // Validação adicional

      if (!path || !value || !passwordUser || !deviceId) {
        console.log("Invalid login parameters!");
        return res.status(401).json({
          success: false,
          message: "Invalid login parameters.",
        });
      }

      const user = await modelUser.getUser(path, value);

      if (!user?.success) {
        console.log("User not found on createLogin!");
        return res.status(401).json({
          success: false,
          message: "User not found.",
        });
      }

      // Verifica a senha
      const passwordMatch = await bcrypt.compare(
        passwordUser,
        user.passwordUser
      );

      if (!passwordMatch) {
        console.log("Incorrect password on createLogin!");
        return res.status(401).json({
          success: false,
          message: "Incorrect password.",
        });
      }

      // Gera o token JWT
      const { expireAt } = req.body;
      const token = jwt.sign(
        {
          emailUser: user.emailUser,
          id: user.idUser,
          deviceId: req.headers.deviceid,
          firstNameUser: user.firstNameUser,
          lastNameUser: user.lastNameUser,
          countryUser: user.countryUser,
          currencyIso: user.currencyIso,
          userAcitve: user.userAcitve,
          roleUser: user.roleUser,
          phoneNumber: user.phoneNumber,
          cpfUser: user.cpfUser,
        },
        process.env.API_KEY_TOKEN,
        { expiresIn: expireAt || "1h" }
      );

      // Atualizar list de device
      await modelUser.updateUser(user.idUser, {
        lastLogins: {
          ...user.lastLogins,
          [deviceId]: {
            active: user.lastLogins[deviceId]?.active || false,
            updatedAt: new Date(),
            createdAt: new Date(),
          },
        },
        userAcitve: Boolean(true),
        forgetPassword: Boolean(false),
        emailVerified: Boolean(true),
      });

      // Retornamos token
      delete user.passwordUser;
      delete user.forgetPassword;

      return res.status(200).json({
        success: true,
        message: "Login successful.",
        token,
        userData: {
          firstNameUser: user.firstNameUser,
          lastNameUser: user.lastNameUser,
          emailUser: user.emailUser,
          countryUser: user.countryUser,
          currencyIso: user.currencyIso,
          userAcitve: user.userAcitve,
          roleUser: user.roleUser,
          phoneNumber: user.phoneNumber,
          cpfUser: user.cpfUser,
        },
      });
    } catch (error) {
      console.log("Error on createLogin:", error.message || "jwt expired");
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  },

  // Esqueci minha senha gerar um token
  forgetPassword: async (req, res) => {
    try {
      const { path, value } = checkParams(req.body);

      // Validação adicional
      if (!path || !value) {
        console.log("Invalid parameters for password recovery!");
        return res.status(400).json({
          success: false,
          message: "Invalid parameters for password recovery.",
        });
      }

      const user = await modelUser.getUser(path, value);
      if (!user?.success) {
        // Não revelar se o email existe ou não por questões de segurança
        console.log("User not found on forgetPassword!");
        return res.status(200).json({
          success: true,
          message:
            "If the email exists in our database, we will send recovery instructions.",
        });
      }

      // Token expira em 5 minutos
      const expiresInSeconds = 60 * 5;
      const tokenResetPassword = jwt.sign(
        {
          emailUser: user.emailUser,
          id: user.idUser,
        },
        process.env.API_KEY_TOKEN,
        { expiresIn: expiresInSeconds }
      );

      // Vamos deixar o doc do usuario em modo de esquece senha
      await modelUser.updateUser(user.idUser, {
        forgetPassword: true,
      });

      // Aqui você deveria enviar o email com o token
      sendEmail.resetPassword(
        emailUser,
        user?.firstNameUser,
        tokenResetPassword
      );

      return res.status(200).json({
        success: true,
        message: "Recovery instructions sent to your email.",
        expiresInSeconds,
      });

    } catch (error) {
      console.error("forgetPassword:", error.message);
      return res.status(500).json({
        success: false,
        message: "Something went wrong, please try again!",
      });
    }
  },

  // Se device existe mas está inativo
  activateDevice: async (req, res) => {
    const { deviceid: deviceId } = req.headers;
    const existingDevice = req.user?.lastLogins?.[deviceId];

    if (existingDevice.active) {
      return res.status(403).json({
        success: false,
        message: "This device is already activated.",
        deviceId,
      });
    }
    const codeValidation = String(
      Math.floor(100_000 + Math.random() * 900_000)
    );
    const minutesSinceLastUpdate =
      (Date.now() - Date.parse(existingDevice.updatedAt.toDate())) /
      (1000 * 60);

    // reenviar código caso já tenham passado 15min
    if (minutesSinceLastUpdate > 15) {
      // Corrigido: hash do código de verificação
      const hashedCode = await bcrypt.hash(codeValidation, 10);

      sendEmail.validateDevice(
        user.emailUser,
        user.firstNameUser,
        codeValidation
      );

      await modelUser.updateUser(user.idUser, {
        lastLogins: {
          ...user.lastLogins,
          [deviceId]: {
            ...user.lastLogins[deviceId],
            codeValidation: hashedCode,
            updatedAt: new Date(),
          },
        },
      });
    }

    return res.status(403).json({
      success: false,
      message:
        "This device has not been activated yet. Check your email to continue.",
      deviceId,
    });
  },

  // Middleware: checa se usuário está autenticado
  userIsAuthentic: async (req, res, next) => {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const payload = jwt.verify(token, process.env.API_KEY_TOKEN);
      
      const user = await modelUser.getUser("emailUser", payload.emailUser);
      if (!user?.success) {
        console.log("User not found on userIsAuthentic 1!");
        return res.status(401).json({
          success: false,
          message: "Not authorized!",
        });
      }

      // Addicionamos os dados do usuario no req
      req.user = user;
      const { deviceid: deviceId } = req.headers;
      if (!deviceId) {
        console.log("Device ID not found on userIsAuthentic 2!");
        return res.status(401).json({
          success: false,
          message: "Not authorized!",
        });
      }

      const existingDevice = user?.lastLogins?.[deviceId];
      if (!existingDevice || !user?.userAcitve) {
        console.log("Device not found or user not active on userIsAuthentic 3!");
        return res.status(401).json({
          success: false,
          message: existingDevice ? "User not active!" : "Device not found!",
        });
      }

      next();
    } catch (error) {
      console.log("Error on userIsAuthentic:", error.message || "jwt expired");
      return res.status(error.message === "jwt expired" ? 401 : 500).json({
        success: false,
        message:
          error.message === "jwt expired"
            ? "Token expired!"
            : "Not authorized!",
      });
    }
  },

  requireDeviceActive: async (req, res, next) => {
    try {
      const { deviceid: deviceId } = req.headers;
      const user = req.user;
      
      if (!user?.lastLogins?.[deviceId]?.active) {
        console.log("Device not active on requireDeviceActive!");
        return res.status(401).json({
          success: false,
          message: "Device not active!",
        });
      }

      next();
    } catch (error) {
      console.log("Error on requireDeviceActive:", error.message || "jwt expired");
      return res.status(500).json({
        success: false,
        message: "Not authorized!",
      });
    }
  },
};

module.exports = authUser;
