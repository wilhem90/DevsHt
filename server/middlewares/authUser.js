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
      const ipUser = req.ip || req.connection?.remoteAddress;
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
      const user = await modelUser.getUser(
        path,
        value.toLowerCase().replace(/ /g, "")
      );

      if (!user?.success) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado!",
        });
      }

      // Comparar senha
      const isMatch = passwordUser
        ? bcrypt.compareSync(passwordUser, user.passwordUser)
        : false;

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Senha incorreta!",
        });
      }

      if (user.acountLocked) {
        return res.status(401).json({
          success: false,
          message: "A sua conta está bloqueada!",
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
        const codeValidation = String(
          Math.floor(100_000 + Math.random() * 900_000)
        );

        // Corrigido: hash do código de verificação
        const hashedCode = await bcrypt.hash(codeValidation, 10);

        sendEmail.alert(
          user.emailUser,
          user.firstNameUser,
          `Alguém tentou acessar sua conta.
          Se era você, precisa validar esse aparelho.
          <p> Código: <strong>${codeValidation}</strong></p>.
          Caso contrário, não se preocupe, sua conta continua protegida.
          Importante: nunca compartilhe sua senha ou seu <strong>PIN de transação</strong> com ninguém!`
        );

        await modelUser.updateUser(user.idUser, {
          lastLogins: {
            ...user.lastLogins,
            [deviceId]: {
              ipUser,
              deviceName,
              createdAt: new Date(),
              updatedAt: new Date(),
              active: false,
              codeValidation: hashedCode, // Armazenar o hash, não o código em texto puro
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

      // Se device existe e está ativo → libera login
      const payload = {
        idUser: user.idUser,
        emailUser: user.emailUser,
        roleUser: user.roleUser,
        ipUser,
        deviceId,
        deviceName,
      };

      const expiresInSeconds = 60 * 60 * 24; // 24h
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
          message: "Erro durante o login. Tente novamente.",
        });
    }
  },

  // Esqueci minha senha gerar um token
  forgetPassword: async (req, res) => {
    try {
      const { path, value } = checkParams(req.body);

      // Validação adicional
      if (!path || !value) {
        return res.status(400).json({
          success: false,
          message: "Parâmetros inválidos para recuperação de senha.",
        });
      }

      const isAccountExist = await modelUser.getUser(path, value);

      if (!isAccountExist?.success) {
        // Não revelar se o email existe ou não por questões de segurança
        return res.status(200).json({
          success: true,
          message:
            "Se o email existir em nossa base, enviaremos instruções de recuperação.",
        });
      }

      // Token expira em 5 minutos
      const expiresInSeconds = 60 * 5;
      const tokenResetPassword = jwt.sign(
        {
          emailUser: isAccountExist.emailUser,
          id: isAccountExist.idUser,
        },
        process.env.API_KEY_TOKEN,
        { expiresIn: expiresInSeconds }
      );

      await modelUser.updateUser(isAccountExist.idUser, {
        forgetPassword: true,
      });

      // Aqui você deveria enviar o email com o token
      // sendEmail.resetPassword(...)

      return res.status(200).json({
        success: true,
        message: "Instruções de recuperação enviadas para seu email.",
        expiresInSeconds,
      });
    } catch (error) {
      console.error("forgetPassword:", error.message);
      return res.status(500).json({
        success: false,
        message: "Algo deu errado, tente novamente!",
      });
    }
  },

  sendCodeValidateDevice: async (req, res) => {
    // Se device existe mas está inativo
    const { deviceid: deviceId  } = req.headers;
    const existingDevice = req.user?.lastLogins?.[deviceId];

    if (existingDevice.active) {
      return;
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

      sendEmail.alert(
        user.emailUser,
        user.firstNameUser,
        `Alguém tentou acessar sua conta.
            Se era você, precisa validar esse aparelho.
            <p> Código: <strong>${codeValidation}</strong></p>.
            Caso contrário, não se preocupe, sua conta continua protegida.
            Importante: nunca compartilhe sua senha ou seu <strong>PIN de transação</strong> com ninguém!`
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
        "Este dispositivo ainda não foi ativado. Confirme o dispositivo para continuar.",
      deviceId,
    });
  },

  // Middleware: checa se usuário está autenticado
  userIsAuthentic: async (req, res, next) => {
    try {
      const { authorization, deviceid } = req.headers;
      if (!authorization) {
        return res.status(401).json({
          success: false,
          message: "Token de autenticação não fornecido!",
        });
      }

      const token = authorization.split(" ")[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Token inválido!",
        });
      }

      if (!deviceid) {
        return res.status(400).json({
          success: false,
          message: "Precisa enviar o deviceId!",
        });
      }

      // Verifica JWT
      const userDecoded = jwt.verify(token, process.env.API_KEY_TOKEN);

      // Busca usuário
      const userInfo = await modelUser.getUser(
        "emailUser",
        userDecoded?.emailUser
      );

      if (!userInfo?.success) {
        return res.status(401).json({
          success: false,
          message: "Não está autorizado!",
        });
      }

      if (userInfo.acountLocked) {
        return res.status(401).json({
          success: false,
          message: "Conta está bloqueada!",
        });
      }

      // Verifica se o deviceId do token é o mesmo
      if (String(deviceid) !== String(userDecoded.deviceId)) {
        const message = "Por medida de segurança a sua conta está bloqueada!";
        await modelUser.updateUser(userDecoded.idUser, {
          acountLocked: true,
        });

        sendEmail.alert(userInfo.emailUser, userInfo.firstNameUser, message);

        return res.status(401).json({ success: false, message });
      }

      if (!userInfo.idUser) {
        return res.status(401).json({
          success: false,
          message: "Não está autorizado!",
        });
      }

      req.user = userInfo; // injeta usuário no req
      req.user.deviceid = deviceid;
      next();
    } catch (error) {
      console.error("userIsAuthentic:", error.message);

      // Mensagem genérica para não expor detalhes do erro
      const message =
        error.name === "TokenExpiredError"
          ? "Sessão expirada. Faça login novamente."
          : "Falha na autenticação. Tente novamente.";

      return res.status(401).json({
        success: false,
        message,
      });
    }
  },
};

module.exports = authUser;
