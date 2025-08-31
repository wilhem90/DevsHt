const { connection_db, Timestamp } = require("../db/connection.js");
const modelUser = require("./modelUser.js");

const modelExtract = {
  // Save extract
  saveExtract: async (idUser, refDoc, data) => {
    try {
      const extractCollection = connection_db
        .collection("users")
        .doc(idUser)
        .collection("extracts");

      // Use refDoc as ID if provided, otherwise generate auto ID
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

  // Update extract
  updateExtract: async (idUser, idExtract, data) => {
    try {
      const extractRef = connection_db
        .collection("users")
        .doc(idUser)
        .collection("extracts")
        .doc(idExtract);

      const extractDoc = await extractRef.get();

      if (!extractDoc.exists) {
        return {
          success: false,
          message: "Extract not found",
        };
      }

      const extractData = extractDoc.data();

      // Check if extract is pending or amount has changed
      if (
        extractData.status === "pending" ||
        extractData.amount === data.amount
      ) {
        // Update user balance
        await modelUser.updateUser(idUser, { soldeAccount: data.newSolde });

        // Update extract document
        await extractRef.update({
          ...data,
          updatedAt: Timestamp.fromDate(new Date()),
        });

        return {
          success: true,
          typeTransaction: extractData.typeTransaction,
          message: "Extract updated successfully",
        };
      }

      return {
        success: false,
        message: "Extract not eligible for update",
      };
    } catch (error) {
      console.error("Erro ao atualizar extract:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  },

  // Additional helpful method: Get extracts for a user
  getExtracts: async (idUser, limit = 10) => {
    try {
      const extractsSnapshot = await connection_db
        .collection("users")
        .doc(idUser)
        .collection("extracts")
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

      const extracts = [];
      extractsSnapshot.forEach((doc) => {
        extracts.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return {
        success: true,
        extracts,
      };
    } catch (error) {
      console.error("Erro ao buscar extracts:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  },
};

module.exports = modelExtract;
