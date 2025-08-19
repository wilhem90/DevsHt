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

  getUsers: () => {
    return {
      success: true,
      data: [],
    };
  },

  getUser: async (path, value) => {
    try {
      const users = await connetion_db
        .collection("users")
        .where(path, "==", value)
        .get();


      return {
        success: true,
        data: users?.docs[0]?.data() ? [users?.docs[0]?.data()] : [],
      };
    } catch (error) {
      console.log("Error localizado na funccao modelUser.getUser");
      return {
        success: false,
        message: error.message,
      };
    }
  },
};

module.exports = modelUser;
