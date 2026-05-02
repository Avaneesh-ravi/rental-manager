// src/lib/firebase/properties.ts
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, orderBy, Timestamp, where
} from 'firebase/firestore'
import { db } from './config'
import type { Property } from '../types'

const COL = 'properties'

function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate()
  if (v instanceof Date) return v
  return new Date(v as string)
}

function mapDoc(id: string, data: Record<string, unknown>): Property {
  return {
    id,
    ...(data as Omit<Property, 'id' | 'createdAt' | 'updatedAt'>),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

export async function getProperties(): Promise<Property[]> {
  const q = query(collection(db, COL), orderBy('propertyNumber'))
  const snap = await getDocs(q)
  return snap.docs.map(d => mapDoc(d.id, d.data() as Record<string, unknown>))
}

export async function getProperty(id: string): Promise<Property | null> {
  const snap = await getDoc(doc(db, COL, id))
  if (!snap.exists()) return null
  return mapDoc(snap.id, snap.data() as Record<string, unknown>)
}

export async function addProperty(data: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
  return ref.id
}

export async function updateProperty(id: string, data: Partial<Property>): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: Timestamp.now(),
  })
}

export async function deleteProperty(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}

export async function getPropertiesByType(type: 'house' | 'shop'): Promise<Property[]> {
  const q = query(collection(db, COL), where('type', '==', type), orderBy('propertyNumber'))
  const snap = await getDocs(q)
  return snap.docs.map(d => mapDoc(d.id, d.data() as Record<string, unknown>))
}
