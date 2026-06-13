import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/**
 * 必須の Firebase 環境変数が揃っているかで本番/デモを切り替える。
 * 揃っていなければ「デモモード」（擬似ログイン + モックデータ）で動く。
 */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
)

let app: FirebaseApp | undefined
let authInstance: Auth | undefined
let dbInstance: Firestore | undefined

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig)
  authInstance = getAuth(app)
  dbInstance = getFirestore(app)
}

export const auth = authInstance
export const db = dbInstance
export const googleProvider = new GoogleAuthProvider()

/** Web Push 用 Messaging（対応ブラウザのみ）。未対応・デモ時は undefined。 */
let messagingInstance: Messaging | undefined
export async function initMessaging(): Promise<Messaging | undefined> {
  if (messagingInstance) return messagingInstance
  if (!isFirebaseConfigured || !app) return undefined
  try {
    if (!(await isSupported())) return undefined
    messagingInstance = getMessaging(app)
    return messagingInstance
  } catch {
    return undefined
  }
}
