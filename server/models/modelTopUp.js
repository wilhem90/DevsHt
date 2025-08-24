const { connetion_db, Timestamp, FieldValue } = require("../db/connection");

const modelTopUp = {
  // Criando usuario
  createTopUp: async (newTopUp) => {
    try {
      const refTopUp = await connetion_db.collection("transactions").add({
        ...newTopUp,
      });

      if (refTopUp.id) {
        return {
          success: true,
          iduSer: refNewUser.id,
          message: "Transaçaõ registrada!",
        };
      }
    } catch (error) {
      console.log("Error na funcão modelUer.createUser", error.message);
      return {
        success: false,
        message: `Algo deu errado: ${error.message}`,
      };
    }
  },

  //   Para autualizar
  updateTopUp: async (idTopup, data) => {
    try {
      if (!idTopup) throw new Error("ID do topup é obrigatório.");
      await connetion_db
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

  // Vamos guardar a transactions
  saveTopUp: async (data) => {
    const extractDoc = connetion_db.collection("transactions").doc();
    await extractDoc.create({
      ...data,
      createdAt: Timestamp.fromDate(new Date()),
    });
    return {
      success: true,
      idTopup: extractDoc.id,
    };
  },
};

module.exports = modelTopUp;
