const { connection_db, Timestamp } = require("../db/connection.js");
const { requestDing } = require("../services/requestDing.js");

function generatePriceTiers(
  minValue,
  maxValue,
  step,
  startPercent,
  endPercent
) {
  if (minValue < 0 || maxValue <= 0 || step <= 0) {
    throw new Error("Invalid price tier parameters");
  }

  const tiers = [];
  const stepsCount = Math.floor((maxValue - minValue) / step);
  const percentStep = (startPercent - endPercent) / stepsCount;

  for (let i = 0; i <= stepsCount; i++) {
    const tierMin = minValue + i * step;
    const tierMax = i === stepsCount ? Infinity : tierMin + step - 1;
    const percent = startPercent - percentStep * i;
    tiers.push({
      min: tierMin,
      max: tierMax,
      percent: Number(percent.toFixed(2)),
    });
  }
  return tiers;
}

const PRICE_TIERS = generatePriceTiers(0, 150, 10, 0.25, 0.1);

function getPercent(value, tiers = PRICE_TIERS) {
  const tier = tiers.find((t) => value >= t.min && value <= t.max);
  return tier ? tier.percent : 0;
}

function calculatePrice(value, isReverse = false, tiers = PRICE_TIERS) {
  const num = typeof value === "string" ? parseFloat(value) : value;

  if (typeof num !== "number" || isNaN(num) || !isFinite(num)) {
    throw new Error("Invalid value for calculation");
  }

  if (!isReverse) {
    const percent = getPercent(num, tiers);
    const result = num + num * percent;
    return result < 10 ? 10 : Number(result.toFixed(2));
  }

  for (const tier of tiers) {
    const original = num / (1 + tier.percent);
    if (original >= tier.min && original <= tier.max) {
      return Number(original.toFixed(2));
    }
  }
  return num;
}

const modelTopUp = {
  // Criando usuario
  createTopUp: async (dataTopup, userData) => {
    try {
      const refUser = connection_db.collection("users").doc(userData.idUser);
      const refTransaction = refUser.collection("transactions").doc();
      const refExtract = refUser.collection("extracts").doc();

      let newSolde;

      // 🔹 Primeiro: desconta saldo de forma transacional
      await connection_db.runTransaction(async (t) => {
        const userSnap = await t.get(refUser);
        if (!userSnap.exists) throw new Error("Usuário não encontrado!");

        const lastSolde = userSnap.data().soldeAccount || 0;
        if (lastSolde < dataTopup.sendValue) {
          throw new Error("Saldo insuficiente!");
        }

        newSolde = lastSolde - dataTopup.sendValue;

        // Cria transação pendente
        t.set(refTransaction, {
          ...dataTopup,
          productName: "topup",
          createdAt: Timestamp.fromDate(new Date()),
          statusTransaction: "pending",
          createdBy: userData.emailUser,
        });

        // Atualiza saldo do usuário
        t.update(refUser, { soldeAccount: newSolde });

        // Extrato
        t.set(refExtract, {
          typeTransaction: "cash-out",
          createdBy: userData.emailUser,
          lastSolde,
          amount: dataTopup.sendValue,
          newSolde,
          refTransaction: refTransaction.id,
          createdAt: Timestamp.fromDate(new Date()),
        });
      });

      // 🔹 Segundo: chama API externa (Ding)
      const responseDing = await requestDing("SendTransfer", "POST", {
        SkuCode: dataTopup.skuCode,
        SendValue: calculatePrice(dataTopup.sendValue, true),
        SendCurrencyIso: dataTopup.sendCurrencyIso,
        AccountNumber: dataTopup.accountNumber,
        DistributorRef: dataTopup.distributorRef,
        ValidateOnly: dataTopup.validateOnly,
      });

      if (!responseDing.success) {
        // Se Ding falhar → marcar a transação como failed + devolver saldo
        await connection_db.runTransaction(async (t) => {
          t.update(refUser, { soldeAccount: newSolde + dataTopup.sendValue });
          t.update(refTransaction, { statusTransaction: "failed" });
        });

        return {
          success: false,
          message: "Transação rejeitada pela Ding. Saldo restaurado.",
        };
      }

      // 🔹 Se Ding OK → confirmar a transação
      await refTransaction.update({
        statusTransaction: "completed",
        transferRef:
          responseDing?.TransferRecord?.TransferId?.TransferRef || null,
        receiveValue: responseDing?.TransferRecord?.Price?.ReceiveValue || null,
      });

      return {
        success: true,
        message: "Transação concluída com sucesso!",
      };
    } catch (error) {
      console.error("Erro em createTopUp:", error);
      return {
        success: false,
        message: "Erro interno ao processar a transação.",
        error: error.message,
      };
    }
  },

  //   Para autualizar
  updateTopUp: async (idUser, idTopup, data) => {
    try {
      if (!idTopup) throw new Error("ID do topup é obrigatório.");
      await connection_db
        .collection("users")
        .doc(idUser)
        .collection("transactions")
        .doc(idTopup)
        .update({ ...data });
      return {
        success: true,
        message: "Atualizada com sucesso!",
      };
    } catch (error) {
      console.error("Erro em modelUser.updateTopUp:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  },
};

module.exports = modelTopUp;
