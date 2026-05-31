import admin from "firebase-admin";
import 'dotenv/config';

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") || '',
  }),
});

export const firebaseMessaging: admin.messaging.Messaging = admin.messaging();

// export async function checkFirebaseConnect() {
//   try {
//     await admin.firestore().listCollections();
//     console.log('Successfully connected to Firebase');
//   } catch (error) {
//     console.error('Error connecting to Firebase:', error);
//   }
// }

export async function checkFirebaseConnect(): Promise<boolean> {
  try {
    await firebaseMessaging.send({
      token: 'fake-token-just-for-testing-connection-handshake',
      data: { ping: 'pong' }
    }, true); 

    console.log("🚀 Firebase Admin SDK authenticated successfully.");
    return true;
  } catch (error: any) {
    if (error.code === 'messaging/invalid-argument' || error.code === 'messaging/registration-token-not-registered') {
      console.log("Firebase Admin SDK connection verified successfully.");
      return true;
    }

    console.error("❌ Firebase Admin SDK connection verification failed!");
    console.error(`Error Code: ${error.code}`);
    console.error(`Message: ${error.message}`);
    return false;
  }
}