const { connection_db } = require("../db/connection.js");

async function validateAllValues(
  values,
  bestSellersLoterrySelected,
  limited_prices,
  isNotInList
) {
  const outLimits = {};
  let totalTicket = 0;
  console.log(isNotInList);

  // Regras de limite por tamanho da aposta
  const limits = {
    2: limited_prices.default_limit_borlette,
    3: limited_prices.default_limit_lotto3,
    4: limited_prices.default_limit_lotto4,
    5: limited_prices.default_limit_lotto5,
    marred: limited_prices.default_limit_marred,
  };

  for (const key of Object.keys(values)) {
    const numValue = Number(values[key]) || 0; // garante número
    const sum = numValue + (bestSellersLoterrySelected?.[key] || 0);
    totalTicket += numValue;

    const keyLength = key.toString().length;
    const isMarred = keyLength === 5 && key.toUpperCase().includes("X");

    // Regra 1: valor menor que 1 (exceto marred)
    if (!isMarred && numValue < 1 && !isNotInList) {
      outLimits[key] = { value: numValue, reason: "value_below_minimum" };
      continue;
    }

    // Regra 2: aplica limites de acordo com o tipo
    if (isMarred) {
      if (numValue > limits.marred || (sum >= limits.marred && !isNotInList)) {
        outLimits[key] = { value: numValue, reason: "limit_exceeded_marred" };
      }
    } else if (
      limits[keyLength] &&
      (numValue > limits[keyLength] || sum >= limits[keyLength]) &&
      !isNotInList
    ) {
      outLimits[key] = {
        value: numValue,
        reason: `limit_exceeded_${keyLength}`,
      };
    }
  }

  if (Object.keys(outLimits).length > 0) {
    return {
      success: false,
      outLimits, // agora contém motivo detalhado
    };
  }

  return {
    success: true,
    totalTicket,
  };
}

function validatePeriodTime(
  periodTime,
  currentTime,
  endFirstRound,
  endSecondRound,
  additionalMinutes = 0
) {
  // currentTime: "YYYY-MM-DD,HH:mm:ss"
  const [dateStr, timeStr] = currentTime.toString().split(",");
  const [hour, minute, second] = timeStr.split(":").map(Number);

  // Create base date object
  const timeNow = new Date(dateStr);
  timeNow.setHours(hour, minute, second, 0);

  // Parse end times
  const [endFirstHour, endFirstMinute] = endFirstRound?.split(":").map(Number);
  const [endSecondHour, endSecondMinute] = endSecondRound
    ?.split(":")
    .map(Number);

  // Add additionalMinutes to end times
  const timeEndFirstRound = new Date(dateStr);
  timeEndFirstRound.setHours(
    endFirstHour,
    endFirstMinute + parseInt(additionalMinutes),
    0,
    0
  );

  const timeEndSecondRound = new Date(dateStr);
  timeEndSecondRound.setHours(
    endSecondHour,
    endSecondMinute + parseInt(additionalMinutes),
    0,
    0
  ); 

  // Add 30 minutes to endFirstRound
  const timeEndFirstRoundPlus30Minutes = new Date(timeEndFirstRound);
  timeEndFirstRoundPlus30Minutes.setMinutes(
    timeEndFirstRoundPlus30Minutes.getMinutes() + 30
  );

  if (timeNow < timeEndFirstRound) {
    return {
      success: true,
      periodTime: periodTime === "afternoon" ? periodTime : "morning",
    };
  }

  if (
    timeNow > timeEndFirstRoundPlus30Minutes &&
    timeNow < timeEndSecondRound
  ) {
    return {
      success: true,
      periodTime: "afternoon",
    };
  }

  return {
    success: false,
  };
}

const modelElottoHub = {
  // Para registrar um novo bilhete no sistema
  createTicket: async (idUser, dataTicket, currentTime) => {
    const { values, periodTime, loterrySelected } = dataTicket;

    try {
      return await connection_db.runTransaction(async (t) => {
        const refUser = connection_db.collection("users").doc(idUser);
        const refConfigTime = connection_db
          .collection("configApp")
          .doc("configTime");
        const listUserVip = connection_db
          .collection("configApp")
          .doc("listUserVip");
        const refLimits = connection_db
          .collection("configApp")
          .doc("limitsOfValues");
        const refBestSellers = connection_db
          .collection("hotNumbers")
          .doc(`${currentTime.split(",")[0].replaceAll("-", "")}`);

        // Buscar dentro da transação
        const userDoc = await t.get(refUser);
        const configLoterry = await t.get(refConfigTime);
        const limitsOfValues = await t.get(refLimits);
        const bestSellersDoc = await t.get(refBestSellers);
        const listUserVipDoc = await t.get(listUserVip);

        if (!userDoc.exists) {
          throw new Error("User not found");
        }

        // Validar período
        let periodTimeValid = validatePeriodTime(
          periodTime,
          currentTime,
          configLoterry.data()?.[loterrySelected]?.morning,
          configLoterry.data()?.[loterrySelected]?.afternoon,
          userDoc?.data()?.additionalMinutes
        );

        if (!periodTimeValid.success) {
          return {
            success: false,
            message:
              "You're trying to register a ticket, remembering to wait 30 minutes for the afternoon period to start. Otherwise, wait until the next day.",
          };
        }
        periodTimeValid = periodTimeValid.periodTime;

        // Limites
        const limits = limitsOfValues?.data()?.[loterrySelected] || {};
        const {
          default_limit_borlette,
          default_limit_lotto3,
          default_limit_lotto4,
          default_limit_lotto5,
          default_limit_marred,
        } = limits;

        // Números vendidos
        const bestSellers = bestSellersDoc.exists ? bestSellersDoc.data() : {};
        const bestSellersLoterrySelected =
          bestSellers?.[loterrySelected]?.[periodTimeValid] || {};
        const isUserVip = listUserVipDoc
          .data()
          ?.emails.includes(userDoc.data()?.emailUser);

        // Validar valores
        const allValuesOutOfLimit = await validateAllValues(
          values,
          bestSellersLoterrySelected,
          {
            default_limit_borlette,
            default_limit_lotto3,
            default_limit_lotto4,
            default_limit_lotto5,
            default_limit_marred,
          },
          isUserVip
        );

        if (!allValuesOutOfLimit.success) {
          return {
            success: false,
            message: "These values are not available.",
            outLimits: allValuesOutOfLimit.outLimits,
            periodTime: periodTimeValid,
          };
        }

        // Saldo do usuário
        const lastSolde = userDoc.data()?.soldeAccount || 0;
        const newSoldeAccount = lastSolde - allValuesOutOfLimit.totalTicket;

        if (newSoldeAccount < 0) {
          return {
            success: false,
            message: "Insufficient funds",
          };
        }

        // Criar transação vinculada ao usuário
        const refTransaction = refUser.collection("transactions").doc();
        dataTicket.periodTime = periodTimeValid;
        const lastId = await refUser
          .collection("transactions")
          .doc("lastId")
          .get()
          .then((doc) => {
            return (
              doc?.data()?.lastId?.[loterrySelected]?.[periodTimeValid] || 99
            );
          });

        t.set(refUser.collection("transactions").doc("lastId"), {
          lastId: {
            [loterrySelected]: {
              [periodTimeValid]: parseInt(
                (lastId.toString() === "999" ? 99 : lastId + 1).toString()
              ),
            },
          },
        });

        t.set(refTransaction, {
          ...dataTicket,
          lastSolde,
          totalTicket: allValuesOutOfLimit.totalTicket,
          newSolde: newSoldeAccount,
          createdBy: userDoc.data()?.emailUser,
          createdAt: new Date().toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
          }),
          updatedAt: new Date().toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
          }),
          transactionType: "cash-out",
          productName: "loterry",
          loterrySelected,
          status: "pending",
          idTransaction: (lastId + 1).toString(),
        });

        // Atualizar saldo
        t.update(refUser, { soldeAccount: newSoldeAccount });

        // Atualizar bestSellers
        if (!isUserVip) {
          Object.keys(values).forEach((element) => {
            bestSellersLoterrySelected[element] =
              values[element] + (bestSellersLoterrySelected?.[element] || 0);
          });

          t.set(
            refBestSellers,
            {
              [loterrySelected]: {
                ...(bestSellers?.[loterrySelected] || {}),
                [periodTimeValid]: bestSellersLoterrySelected,
              },
            },
            { merge: true }
          );
        }

        return {
          success: true,
          periodTimeValid,
        };
      });
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: "Something went wrong!",
        error: error.message,
      };
    }
  },

  updateTicket: async (idUser, idTicket, action, dataTicket, currentTime) => {
    try {
      return await connection_db.runTransaction(async (t) => {
        const refUser = connection_db.collection("users").doc(idUser);
        const refConfigTime = connection_db
          .collection("configApp")
          .doc("configTime");
        const refBestSellers = connection_db
          .collection("hotNumbers")
          .doc(`${currentTime.split(",")[0].replaceAll("-", "")}`);
        const refTicket = refUser.collection("transactions").doc(idTicket);
        const refDocRefund = refUser.collection("transactions").doc();
        const listUserVip = connection_db
          .collection("configApp")
          .doc("listUserVip");

        // ==== TODAS AS LEITURAS ANTES ====
        const [ticketDoc, configLoterry, userData, bestDoc, listUserVipDoc] =
          await Promise.all([
            t.get(refTicket),
            t.get(refConfigTime),
            t.get(refUser),
            t.get(refBestSellers),
            t.get(listUserVip),
          ]);

        if (!ticketDoc.exists) {
          return { success: false, message: "Ticket not found" };
        }

        const isUserVip = listUserVipDoc
          .data()
          ?.emails.includes(userData.data()?.emailUser);

        const loterrySelected = ticketDoc.data()?.loterrySelected;
        const endFirstRound = configLoterry.data()?.[loterrySelected]?.morning;
        const endSecondRound =
          configLoterry.data()?.[loterrySelected]?.afternoon;

        if (action === "cancel" && ticketDoc.data()?.status === "pending") {
          const values = ticketDoc.data()?.values;

          const ticketAtTime =
            ticketDoc.data()?.periodTime ===
            validatePeriodTime(
              ticketDoc.data()?.periodTime,
              currentTime,
              endFirstRound,
              endSecondRound
            ).periodTime;

          if (!ticketAtTime) {
            return { success: false, message: "Invalid period time" };
          }

          // agora só escrita
          const soldeUser = userData.data()?.soldeAccount || 0;
          const refundAmount = Object.values(values).reduce(
            (acc, v) => acc + Number(v),
            0
          );

          t.update(refUser, {
            soldeAccount: soldeUser + refundAmount,
          });

          t.create(refDocRefund, {
            ...ticketDoc.data(),
            newSolde: soldeUser + refundAmount,
            lastSolde: soldeUser,
            totalTicket: refundAmount,
            createdAt: new Date().toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            }),
            updatedAt: new Date().toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            }),
            transactionType: "refund",
            productName: "loterry",
            status: "canceled",
          });

          if (!isUserVip) {
            const currentBest = bestDoc.data() || {};
            const currentPeriod =
              currentBest?.[loterrySelected]?.[ticketDoc.data()?.periodTime] ||
              {};
            const updatedPeriod = {};

            Object.keys(currentPeriod).forEach((num) => {
              updatedPeriod[num] =
                currentPeriod[num] - Number(values[num] || 0);
            });

            t.set(
              refBestSellers,
              {
                [loterrySelected]: {
                  [ticketDoc.data()?.periodTime]: updatedPeriod,
                },
              },
              { merge: true }
            );
          }
        } else if (
          action === "update" &&
          ["completed", "confirmed", "lose"].includes(dataTicket.status)
        ) {
          t.update(refTicket, {
            status: dataTicket.status,
            updatedAt: new Date().toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            }),
          });
        } else {
          return { success: false, message: "Invalid action" };
        }

        return { success: true, message: "Ticket updated successfully" };
      });
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: "Something went wrong!",
        error: error.message,
      };
    }
  },

  getAllTickets: (idUser, startDate, endDate, loterrySelected, periodTime, status) => {
    return new Promise(async (resolve, reject) => {
      try {
        const refUser = connection_db.collection("users").doc(idUser);
        const query = refUser
          .collection("transactions")
          .where("createdAt", ">=", startDate)
          .where("createdAt", "<=", endDate);

        if (loterrySelected) {
          query.where("loterrySelected", "==", loterrySelected);
        }

        if (periodTime) {
          query.where("periodTime", "==", periodTime);
        }

        if (status) {
          query.where("status", "==", status);
        }

        const snapshot = await query.get();
        const tickets = [];

        snapshot.forEach((doc) => {
          tickets.push({ id: doc.id, ...doc.data() });
        });

        resolve(tickets);
      } catch (error) {
        reject(error);
      }
    });
  }
};

module.exports = modelElottoHub;
