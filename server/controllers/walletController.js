// controllers/walletController.js
const modelUser = require("../models/modelUser");
const bcrypt = require("bcrypt");

const walletController = {
  //    Adicionar saldo para um usuário Somente manager pode adicionar
  addFunds: async (req, res) => {
    try {
      const { accountNumber, amount, action, pinTransaction } = req.body;
      const emailUser = req.user.emailUser;

      if (
        req.user.roleUser !== "manager" ||
        req.user.accountNumber === accountNumber
      ) {
        return res.status(403).json({
          success: false,
          message: "Não está autorizado.",
        });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valor inválido.",
        });
      }

      if (!["add", "remove"].includes(action)) {
        return res.status(400).json({
          success: false,
          message: "Ação inválida. Use 'add' ou 'remove'.",
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
      const LastSolde = targetUser.soldeAccount || 0;
      let NewSolde = LastSolde;
      if (action === "add") {
        NewSolde = LastSolde + amount;
      } else if (action === "remove") {
        NewSolde = LastSolde - amount;
      }

      const ispinTransactionMatch = bcrypt.compare(
        pinTransaction,
        userLogged.pinTransaction
      );
      if (!pinTransaction || !ispinTransactionMatch) {
        throw new Error("Pin transação não valido.");
      }

      await modelUser.updateUser(idUser, { soldeAccount: NewSolde });
      await modelUser.saveExtract({
        ToUser: targetUser.emailUser,
        TypeTransaction: action,
        Status: "completed",
        Amount: amount,
        LastSolde,
        NewSolde,
        CreatedBy: emailUser,
      });

      const message =
        action === "add"
          ? "Saldo adicionado com sucesso."
          : "O valor foi retirado com sucesso.";

      return res.status(200).json({
        success: true,
        message,
        LastSolde,
        NewSolde,
        Amount: amount,
        CurrencyIso: "BRL",
      });
    } catch (error) {
      console.error("Erro addFunds:", error);
      return res.status(500).json({
        success: false,
        message: "Erro interno.",
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

      const LastSolde = req.user.soldeAccount || 0;
      if (LastSolde < amount) {
        return res.status(400).json({
          success: false,
          message: "Saldo insuficiente.",
          soldeAccount: LastSolde,
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
      const NewSolde = LastSolde - amount;
      const updated = await modelUser.updateUser(idUser, {
        soldeAccount: NewSolde,
      });

      if (!updated.success) {
        throw new Error("Error do servidor, tente novamente!");
      }
      // Salva extrato
      await modelUser.saveExtract({
        FromUser: emailUser,
        TypeTransaction: "withdraw",
        Status: "pending", // mantém pendente até confirmação do processamento
        Amount: amount,
        LastSolde,
        NewSolde,
        Method: method,
        Destination: destination,
        CurrencyIso: "BRL",
      });

      return res.status(200).json({
        success: true,
        message: "Saque registrado com sucesso, aguardando processamento.",
        Amount: amount,
        LastSolde,
        NewSolde,
        Method: method,
        Destination: destination,
        CurrencyIso: "BRL",
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
          CurrencyIso: "BRL",
        });
      }

      // Atualizar saldo userLogged
      const NewSenderSolde = userLogged.soldeAccount - amount;
      const NewReceiverSolde = (receiver.soldeAccount || 0) + amount;

      const updated_fromUser = await modelUser.updateUser(userLogged.idUser, {
        soldeAccount: NewSenderSolde,
      });

      if (!updated_fromUser.success) {
        throw new Error("Error do servidor, tente novamente!");
      }
      // Registrar transfer-out
      await modelUser.saveExtract({
        FromUser: userLogged.emailUser,
        TypeTransaction: "transfer_out",
        Status: "completed",
        Amount: amount,
        LastSolde: userLogged.soldeAccount,
        NewSolde: NewSenderSolde,
        ToUser: receiver.emailUser,
      });

      // Atualizar saldo receiver-User
      const updated_receiveUser = await modelUser.updateUser(receiver.idUser, {
        soldeAccount: NewReceiverSolde,
      });

      if (!updated_receiveUser.success) {
        throw new Error("Error do servidor, tente novamente!");
      }

      // Guarda transfer-in
      await modelUser.saveExtract({
        ToUser: receiver.emailUser,
        TypeTransaction: "transfer_in",
        Status: "completed",
        Amount: amount,
        LastSolde: receiver.soldeAccount || 0,
        NewSolde: NewReceiverSolde,
        FromUser: userLogged.emailUser,
      });

      return res.status(200).json({
        success: true,
        message: "Transferência realizada com sucesso.",
        NewSenderSolde,
        NewReceiverSolde,
        CurrencyIso: "BRL",
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
