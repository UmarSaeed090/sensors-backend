const admin = require("firebase-admin");
const serviceAccount = require("./fyp-backend-672d5-firebase-adminsdk-fbsvc-64455292ea.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
