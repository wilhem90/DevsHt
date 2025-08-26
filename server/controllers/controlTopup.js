const modelTopUp = require("../models/modelTopUp");
const modelUser = require("../models/modelUser");
const { requestDing } = require("../services/requestDing");
const sendEmail = require("../services/senderEmail");

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
      const idUser = req.user.idUser;
      const emailUser = req.user.emailUser;

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
      const lastSolde = req.user.soldeAccount || 0;
      const sendValue = Number(dataValids.sendValue);

      if (lastSolde < sendValue) {
        return res.status(400).json({
          success: false,
          message: "Saldo insuficiente.",
        });
      }

      const newSolde = lastSolde - sendValue;
      // Gera ref única
      const distributorRef = dataValids.accountNumber;

      // Atualiza saldo e salva extrato inicial
      await modelUser.updateUser(idUser, { soldeAccount: newSolde });

      // Guarda a transaction
      const refExtract = await modelUser.saveExtract(idUser, null, {
        emailUser,
        typeTransaction: "topup",
        amountSended: sendValue,
        status: "completed",
        lastSolde,
        newSolde,
        currencyIso: "BRL",
      });

      // Cria transação "pendente"
      await modelTopUp.saveTopUp(idUser, refExtract.idExtract, {
        ...dataValids,
        distributorRef,
        status: "pending",
        createdBy: emailUser,
      });

      // Chamada para Ding
      const data_transfer = await requestDing("SendTransfer", "POST", {
        DistributorRef: distributorRef, // Para evitar duplicação
        SkuCode: dataValids.skuCode,
        SendValue: sendValue,
        SendCurrencyIso: dataValids.sendCurrencyIso,
        AccountNumber: dataValids.accountNumber,
        ValidateOnly: dataValids.validateOnly,
      });

      // Verifica se foi concluído
      const isCompletedTopUp =
        !dataValids.validateOnly &&
        data_transfer.TransferRecord?.TransferRef !== "0" &&
        data_transfer.TransferRecord?.ProcessingState === "Complete";

      if (
        data_transfer.ResultCode !== 1
        //  ||
        // !isCompletedTopUp ||
        // !data_transfer.success
      ) {
        // Atualiza topup como falhado
        await modelTopUp.updateTopUp(idUser, refExtract.idExtract, {
          status: "failed",
          receiveValue: 0,
        });

        // Devolve saldo ao usuário
        await modelUser.updateUser(idUser, { soldeAccount: lastSolde });

        // Update topup
        await modelUser.saveExtract(idUser, refExtract.idExtract, {
          emailUser,
          typeTransaction: "refund",
          status: "canceled",
          amountSended: sendValue,
          lastSolde: newSolde,
          newSolde: lastSolde,
          currencyIso: "BRL",
        });

        throw new Error("Falha ao processar a transação. Tente novamente!");
      }

      // Atualiza topup como concluído
      await modelTopUp.updateTopUp(idUser, refExtract.idExtract, {
        status: "completed",
        receiveValue: data_transfer.TransferRecord?.Price.ReceiveValue || 0,
      });

      // Enviar email
      sendEmail("alert", emailUser, {
        subject: "✅ Recarga feita!",
        title: `Muito bem, <h3>${req.user?.firstName || "Dear"}</h3>`,
        message: `Tudo certo com sua recarga de celular. Dá só uma olhada. 😉
${dataValids.accountNumber}
R$${dataValids.sendValue},00`,
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
