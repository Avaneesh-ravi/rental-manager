// src/lib/firebase/tenants.ts
import {
  collection, doc, updateDoc, getDocs,
  getDoc, query, where, orderBy, Timestamp, writeBatch
} from 'firebase/firestore'
import { db } from './config'
import type { Tenant } from '../types'

const COL = 'tenants'

function toDate(v: unknown): Date | undefined {
  if (!v) return undefined
  if (v instanceof Timestamp) return v.toDate()
  if (v instanceof Date) return v
  return new Date(v as string)
}

function mapDoc(id: string, data: Record<string, unknown>): Tenant {
  return {
    id,
    ...(data as Omit<Tenant, 'id' | 'moveInDate' | 'moveOutDate' | 'createdAt' | 'updatedAt'>),
    moveInDate: toDate(data.moveInDate)!,
    moveOutDate: toDate(data.moveOutDate),
    createdAt: toDate(data.createdAt)!,
    updatedAt: toDate(data.updatedAt)!,
  }
}

// Compress images >2MB to keep Firestore document under 1MB
async function compressImage(file: File, maxSizeMB = 1): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = document.createElement('img')
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = Math.sqrt((maxSizeMB * 1024 * 1024) / file.size)
        canvas.width = img.width * Math.min(scale, 1)
        canvas.height = img.height * Math.min(scale, 1)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file)
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
          },
          'image/jpeg',
          0.8
        )
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

// Convert file to base64 string for Firestore storage
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function getTenants(): Promise<Tenant[]> {
  const snap = await getDocs(collection(db, COL))
  return snap.docs.map(d => mapDoc(d.id, d.data() as Record<string, unknown>))
}

export async function getActiveTenants(): Promise<Tenant[]> {
  const q = query(collection(db, COL), where('isActive', '==', true))
  const snap = await getDocs(q)
  return snap.docs.map(d => mapDoc(d.id, d.data() as Record<string, unknown>))
}

export async function getTenantsByProperty(propertyId: string): Promise<Tenant[]> {
  const q = query(
    collection(db, COL),
    where('propertyId', '==', propertyId),
    orderBy('moveInDate', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => mapDoc(d.id, d.data() as Record<string, unknown>))
}

export async function getActiveTenantByProperty(propertyId: string): Promise<Tenant | null> {
  const q = query(
    collection(db, COL),
    where('propertyId', '==', propertyId),
    where('isActive', '==', true)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return mapDoc(d.id, d.data() as Record<string, unknown>)
}

export async function getTenant(id: string): Promise<Tenant | null> {
  const snap = await getDoc(doc(db, COL, id))
  if (!snap.exists()) return null
  return mapDoc(snap.id, snap.data() as Record<string, unknown>)
}

export async function addTenant(
  data: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>,
  photoFile?: File
): Promise<string> {
  const existing = await getActiveTenantByProperty(data.propertyId)

  const batch = writeBatch(db)

  if (existing) {
    const existingRef = doc(db, COL, existing.id)
    batch.update(existingRef, {
      isActive: false,
      moveOutDate: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
  }

  const newRef = doc(collection(db, COL))

  let photoUrl = data.photoUrl
  if (photoFile) {
    const fileToUpload = photoFile.size > 2 * 1024 * 1024
      ? await compressImage(photoFile)
      : photoFile
    photoUrl = await fileToBase64(fileToUpload)
  }

  batch.set(newRef, {
    ...data,
    photoUrl: photoUrl || null,
    isActive: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })

  const propertyRef = doc(db, 'properties', data.propertyId)
  batch.update(propertyRef, {
    currentTenantId: newRef.id,
    updatedAt: Timestamp.now(),
  })

  await batch.commit()
  return newRef.id
}

export async function updateTenant(id: string, data: Partial<Tenant>, photoFile?: File): Promise<void> {
  let photoUrl = data.photoUrl
  if (photoFile) {
    const fileToUpload = photoFile.size > 2 * 1024 * 1024
      ? await compressImage(photoFile)
      : photoFile
    photoUrl = await fileToBase64(fileToUpload)
  }

  await updateDoc(doc(db, COL, id), {
    ...data,
    ...(photoUrl ? { photoUrl } : {}),
    updatedAt: Timestamp.now(),
  })
}

export async function deactivateTenant(id: string, propertyId: string): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(db, COL, id), {
    isActive: false,
    moveOutDate: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
  batch.update(doc(db, 'properties', propertyId), {
    currentTenantId: null,
    updatedAt: Timestamp.now(),
  })
  await batch.commit()
}