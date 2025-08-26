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
        updatedAt: Timestamp.fromDate(new Date()),
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
    try {
      if (!idUser) throw new Error("ID do usuário é obrigatório.");

      const updateData = { ...data, updateAt: Timestamp.fromDate(new Date()) };

      await connetion_db.collection("users").doc(idUser).update(updateData);
      return {
        success: true,
        message: "Atualizada com sucesso!",
      };
    } catch (error) {
      console.error("Erro em modelUser.updateUser:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  },

  // Buscar usuarios
  getUser: async (fieldPath, value) => {
    try {
      let query = connetion_db.collection("users");
      query = query.where(fieldPath, "==", value);
      const snapshot = await query.get();

      if (snapshot.empty) {
        return {
          success: false,
          message: `Nenhum usuário encontrado!`,
        };
      }

      const doc = snapshot.docs[0];

      return {
        success: true,
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

  deleteUser: async (emailUser) => {
    const userRef = connetion_db
      .collection("users")
      .where("emailUser", "==", emailUser);
    const users = await userRef.get();
    const id = users.docs[0]?.id;
    if (!id) {
      return {
        success: true,
        message: "Conta não existe!",
      };
    }

    await connetion_db.collection("users").doc(id).delete();
    return {
      success: true,
      message: "Conta deletada com successo!",
    };
  },

  // Vamos guardar o extracto
  saveExtract: async (idUser, refDoc, data) => {
    try {
      const extractCollection = connetion_db.collection("users").doc(idUser).collection("extracts");

      // Se veio refDoc, usa como ID fixo. Se não, gera automático
      const extractDoc = refDoc
        ? extractCollection.doc(refDoc)
        : extractCollection.doc();

      await extractDoc.set({
        ...data,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      });

      return {
        success: true,
        idExtract: extractDoc.id,
      };
    } catch (error) {
      console.error("Erro ao salvar extract:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  },
};

module.exports = modelUser;
