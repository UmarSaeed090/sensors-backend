// utils/fcmUtils.js
const admin = require("../firebase/firebase");

const getUserFcmTokenByCowId = async (cowId) => {
  try {
    const snapshot = await admin.firestore()
      .collection("users")
      .where("cows", "array-contains", cowId)
      .get();

    if (snapshot.empty) {
      console.log("No users in firebase subscribed to cow:", cowId);
      return [];
    }

    const fcmTokens = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.fcmToken) {
        fcmTokens.push(data.fcmToken);
      }
    });

    return fcmTokens;
  } catch (err) {
    console.error("❌ Error fetching FCM tokens from Firestore:", err);
    return [];
  }
};

module.exports = { getUserFcmTokenByCowId };
