// controllers/walletController.js
const modelUser = require("../models/modelUser.js");
const bcrypt = require("bcrypt");
const sendEmail = require("../services/senderEmail.js");
const { connection_db, Timestamp } = require("../db/connection.js");

const walletController = {
  // ----------------------------------------------------------------
  //    Adicionar ou Remover saldo (somente manager)
  // ----------------------------------------------------------------
  addOrRemovefunds: async (req, res) => {
    try {
      if (!req.user?.lastLogins[req.user?.deviceid]?.active) {
        return res.status(401).json({
          success: false,
          message: "Não está autorizado!",
        });
      }
      const { accountNumber, amount, action, pinTransaction, refDeposit } =
        req.body;
      const emailUser = req.user.emailUser;

      if (
        req.user.roleUser !== "manager" ||
        req.user.accountNumber === accountNumber
      ) {
        return res
          .status(403)
          .json({ success: false, message: "Não está autorizado." });
      }
      if (!amount || amount <= 0)
        return res
          .status(400)
          .json({ success: false, message: "Valor inválido." });
      if (!["add", "remove", "confirm-deposit"].includes(action)) {
        return res
          .status(400)
          .json({ success: false, message: "Ação inválida." });
      }
      if (action === "confirm-deposit" && !refDeposit) {
        return res.status(400).json({
          success: false,
          message: "Deve enviar a referência do depósito!",
        });
      }
      if (!pinTransaction)
        return res
          .status(400)
          .json({ success: false, message: "Deve informar o pin." });

      const managerLogged = await modelUser.getUser(
        "accountNumber",
        req.user.accountNumber
      );
      if (!bcrypt.compareSync(pinTransaction, managerLogged.pinTransaction)) {
        return res
          .status(400)
          .json({ success: false, message: "Pin transação não válido." });
      }

      const targetUser = await modelUser.getUser(
        "accountNumber",
        accountNumber
      );
      if (!targetUser.success) {
        return res
          .status(404)
          .json({ success: false, message: "Usuário não encontrado." });
      }

      const userRef = connection_db.collection("users").doc(targetUser.idUser);
      const extractRef = userRef.collection("extracts").doc(refDeposit);
      const transactionExist = await extractRef?.get()

      if (transactionExist?.data()?.status !== "pending" || !transactionExist) {
        return res.status(403).json({
          success: false,
          message: "Essa transação já foi atendida!"
        })
      }


      if (parseFloat(transactionExist.data().amount) !== amount) {
        return res.status(403).json({
          success: false,
          message: "O valor informado não corresponde."
        })
      }

      const result = await connection_db.runTransaction(async (t) => {
        const userSnap = await t.get(userRef);
        if (!userSnap.exists) throw new Error("Usuário não encontrado.");

        const lastSolde = userSnap.data().soldeAccount || 0;
        let newSolde = lastSolde;

        if (action === "add" || action === "confirm-deposit")
          newSolde += amount;
        if (action === "remove") newSolde -= amount;

        t.update(userRef, { soldeAccount: newSolde });
        t.update(extractRef, {
          typeTransaction: action === "remove" ? "cash-out" : "cash-in",
          aprovedBy: emailUser,
          lastSolde,
          amount,
          newSolde,
          createdAt: new Date(),
          status: "completed",
        });

        return { lastSolde, newSolde };
      });

      await sendEmail.invoice(
        targetUser.emailUser,
        targetUser.firstNameUser,
        amount,
        action,
        result.lastSolde,
        result.newSolde,
        new Date(),
        refDeposit
      );

      return res.status(200).json({
        success: true,
        message:
          action === "remove"
            ? "Valor retirado com sucesso."
            : "Saldo adicionado com sucesso.",
        ...result,
        amount,
        currencyIso: "BRL",
      });
    } catch (error) {
      console.error("Erro addOrRemovefunds:", error);
      return res
        .status(500)
        .json({ success: false, message: error.message || "Erro interno." });
    }
  },

  // ----------------------------------------------------------------
  //    Depositar valor na conta do próprio usuário
  // ----------------------------------------------------------------
  depositToMyAccount: async (req, res) => {
    try {
      if (!req.user?.lastLogins[req.user?.deviceid]?.active) {
        return res.status(401).json({
          success: false,
          message: "Não está autorizado!",
        });
      }
      const { amount, method } = req.body;
      const userInfo = req.user;

      if (!method || !["PIX"].includes(method)) {
        return res.status(400).json({
          success: false,
          message: "Deve enviar um método válido. Ex: PIX",
        });
      }
      if (!amount || amount < 5) {
        return res.status(400).json({
          success: false,
          message: "Valor mínimo para depósito é R$5,00.",
        });
      }

      const userRef = connection_db.collection("users").doc(userInfo.idUser);
      const extractRef = userRef.collection("extracts").doc();

      // 🔥 Cria um registro pendente (sem mexer no saldo)
      await connection_db.runTransaction(async (t) => {
        const userSnap = await t.get(userRef);
        if (!userSnap.exists) throw new Error("Usuário não encontrado.");

        t.set(extractRef, {
          createdBy: userInfo.emailUser,
          cpfUser: userInfo.cpfUser,
          phoneUser: userInfo.phoneNumber,
          fullName: `${userInfo.firstNameUser} ${userInfo.lastNameUser}`,
          amount,
          method,
          typeTransaction: "deposit",
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      sendEmail.invoice(userInfo.emailUser, userInfo.firstNameUser, amount, "Deposito foi criado.", userInfo.soldeAccount, userInfo.soldeAccount, new Date(), extractRef.id)
      return res.status(201).json({
        success: true,
        message: "Depósito criado com sucesso! Aguarde confirmação.",
        depositId: extractRef.id,
      });
    } catch (error) {
      console.error("depositToMyAccount:", error);
      return res
        .status(500)
        .json({ success: false, message: error.message || "Erro interno." });
    }
  },

  // ----------------------------------------------------------------
  //    Saque de saldo do próprio usuário
  // ----------------------------------------------------------------
  withdrawFunds: async (req, res) => {
    try {
      if (!req.user?.lastLogins[req.user?.deviceid]?.active) {
        return res.status(401).json({
          success: false,
          message: "Não está autorizado!",
        });
      }
      const { amount, method, destination, pinTransaction } = req.body;
      if (!amount || amount <= 0)
        return res
          .status(400)
          .json({ success: false, message: "Valor inválido." });
      if (!["PIX", "TED"].includes(method))
        return res
          .status(400)
          .json({ success: false, message: "Método inválido." });
      if (!destination)
        return res
          .status(400)
          .json({ success: false, message: "Destino obrigatório." });

      const userRef = connection_db.collection("users").doc(req.user.idUser);
      const extractRef = userRef.collection("extracts").doc();

      const userLogged = await modelUser.getUser(
        "accountNumber",
        req.user.accountNumber
      );
      if (!bcrypt.compareSync(pinTransaction, userLogged.pinTransaction)) {
        return res
          .status(400)
          .json({ success: false, message: "Pin transação não válido." });
      }

      const result = await connection_db.runTransaction(async (t) => {
        const userSnap = await t.get(userRef);
        if (!userSnap.exists) throw new Error("Usuário não encontrado.");

        const lastSolde = userSnap.data().soldeAccount || 0;
        if (lastSolde < amount) throw new Error("Saldo insuficiente.");

        const newSolde = lastSolde - amount;
        t.update(userRef, { soldeAccount: newSolde });

        t.set(extractRef, {
          typeTransaction: "withdraw",
          createdBy: req.user.emailUser,
          lastSolde,
          amount,
          newSolde,
          method,
          destination,
          status: "pending", // até o processamento externo confirmar
          createdAt: new Date(),
        });

        return { lastSolde, newSolde };
      });

      return res.status(200).json({
        success: true,
        message: "Saque registrado com sucesso, aguardando processamento.",
        ...result,
        amount,
        method,
        destination,
        currencyIso: "BRL",
      });
    } catch (error) {
      console.error("Erro withdrawFunds:", error);
      return res
        .status(500)
        .json({ success: false, message: error.message || "Erro interno." });
    }
  },

  // ----------------------------------------------------------------
  //    Transferência de saldo entre usuários
  // ----------------------------------------------------------------
  transferFunds: async (req, res) => {
    try {
      if (!req.user?.lastLogins[req.user?.deviceid]?.active) {
        return res.status(401).json({
          success: false,
          message: "Não está autorizado!",
        });
      }
      const { accountNumber, amount, pinTransaction } = req.body;
      if (!amount || amount <= 0)
        return res
          .status(400)
          .json({ success: false, message: "Valor inválido." });
      if (req.user.accountNumber === accountNumber) {
        return res.status(400).json({
          success: false,
          message: "Não pode transferir para si mesmo.",
        });
      }

      const senderRef = connection_db.collection("users").doc(req.user.idUser);
      const receiverUser = await modelUser.getUser(
        "accountNumber",
        accountNumber
      );
      if (!receiverUser.success)
        return res
          .status(404)
          .json({ success: false, message: "Destinatário não encontrado." });

      const receiverRef = connection_db
        .collection("users")
        .doc(receiverUser.idUser);

      const senderLogged = await modelUser.getUser(
        "accountNumber",
        req.user.accountNumber
      );
      if (!bcrypt.compareSync(pinTransaction, senderLogged.pinTransaction)) {
        return res
          .status(401)
          .json({ success: false, message: "Pin transação não válido." });
      }

      const result = await connection_db.runTransaction(async (t) => {
        const senderSnap = await t.get(senderRef);
        const receiverSnap = await t.get(receiverRef);

        if (!senderSnap.exists || !receiverSnap.exists)
          throw new Error("Usuários inválidos.");
        const senderSolde = senderSnap.data().soldeAccount || 0;
        const receiverSolde = receiverSnap.data().soldeAccount || 0;

        if (senderSolde < amount) throw new Error("Saldo insuficiente.");

        const newSenderSolde = senderSolde - amount;
        const newReceiverSolde = receiverSolde + amount;

        t.update(senderRef, { soldeAccount: newSenderSolde });
        t.update(receiverRef, { soldeAccount: newReceiverSolde });

        const senderExtractRef = senderRef.collection("extracts").doc();
        const receiverExtractRef = receiverRef.collection("extracts").doc();

        t.set(senderExtractRef, {
          typeTransaction: "cash_out",
          fromUser: req.user.emailUser,
          toUser: receiverUser.emailUser,
          amount,
          lastSolde: senderSolde,
          newSolde: newSenderSolde,
          status: "completed",
          createdAt: new Date(),
        });

        t.set(receiverExtractRef, {
          typeTransaction: "cash_in",
          fromUser: req.user.emailUser,
          toUser: receiverUser.emailUser,
          amount,
          lastSolde: receiverSolde,
          newSolde: newReceiverSolde,
          status: "completed",
          createdAt: new Date(),
        });

        return { newSenderSolde, newReceiverSolde };
      });

      return res.status(200).json({
        success: true,
        message: "Transferência realizada com sucesso.",
        ...result,
        currencyIso: "BRL",
      });
    } catch (error) {
      console.error("Erro transferFunds:", error);
      return res
        .status(500)
        .json({ success: false, message: error.message || "Erro interno." });
    }
  },
};

module.exports = walletController;
