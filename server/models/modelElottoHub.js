const { connection_db } = require("../db/connection.js");

async function validateAllValues(
  values,
  bestSellersLoterrySelected,
  limited_prices
) {
  const outLimits = {};
  Object.keys(values).forEach((element) => {
    const sum = values[element] + (bestSellersLoterrySelected?.[element] || 0);

    // Adiciona ao outLimits se não incluir "X" e values[element] < 1
    if (
      !element.toString().toUpperCase().includes("X") &&
      values[element] < 1
    ) {
      outLimits[element] = values[element];
    }

    if (
      element.toString().length === 2 &&
      (values[element] > limited_prices.default_limit_borlette ||
        sum >= limited_prices.default_limit_borlette)
    ) {
      outLimits[element] = values[element];
    }

    if (
      element.toString().length === 3 &&
      (values[element] > limited_prices.default_limit_lotto3 ||
        sum >= limited_prices.default_limit_lotto3)
    ) {
      outLimits[element] = values[element];
    }

    if (
      element.toString().length === 4 &&
      (values[element] > limited_prices.default_limit_lotto4 ||
        sum >= limited_prices.default_limit_lotto4)
    ) {
      outLimits[element] = values[element];
    }

    if (element.toString().length === 5) {
      if (element.toString().toUpperCase().includes("X")) {
        if (
          values[element] > limited_prices.default_limit_marred ||
          sum >= limited_prices.default_limit_marred
        ) {
          outLimits[element] = values[element];
        }
      } else if (
        values[element] > limited_prices.default_limit_lotto5 ||
        sum >= limited_prices.default_limit_lotto5
      ) {
        outLimits[element] = values[element];
      }
    }
  });

  if (Object.keys(outLimits).length > 0) {
    return {
      success: false,
      outLimits,
    };
  }

  return {
    success: true,
  };
}

function validatePeriodTime(
  periodTime,
  currentTime,
  endFirstRound,
  endSecondRound
) {
//   const periodTime = periodTime;
//   const currentTime = currentTime;
//   const endFirstRound = endFirstRound;
//   const startSecondRound = startSecondRound;
//   const endSecondRound = endSecondRound;

  console.log(
    periodTime,
    currentTime,
    endFirstRound,
    endSecondRound
  );
  return {
    success: true,
    periodTime,
  };
}

const modelElottoHub = {
  // Para registrar um novo bilhete no sistema
  createTicket: async (idUser, dataTicket, currentTime) => {
    const { values, periodTime, lotery } = dataTicket;
    try {
      const refUser = connection_db.collection("users").doc(idUser);

      //   Vamos pegar a configuração hora do projeto para permitir as transação seja feita em seguro
      const configLoterrySelected = await connection_db
        .collection("configApp")
        .doc("configTime")
        .get();

      // Vamos buscar todos os valores do limitedOfValuesLoterrySelected
      const limitsOfValues = await connection_db
        .collection("configApp")
        .doc("limitsOfValues")
        .get();

      let periodTimeValid = validatePeriodTime(
        periodTime,
        currentTime,
        configLoterrySelected.data()?.[lotery].morning,
        configLoterrySelected.data()?.[lotery].afternoon
      );

      if (!periodTimeValid.success) {
        return {
          success: false,
          periodTime: "Invalid period time",
        };
      }

      periodTimeValid = periodTimeValid.periodTime;

      // Limitação para os valores como borlette, lotto3, lotto4, lotto5, marred.
      const default_limit_borlette =
        limitsOfValues?.data()?.[periodTimeValid].default_limit_borlette;
      const default_limit_lotto3 =
        limitsOfValues?.data()?.[periodTimeValid].default_limit_lotto3;
      const default_limit_lotto4 =
        limitsOfValues?.data()?.[periodTimeValid].default_limit_lotto4;
      const default_limit_lotto5 =
        limitsOfValues?.data()?.[periodTimeValid].default_limit_lotto5;
      const default_limit_marred =
        limitsOfValues?.data()?.[periodTimeValid].default_limit_marred;

      // Vamos buscar todos os numeros com preço que já vendidos no sistema da loteria selecionada
      const bestSellers = await connection_db
        .collection("hotNumbers")
        .doc(`${currentTime.split(",")[0].replaceAll("-", "")}`)
        .get();

      // Todos os numeros da loteria selecionada
      const bestSellersLoterrySelected =
        bestSellers?.data()?.[periodTimeValid]?.[dataTicket.periodTime];

      // Vamos validar os dados (numero e preço)
      const allValuesOutOfLimit = await validateAllValues(
        values,
        bestSellersLoterrySelected,
        {
          default_limit_borlette,
          default_limit_lotto3,
          default_limit_lotto4,
          default_limit_lotto5,
          default_limit_marred,
        }
      );

      if (!allValuesOutOfLimit.success) {
        return {
          success: false,
          allValuesOutOfLimit,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: "Something went wrong!",
      };
    }
  },
};

module.exports = modelElottoHub;
