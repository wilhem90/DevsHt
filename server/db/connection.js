const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore, Timestamp, FieldValue, Filter } = require("firebase-admin/firestore");

initializeApp({
  credential: applicationDefault(),
});

const connetion_db = getFirestore();

module.exports = { connetion_db, Timestamp, FieldValue, Filter };
