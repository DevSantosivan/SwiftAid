// // functions/src/index.ts (Node.js cloud function)
// import * as functions from "firebase-functions";
// import * as admin from "firebase-admin";

// admin.initializeApp();

// export const createUser = functions.https.onCall(async (data, context) => {
//   // Check if the requester is authenticated and is an admin
//   if (!context.auth) {
//     throw new functions.https.HttpsError(
//         "unauthenticated",
//         "Request had no auth context.",
//     );
//   }

//   const uid = context.auth.uid;
//   const userRecord = await admin.auth().getUser(uid);

//   if (!userRecord.customClaims?.admin) {
//     throw new functions.https.HttpsError(
//         "permission-denied",
//         "User must be an admin to create users.",
//     );
//   }

//   const {email, password, first_name, last_name, role, ...otherData} = data;

//   try {
//     // Create user using Admin SDK
//     const user = await admin.auth().createUser({
//       email,
//       password,

//       displayName: `${first_name} ${last_name}`,
//     });

//     // Add additional user data to Firestore
//     await admin
//         .firestore()
//         .collection("users")
//         .doc(user.uid)
//         .set({
//           uid: user.uid,
//           fullName: `${first_name} ${last_name}`,
//           email,
//           role,
//           ...otherData,
//           createdAt: admin.firestore.FieldValue.serverTimestamp(),
//           account_status: "approved",
//           blocked: false,
//         });

//     return {uid: user.uid};
//   } catch (error) {
//     throw new functions.https.HttpsError("internal", error.message);
//   }
// });
