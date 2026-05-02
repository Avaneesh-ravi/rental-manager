import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyDK6UH-fL361D3J1bITVSBp7rmy33nX9Vk",
  authDomain: "home-rental-management-54700.firebaseapp.com",
  projectId: "home-rental-management-54700",
  storageBucket: "home-rental-management-54700.firebasestorage.app",
  messagingSenderId: "866527822665",
  appId: "1:866527822665:web:153aefdc0562723e021098"
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const db = getFirestore(app)
export const auth = getAuth(app)
export const storage = getStorage(app)
export default app