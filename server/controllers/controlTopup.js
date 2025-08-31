const modelTopUp = require("../models/modelTopUp.js");
const { requestDing } = require("../services/requestDing.js");
const sendEmail = require("../services/senderEmail.js");

// Control topup
const controlTopUp = {
  // Buscamos todos os paises
  GetCountries: async (req, res) => {
    try {
      const data_countries = await requestDing("GetCountries", "GET");
      return res.status(200).json({
        success: true,
        ...data_countries,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  //   Buscamos a operadora com o numero fornecido
  GetProviders: async (req, res) => {
    try {
      let { AccountNumber } = req.query;
      AccountNumber = AccountNumber.replace(/\D/g, "");
      const data_providers = await requestDing(
        `GetProviders?accountNumber=${AccountNumber}`,
        "GET"
      );
      return res.status(200).json({
        success: true,
        ...data_providers,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  //   Buscamos todos os produtos
  GetProducts: async (req, res) => {
    try {
      let { AccountNumber, ProviderCodes } = req.query;
      AccountNumber = AccountNumber.replace(/\D/g, "");
      const data_products = await requestDing(
        `GetProducts?accountNumber=${AccountNumber}&providerCodes=${ProviderCodes}`,
        "GET"
      );
      return res.status(200).json({
        success: true,
        ...data_products,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Enviar recarga
  SendTransfer: async (req, res) => {
    try {
      if (!req.user?.lastLogins[req.user?.deviceid]?.active) {
        return res.status(401).json({
          success: false,
          message: "Não está autorizado!",
        });
      }
      if (req.body.sendValue > 250) {
        return res.status(400).json({
          success: false,
          message: "Não pode enviar esse valor",
        });
      }

      const dataValids = {};
      const requiredFields = [
        "skuCode",
        "sendValue",
        "sendCurrencyIso",
        "accountNumber",
        "validateOnly",
        "countryName",
        "operatorName",
        "receiveCurrencyIso",
        "transactionType",
      ];

      // Validação de campos obrigatórios
      const fieldNotFound = requiredFields.filter(
        (field) => req.body[field] == null
      );

      if (fieldNotFound.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Faltando dados obrigatórios: ${fieldNotFound.join(", ")}`,
        });
      }

      // Preenche apenas campos válidos
      requiredFields.forEach((f) => (dataValids[f] = req.body[f]));

      // Remove caracteres não numéricos do AccountNumber
      dataValids.accountNumber = String(dataValids.accountNumber).replace(
        /\D/g,
        ""
      );

      dataValids.validateOnly = Boolean(dataValids.validateOnly);
      const lastSolde = req.user?.soldeAccount || 0;
      const sendValue = Number(dataValids.sendValue);
      const newSolde = lastSolde - sendValue;

      if (lastSolde < sendValue) {
        return res.status(400).json({
          success: false,
          message: "Saldo insuficiente.",
        });
      }

      const refTopUp = await modelTopUp.createTopUp(
        {
          ...dataValids,
          distributorRef: dataValids.accountNumber,
        },

        {
          ...req.user,
        }
      );

      console.log(refTopUp);

      // Enviar email
      await sendEmail.invoice(
        req.user.emailUser,
        req.user.firstName,
        sendValue,
        "✅ Recarga feita!",
        lastSolde,
        newSolde,
        new Date(),
        dataValids.accountNumber
      );

      return res.status(200).json({
        success: true,
        message: "Transação processada com sucesso.",
        data: refTopUp,
      });
    } catch (error) {
      console.error("Erro SendTransfer:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Erro interno. Tente novamente!",
      });
    }
  },
};

module.exports = controlTopUp;
