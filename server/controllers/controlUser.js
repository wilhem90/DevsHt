const modelUser = require("../models/modelUser.js");
const bcrypt = require("bcrypt");

const controlUser = {
  // Criamos o usuario com unique email
  createNewUser: async (req, res) => {
    try {
      const dataReceived = req.body || {};
      const { cpfUser, firstNameUser, phoneNumber, lastNameUser, emailUser, countryUser, passwordUser } =
        dataReceived;
      if (!emailUser || !cpfUser) {
        return res.status(400).json({
          success: false,
          message: "Deve informar um email e um cpf valido.",
        });
      }

      const isExistUser =
        (await modelUser.getUser("emailUser", emailUser.toLowerCase()))?.data.length + (await modelUser.getUser("cpfUser", cpfUser.replace(/[. -]/g, "")))?.data.length


        console.log(isExistUser);

      if (isExistUser > 0) {
        return res.status(400).json({
          success: false,
          message: "Usuario já existiu no sistema!",
        });
      }
      const datosRequired = [
        "cpfUser",
        "firstNameUser",
        "lastNameUser",
        "emailUser",
        "phoneNumber",
        "countryUser",
        "passwordUser",
      ];

      const errors = [];

      datosRequired.forEach((key) => {
        if (
          req.body[key] === "" ||
          !dataReceived[key] ||
          typeof dataReceived[key] !== "string"
        ) {
          console.log(key);
          errors.push(key);
        }
      });
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Deve informar todos os dados. Conferir os dados: [${errors}]`,
        });
      }
      const newUserData = {
        countryUser: countryUser.toLowerCase(),
        currencyIso: "",
        emailUser: emailUser.toLowerCase(),
        emailVerified: Boolean(false),
        firstNameUser: firstNameUser.toLowerCase(),
        lastNameUser: lastNameUser.toLowerCase(),
        passwordUser: bcrypt.hashSync(passwordUser, 8),
        phoneNumber,
        roleUser: "client",
        soldeAccount: parseFloat("0.00"),
        userAcitve: Boolean(false),
        cpfUser: cpfUser.replace(/[. -]/g, ""),
        lastLogins: {}
      };


      console.log(newUserData);

      const refUserCreated = await modelUser.createUser({
        ...newUserData,
      });

      if (!refUserCreated.success) {
        throw new Error(refUserCreated.message);
      }

      return res.status(201).json({
        success: true,
        message: "Criado com suceso!",
      });
    } catch (error) {
      console.log("Error na criacao controlUser.createNewUser");
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Buscamos todos os usuarios
  getAllUsers: async (req, res) => {
    const data = modelUser.getUsers();
    return res.status(200).json({
      success: true,
      data,
    });
  },

  // Buscamos o usuario com: emailUser || accountNumber || cpfUser
  getUser: async (req, res) => {
    const { emailUser, accountNumber, cpfUser } = req.params;

    if (!emailUser && !accountNumber && !cpfUser) {
      return res.status(400).json({
        success: false,
        message:
          "Deve informar o: emailUser ou accountNumber ou cpfUser valido!",
      });
    }
    const path = emailUser
      ? "emailUser"
      : accountNumber
      ? "accountNumber"
      : "cpfUser";
    const value = req.params[path];
    console.log(path, value);

    const userData = await modelUser.getUser(path, value);
    return res.status(200).json({
      success: true,
      data: userData || [],
    });
  },
};
module.exports = controlUser;
