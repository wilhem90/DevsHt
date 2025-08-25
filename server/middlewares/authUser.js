const jwt = require("jsonwebtoken");
const modelUser = require("../models/modelUser");
const { checkParams } = require("../validators/validateData");
const bcrypt = require("bcrypt");
require("dotenv").config();

const authUser = {
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

      // Checar se device já é conhecido
      const existingDevice = user?.lastLogins?.[deviceId];
      const isKnownDevice =
        existingDevice?.active &&
        existingDevice?.deviceName === deviceName;

      // Se não enviou senha e não for device conhecido → bloqueia
      if (!passwordUser && !isKnownDevice) {
        return res.status(401).json({
          success: false,
          message: "Credenciais inválidas!",
        });
      }

      // Se enviou senha mas ela não confere
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

      // Se o device já existe → mantém ativo se senha confere
      // Se for novo device → marca como inactive
      const deviceData = {
        ipUser,
        deviceName,
        createdAt: existingDevice?.createdAt || new Date(),
        updatedAt: new Date(),
        active: existingDevice ? (isMatch ? true : existingDevice.active) : false,
      };

      // Atualiza dados do usuário
      await modelUser.updateUser(user.idUser, {
        emailVerified: true,
        lastLogins: {
          ...user.lastLogins,
          [deviceId]: deviceData,
        },
      });

      // Se device ainda está inativo → não gera token
      if (!deviceData.active) {
        return res.status(403).json({
          success: false,
          message: "Novo dispositivo detectado. Ative este dispositivo para continuar.",
          deviceId,
        });
      }

      // Payload do JWT
      const payload = {
        idUser: user.idUser,
        emailUser: user.emailUser,
        roleUser: user.roleUser,
        ipUser,
        deviceId,
        deviceName,
      };

      // Cria token válido por 1h
      const expiresInSeconds = 60 * 60;
      const access_token = jwt.sign(payload, process.env.API_KEY_TOKEN, {
        expiresIn: expiresInSeconds,
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
};

module.exports = authUser;
