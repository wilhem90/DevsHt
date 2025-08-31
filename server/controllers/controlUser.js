const modelUser = require("../models/modelUser.js");
const bcrypt = require("bcrypt");
const { checkParams } = require("../validators/validateData.js");
const permitions = require("../middlewares/permitions.js");

const controlUser = {
  // Criamos o usuario com unique email
  createNewUser: async (req, res) => {
    try {
      const dataReceived = req.body || {};
      const {
        cpfUser,
        firstNameUser,
        phoneNumber,
        lastNameUser,
        emailUser,
        countryUser,
        passwordUser,
        pinTransaction,
      } = dataReceived;

      if (!emailUser || !cpfUser) {
        return res.status(400).json({
          success: false,
          message: "Deve informar um email e um CPF válido.",
        });
      }

      // Normaliza valores
      const normalizedEmail = emailUser.replace(/ /g, "").toLowerCase();

      const normalizedCpf = cpfUser.replace(/[.\s-]/g, "");

      // Verifica duplicidade
      const userByEmail = await modelUser.getUser("emailUser", normalizedEmail);
      const userByCpf = await modelUser.getUser("cpfUser", normalizedCpf);

      if (userByEmail?.idUser || userByCpf?.idUser) {
        return res.status(400).json({
          success: false,
          message: "Usuário já existe no sistema!",
        });
      }

      // Valida campos obrigatórios
      const requiredFields = [
        "cpfUser",
        "firstNameUser",
        "lastNameUser",
        "emailUser",
        "phoneNumber",
        "countryUser",
        "passwordUser",
        "pinTransaction",
      ];

      const missingFields = requiredFields.filter(
        (key) =>
          !dataReceived[key] ||
          typeof dataReceived[key] !== "string" ||
          dataReceived[key].trim() === ""
      );

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Campos obrigatórios faltando: [${missingFields}]`,
        });
      }

      // PIN mínimo de 4 dígitos
      if (pinTransaction.length < 4) {
        return res.status(400).json({
          success: false,
          message: `O PIN deve ter no mínimo 4 dígitos.`,
        });
      }

      // Monta objeto do usuário
      const newUserData = {
        countryUser: countryUser.toLowerCase(),
        currencyIso: "BRL",
        emailUser: normalizedEmail,
        emailVerified: false,
        firstNameUser: firstNameUser.toLowerCase(),
        lastNameUser: lastNameUser.toLowerCase(),
        passwordUser: await bcrypt.hash(passwordUser, 10),
        pinTransaction: await bcrypt.hash(pinTransaction, 10),
        phoneNumber,
        roleUser: "client",
        soldeAccount: 0.0,
        userAcitve: false,
        cpfUser: normalizedCpf,
        lastLogins: [],
        admins: [],
        managers: [],
      };

      const refUserCreated = await modelUser.createUser(newUserData);
      if (!refUserCreated.success) {
        throw new Error(refUserCreated.message);
      }

      return res.status(201).json({
        success: true,
        message: "Usuário criado com sucesso!",
      });
    } catch (error) {
      console.error("Erro na criação controlUser.createNewUser:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  updateUser: async (req, res) => {
    try {
      const { emailUser } = req.body;

      // Bloqueia client que tenta alterar outro usuário
      if (emailUser !== req.user.emailUser && req.user.roleUser === "client") {
        return res.status(401).json({
          success: false,
          message: "Não está autorizado para essa ação.",
        });
      }

      // Campos permitidos
      const dataValids = [
        "cpfUser",
        "firstNameUser",
        "lastNameUser",
        "phoneNumber",
        "countryUser",
        "passwordUser",
        "pinTransaction",
        "lastLogins",
        "permissions",
        "roleUser",
        "admins",
        "managers",
        "userAcitve",
        "soldeAccount",
        "emailUser",
        "codeValidation",
      ];

      // Valida se mandou algo fora da lista
      const invalidData = Object.keys(req.body).some(
        (key) => !dataValids.includes(key)
      );

      if (invalidData) {
        return res.status(400).json({
          success: false,
          message: "Alguns dados não são permitidos para atualização.",
        });
      }

      // Caso especial: lastLogins
      const { lastLogins } = req.body;
      const refUser = await modelUser.getUser(path, value);
      if (lastLogins) {
        if (
          typeof lastLogins !== "object" ||
          !["remove", "add"].includes(lastLogins.op)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "lastLogins deve ser um objeto com op (remove/add) e tokenRef.",
          });
        }

        if (lastLogins.op === "add") {
          const isMatchCode = bcrypt.compareSync(
            data.codeValidation,
            refUser.lastLogins[deviceId]?.codeValidation
          );
          if (!isMatchCode) {
            return res.status(400).json({
              success: false,
              message: "Deve enviar o codigo de validação.",
            });
          }

          data.lastLogins = {
            ...refUser.lastLogins,
            [deviceId]: {
              active: Boolean(true),
              updatedAt: new Date(),
            },
          };
        }

        if (lastLogins.op === "remove") {
          delete refUser.lastLogins[deviceId];
          data.lastLogins = {
            ...refUser.lastLogins,
          };
        }
      }

      // Localiza usuário que vai ser atualizado
      const data = req.body;
      const { path, value } = checkParams({
        ...data,
        role: req?.user?.roleUser,
      });

      if (!refUser.idUser) {
        return res.status(400).json({
          success: false,
          message:
            "Usuário não encontrado ou sem permissão para completar essa ação!",
        });
      }

      // Criptografa senha caso venha passwordUser
      if (data.passwordUser) {
        const salt = await bcrypt.genSalt(10);
        data.passwordUser = await bcrypt.hash(data.passwordUser, salt);
      }

      // Criptografa pinTransaction caso venha
      if (data.pinTransaction) {
        const salt = await bcrypt.genSalt(10);
        data.pinTransaction = await bcrypt.hash(data.pinTransaction, salt);
      }

      // Atualiza no banco
      const responseUpdated = await modelUser.updateUser(refUser.idUser, data);
      if (!responseUpdated.success) {
        return res.status(400).json({
          success: false,
          message: responseUpdated.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Dados atualizados com sucesso!",
      });
    } catch (error) {
      console.log("Erro em controlUser.updateUser:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Buscamos o usuario com: emailUser || accountNumber || cpfUser
  getUser: async (req, res) => {
    try {
      const data = req.query;
      const { path, value } = checkParams({
        ...data,
        role: req?.user?.roleUser,
      });
      const emailUser = req?.user?.emailUser;

      const userData = await modelUser.getUser(
        path,
        value,
        req.user.roleUser,
        emailUser
      );

      if (userData?.idUser) {
        delete userData.passwordUser;
        delete userData.pinTransaction;
      }

      return res.status(200).json({
        success: !userData?.message,
        user: userData?.message ? [] : userData,
      });
    } catch (error) {
      console.error("Erro no controlUser.getUser:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Buscamos todos os usuarios
  getAllUsers: async (req, res) => {
    try {
      permitions.isAdminUser(req.user);
      const emails = req.query.emailUser;

      const permitidos = [];

      await Promise.all(
        emails.map(async (email) => {
          const data = await modelUser.getUser(
            "emailUser",
            email,
            req.user?.roleUser,
            req.user?.emailUser
          );
          if (!data?.idUser) {
            return;
          }
          delete userData.passwordUser;
          delete userData.pinTransaction;
          permitidos.push({ ...data });
        })
      );

      return res.status(200).json({
        success: true,
        users: permitidos || [],
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  // Para deletar usuario
  deleteUser: async (req, res) => {
    try {
      const { emailUser } = req.params;
      if (!emailUser) {
        return res.status(400).json({
          success: false,
          message: "Nenhum email foi informado.",
        });
      }

      const userDeleted = await modelUser.deleteUser(emailUser);
      if (userDeleted.success === false) {
        return res.status(400).json({
          success: false,
          message: "Usuario não encontrado.",
        });
      }

      return res.status(200).json({
        success: false,
        message: "Usuario deletado com successo.",
      });
    } catch (error) {
      console.log("Error esta no controlUser: ", error.message);
      return res.status(500).json({
        success: false,
        message: "Alguma coisa deu errado por favor tente mais tarde.",
      });
    }
  },
};
module.exports = controlUser;
