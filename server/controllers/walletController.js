// controllers/walletController.js
const modelUser = require("../models/modelUser");
const bcrypt = require("bcrypt");
const sendEmail = require("../services/senderEmail");

const walletController = {
  //    Adicionar saldo para um usuário Somente manager pode adicionar
  addOrRemovefunds: async (req, res) => {
    try {
      const { accountNumber, amount, action, pinTransaction, refDeposit } =
        req.body;
      const emailUser = req.user.emailUser;

      // if (
      //   req.user.roleUser !== "manager" ||
      //   req.user.accountNumber === accountNumber
      // ) {
      //   return res.status(403).json({
      //     success: false,
      //     message: "Não está autorizado.",
      //   });
      // }

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valor inválido.",
        });
      }

      if (!["add", "remove", "confirm-deposit"].includes(action)) {
        return res.status(400).json({
          success: false,
          message: "Ação inválida. Use 'add', 'confirm-deposit' ou 'remove'.",
        });
      }

      const targetUser = await modelUser.getUser(
        "accountNumber",
        accountNumber
      );

      const userLogged = await modelUser.getUser(
        "accountNumber",
        req.user.accountNumber
      );

      if (!targetUser.success) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado.",
        });
      }
      const idUser = targetUser.idUser;
      const lastSolde = targetUser.soldeAccount || 0;
      const newSolde =
        action === "remove"
          ? lastSolde - amount
          : action === "add"
          ? lastSolde + amount
          : action === "confirm-deposit"
          ? lastSolde + amount
          : lastSolde;

      if (
        action === "confirm-deposit" &&
        (refDeposit === undefined || !refDeposit)
      ) {
        return res.status(400).json({
          success: false,
          message: "Deve enviar a referencia do deposito!",
        });
      }

      if (!pinTransaction) {
        return res.status(400).json({
          success: false,
          message: "Deve informar o seu pin para finalizar a transação.",
        });
      }

      const ispinTransactionMatch = bcrypt.compareSync(
        pinTransaction,
        userLogged.pinTransaction
      );

      if (!ispinTransactionMatch) {
        return res.status(400).json({
          success: false,
          message: "Pin transação não valido.",
        });
      }

      await modelUser.updateUser(idUser, { soldeAccount: newSolde });
      await modelUser.saveExtract(idUser, refDeposit, {
        toUser: targetUser.emailUser,
        typeTransaction: action,
        status: "completed",
        amount,
        lastSolde,
        newSolde,
        createdBy: emailUser,
      });

      const message =
        action === "remove"
          ? "O valor foi retirado com sucesso."
          : "Saldo adicionado com sucesso.";

      sendEmail("alert", targetUser.emailUser, {
        message: `${message} <p>Valor: R$ ${amount},00</p> <p>Saldo antes: ${lastSolde}</p> <p>Novo saldo: ${newSolde}</p> <p>Date: ${new Date()}</p>`,
      });

      return res.status(200).json({
        success: true,
        message,
        lastSolde,
        newSolde,
        amount,
        currencyIso: "BRL",
      });
    } catch (error) {
      console.error("Erro addFunds:", error);
      return res.status(500).json({
        success: false,
        message: "Erro interno.",
      });
    }
  },

  // Depositar valor na sua conta
  depositToMyAccount: async (req, res) => {
    try {
      const { amount, method } = req.body;
      const userInfo = req.user; // precisa estar no token

      // Valida método de pagamento
      if (!method || !["PIX"].includes(method)) {
        return res.status(400).json({
          success: false,
          message: "Deve enviar um método válido. Ex: PIX",
        });
      }

      // Valida valor
      if (!amount || amount < 5) {
        return res.status(400).json({
          success: false,
          message: "Valor mínimo para depósito é R$5,00.",
        });
      }

      // Cria o registro no extrato
      const depositRef = await modelUser.saveExtract(userInfo.idUser, null, {
        createdBy: userInfo.emailUser,
        cpfUser: userInfo.cpfUser,
        phoneUser: userInfo.phoneNumber,
        fullName: `${userInfo.firstNameUser} ${userInfo.lastNameUser}`,
        amount,
        method,
        type: "deposit",
        status: "pending", // aguardando confirmação
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return res.status(201).json({
        success: true,
        message: "Depósito criado com sucesso! Aguarde confirmação.",
        depositId: depositRef.id, // se quiser retornar
      });
    } catch (error) {
      console.error("depositToMyAccount:", error);
      return res.status(500).json({
        success: false,
        message: "Alguma coisa deu errado, tente mais tarde.",
      });
    }
  },

  // Saque de saldo do próprio usuário
  withdraw: async (req, res) => {
    try {
      const { amount, method, destination } = req.body;
      const emailUser = req.user.emailUser;

      // Validações básicas
      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valor inválido.",
        });
      }

      if (!method || !["PIX", "TED"].includes(method)) {
        return res.status(400).json({
          success: false,
          message: "Método de saque inválido. Use 'PIX', 'TED'.",
        });
      }

      if (!destination || destination.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Informe o destino da transação.",
        });
      }

      const lastSolde = req.user.soldeAccount || 0;
      if (lastSolde < amount) {
        return res.status(400).json({
          success: false,
          message: "Saldo insuficiente.",
          soldeAccount: lastSolde,
          CurrencyIso: "BRL",
        });
      }

      const userLogged = await modelUser.getUser(
        "accountNumber",
        req.user.accountNumber
      );

      const ispinTransactionMatch = bcrypt.compare(
        pinTransaction,
        userLogged.pinTransaction
      );
      if (!pinTransaction || !ispinTransactionMatch) {
        throw new Error("Pin transação não valido.");
      }
      // Atualiza saldo do usuário
      const idUser = req.user.idUser;
      const newSolde = lastSolde - amount;
      const updated = await modelUser.updateUser(idUser, {
        soldeAccount: newSolde,
      });

      if (!updated.success) {
        throw new Error("Error do servidor, tente novamente!");
      }
      // Salva extrato
      await modelUser.saveExtract({
        fromUser: emailUser,
        typeTransaction: "withdraw",
        status: "pending", // mantém pendente até confirmação do processamento
        amount,
        lastSolde,
        newSolde,
        method,
        destination,
        currencyIso: "BRL",
      });

      return res.status(200).json({
        success: true,
        message: "Saque registrado com sucesso, aguardando processamento.",
        amount,
        lastSolde,
        newSolde,
        method,
        destination,
        currencyIso: "BRL",
      });
    } catch (error) {
      console.error("Erro withdraw:", error);
      return res.status(500).json({
        success: false,
        message: "Erro interno.",
      });
    }
  },

  //Transferência de saldo entre usuários
  transferFunds: async (req, res) => {
    try {
      const { accountNumber, amount } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valor inválido.",
        });
      }

      if (req.user.accountNumber === accountNumber) {
        return res.status(400).json({
          success: false,
          message: "Não é possível transferir para si mesmo.",
        });
      }

      const userLogged = await modelUser.getUser(
        "accountNumber",
        req.user.accountNumber
      );

      const ispinTransactionMatch = bcrypt.compare(
        pinTransaction,
        userLogged.pinTransaction
      );
      if (!pinTransaction || !ispinTransactionMatch) {
        throw new Error("Pin transação não valido.");
      }

      const receiver = await modelUser.getUser("accountNumber", accountNumber);

      if (!receiver.success) {
        return res.status(404).json({
          success: false,
          message: "Destinatário não encontrado.",
        });
      }

      if (userLogged.soldeAccount < amount) {
        return res.status(400).json({
          success: false,
          message: "Saldo insuficiente.",
          soldeAccount: userLogged.soldeAccount,
          currencyIso: "BRL",
        });
      }

      // Atualizar saldo userLogged
      const newSenderSolde = userLogged.soldeAccount - amount;
      const newReceiverSolde = (receiver.soldeAccount || 0) + amount;

      const updated_fromUser = await modelUser.updateUser(userLogged.idUser, {
        soldeAccount: newSenderSolde,
      });

      if (!updated_fromUser.success) {
        throw new Error("Error do servidor, tente novamente!");
      }
      // Registrar transfer-out
      await modelUser.saveExtract({
        fromUser: userLogged.emailUser,
        typeTransaction: "transfer_out",
        status: "completed",
        amount,
        lastSolde: userLogged.soldeAccount,
        newSolde: newSenderSolde,
        toUser: receiver.emailUser,
      });

      // Atualizar saldo receiver-User
      const updated_receiveUser = await modelUser.updateUser(receiver.idUser, {
        soldeAccount: newReceiverSolde,
      });

      if (!updated_receiveUser.success) {
        throw new Error("Error do servidor, tente novamente!");
      }

      // Guarda transfer-in
      await modelUser.saveExtract({
        toUser: receiver.emailUser,
        typeTransaction: "transfer_in",
        status: "completed",
        amount,
        lastSolde: receiver.soldeAccount || 0,
        newSolde: newReceiverSolde,
        fromUser: userLogged.emailUser,
      });

      return res.status(200).json({
        success: true,
        message: "Transferência realizada com sucesso.",
        newSenderSolde,
        newReceiverSolde,
        currencyIso: "BRL",
      });
    } catch (error) {
      console.error("Erro transferFunds:", error);
      return res.status(500).json({
        success: false,
        message: "Erro interno.",
      });
    }
  },
};

module.exports = walletController;
