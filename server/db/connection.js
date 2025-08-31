const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore, Timestamp, FieldValue, Filter } = require("firebase-admin/firestore");
const { getStorage, getDownloadURL } = require('firebase-admin/storage');

initializeApp({
  credential: applicationDefault(),
});

const connection_db = getFirestore();


module.exports = { connection_db, Timestamp, FieldValue, Filter, getStorage, getDownloadURL };
