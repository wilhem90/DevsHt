const modelTopUp = require("../models/modelTopUp");
const modelUser = require("../models/modelUser");
const { requestDing } = require("../services/requestDing");

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

  SendTransfer: async (req, res) => {
    try {
      const idUser = req.user.idUser;
      const emailUser = req.user.emailUser;

      if (req.body.SendValue > 250) {
        return res.status(400).json({
          success: false,
          message: "Não pode enviar esse valor",
        });
      }
      // Gera ref única
      const DistributorRef = Math.random().toString(36).slice(2, 12);

      const dataValids = {};
      const requiredFields = [
        "SkuCode",
        "SendValue",
        "SendCurrencyIso",
        "AccountNumber",
        "ValidateOnly",
        "CountryName",
        "OperatorName",
        "ReceiveCurrencyIso",
        "TransactionType",
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
      dataValids.AccountNumber = String(dataValids.AccountNumber).replace(
        /\D/g,
        ""
      );
      dataValids.ValidateOnly = Boolean(dataValids.ValidateOnly);

      const LastSolde = req.user.soldeAccount || 0;
      const SendValue = Number(dataValids.SendValue);

      if (LastSolde < SendValue) {
        return res.status(400).json({
          success: false,
          message: "Saldo insuficiente.",
        });
      }

      const NewSolde = LastSolde - SendValue;

      // Atualiza saldo e salva extrato inicial
      await modelUser.updateUser(idUser, { soldeAccount: NewSolde });

      await modelUser.saveExtract({
        emailUser,
        TypeTransaction: "topup",
        AmountSended: SendValue,
        Status: "discounted",
        LastSolde,
        NewSolde,
        CurrencyIso: "BRL"
      });

      // Cria transação "pendente"
      const transactionRef = await modelTopUp.saveTopUp({
        ...dataValids,
        DistributorRef,
        Status: "pending",
        CreatedBy: emailUser,
      });

      // Chamada para Ding
      const data_transfer = await requestDing("SendTransfer", "POST", {
        DistributorRef: dataValids.AccountNumber, // Para evitar duplicação
        SkuCode: dataValids.SkuCode,
        SendValue,
        SendCurrencyIso: dataValids.SendCurrencyIso,
        AccountNumber: dataValids.AccountNumber,
        ValidateOnly: dataValids.ValidateOnly,
      });

      // Verifica se foi concluído
      const isCompletedTopUp =
        !dataValids.ValidateOnly &&
        data_transfer.TransferRecord?.TransferRef !== "0" &&
        data_transfer.TransferRecord?.ProcessingState === "Complete";

      const docId = transactionRef.idTopup;

      if (
        data_transfer.ResultCode !== 1 ||
        !isCompletedTopUp ||
        !data_transfer.success
      ) {
        // Atualiza topup como falhado
        await modelTopUp.updateTopUp(docId, {
          Status: "failed",
          ReceiveValue: 0,
        });

        // Devolve saldo ao usuário
        await modelUser.updateUser(idUser, { soldeAccount: LastSolde });

        await modelUser.saveExtract({
          emailUser,
          TypeTransaction: "topup",
          Status: "canceled",
          AmountSended: SendValue,
          LastSolde: NewSolde,
          NewSolde: LastSolde,
          CurrencyIso: "BRL"
        });

        throw new Error("Falha ao processar a transação. Tente novamente!");
      }

      // Atualiza topup como concluído
      await modelTopUp.updateTopUp(docId, {
        Status: "completed",
        ReceiveValue: data_transfer.TransferRecord?.Price.ReceiveValue || 0,
      });

      return res.status(200).json({
        success: true,
        message: "Transação processada com sucesso.",
        data: data_transfer,
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
