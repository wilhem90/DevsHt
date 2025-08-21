const { connetion_db, Timestamp } = require("../db/connection");

const modelUser = {
  // Criando usuario
  createUser: async (newUser) => {
    try {
      // Gerar o numero da conta
      function getNextAccountNumber(digits) {
        const min = 10 ** (digits - 1);
        const max = 10 ** digits - 1;
        return Math.floor(min + Math.random() * (max - min + 1));
      }

      const accountNumber = String(getNextAccountNumber(9));
      const refAccount = await connetion_db
        .collection("users")
        .where("accountNumber", "==", accountNumber)
        .get();

      const isExistAccountNumber = refAccount?.docs;

      if (isExistAccountNumber.length > 0) {
        return {
          success: false,
          message: "Tente novamente!",
        };
      }

      const refNewUser = await connetion_db.collection("users").add({
        ...newUser,
        accountNumber: String(accountNumber),
        updateAt: Timestamp.fromDate(new Date()),
        createdAt: Timestamp.fromDate(new Date()),
      });

      if (refNewUser.id) {
        return {
          success: true,
          iduSer: refNewUser.id,
          message: "Conta foi criada com sucesso!",
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

  updateUser: async (idUser, data) => {
    await connetion_db
      .collection("users")
      .doc(idUser)
      .update({
        ...data,
      });
  },

  getUser: async (field, value) => {
    try {
      const snapshot = await connetion_db
        .collection("users")
        .where(field, "==", value)
        .get();

      if (snapshot.empty) {
        return {
          success: false,
          message: `Nenhum usuário encontrado!`,
        };
      }

      const doc = snapshot.docs[0];

      return {
        idUser: doc.id,
        ...doc.data(),
      };
    } catch (error) {
      console.error("Erro localizado na função modelUser.getUser:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  },
};

module.exports = modelUser;
