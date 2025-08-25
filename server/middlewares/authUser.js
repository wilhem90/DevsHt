const jwt = require("jsonwebtoken");
const modelUser = require("../models/modelUser");
const { checkParams } = require("../validators/validateData");
const bcrypt = require("bcrypt");
require("dotenv").config();

const authUser = {
  // criar login
   createLogin: async (req, res) => {
    try {
      const ipUser = req.ip || req.connection.remoteAddress;
      let { passwordUser, deviceId } = req.body;
      const deviceName = req.headers["user-agent"];
      const { path, value } = checkParams(req.body);

      if (!deviceId) {
        return res.status(400).json({
          success: false,
          message: "Precisa enviar o deviceId!",
        });
      }

      if (!path || !value) {
        return res.status(400).json({
          success: false,
          message: "Verifique seus dados e tente novamente!",
        });
      }

      // Buscar usuário
      const user = await modelUser.getUser(path, value);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado!",
        });
      }

      // Comparar senha
      const isMatch = passwordUser
        ? await bcrypt.compare(passwordUser, user.passwordUser)
        : false;

      if (!isMatch) {
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

      // Checar se device já é conhecido
      const existingDevice = user?.lastLogins?.[deviceId];

      // Se device ainda não existe → criar como inativo
      if (!existingDevice) {
        await modelUser.updateUser(user.idUser, {
          lastLogins: {
            ...user.lastLogins,
            [deviceId]: {
              ipUser,
              deviceName,
              createdAt: new Date(),
              updatedAt: new Date(),
              active: false, // 🔒 Sempre começa inativo
            },
          },
        });

        return res.status(403).json({
          success: false,
          message:
            "Novo dispositivo detectado. É necessário ativá-lo antes de continuar.",
          deviceId,
        });
      }

      // Se device existe mas está inativo → bloqueia também
      if (!existingDevice.active) {
        return res.status(403).json({
          success: false,
          message:
            "Este dispositivo ainda não foi ativado. Confirme o dispositivo para continuar.",
          deviceId,
        });
      }

      // Se device existe e está ativo → libera login
      const payload = {
        idUser: user.idUser,
        emailUser: user.emailUser,
        roleUser: user.roleUser,
        ipUser,
        deviceId,
        deviceName,
      };

      const expiresInSeconds = 60 * 60;
      const access_token = jwt.sign(payload, process.env.API_KEY_TOKEN, {
        expiresIn: expiresInSeconds,
      });

      // Atualiza updatedAt no device ativo
      await modelUser.updateUser(user.idUser, {
        lastLogins: {
          ...user.lastLogins,
          [deviceId]: {
            ...existingDevice,
            updatedAt: new Date(),
          },
        },
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
        expiresIn: expiresInSeconds,
      });
    } catch (error) {
      console.error("createLogin:", error.message);
      return res
        .status(["Não está autorizado!"].includes(error.message) ? 401 : 500)
        .json({
          success: false,
          message: error.message,
        });
    }
  },

  // Middleware: checa se usuário está autenticado
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

      // Verifica JWT
      const userDecoded = jwt.verify(token, process.env.API_KEY_TOKEN);

      // Busca usuário pelo email do token
      const userInfo = await modelUser.getUser(
        "emailUser",
        userDecoded?.emailUser
      );

      if (!userInfo?.idUser || !userInfo?.userAcitve) {
        throw new Error("Não está autorizado!");
      }

      // Injeta usuário no req
      req.user = userInfo;
      next();
    } catch (error) {
      console.error("userIsAuthentic:", error.message);
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
