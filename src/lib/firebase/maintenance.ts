// src/lib/firebase/maintenance.ts
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, query, orderBy, Timestamp, where
} from 'firebase/firestore'
import { db } from './config'
import type { MaintenanceRequest } from '../types'

const COL = 'maintenance'

function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate()
  if (v instanceof Date) return v
  return new Date(v as string)
}

function mapDoc(id: string, data: Record<string, unknown>): MaintenanceRequest {
  return {
    id,
    ...(data as Omit<MaintenanceRequest, 'id' | 'createdAt' | 'updatedAt' | 'dateRaised' | 'dateResolved'>),
    dateRaised: toDate(data.dateRaised),
    dateResolved: data.dateResolved ? toDate(data.dateResolved) : undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

export async function getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
  const q = query(collection(db, COL), orderBy('dateRaised', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => mapDoc(d.id, d.data() as Record<string, unknown>))
}

export async function getMaintenanceByProperty(propertyId: string): Promise<MaintenanceRequest[]> {
  const q = query(collection(db, COL), where('propertyId', '==', propertyId), orderBy('dateRaised', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => mapDoc(d.id, d.data() as Record<string, unknown>))
}

export async function addMaintenanceRequest(
  data: Omit<MaintenanceRequest, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    dateRaised: Timestamp.fromDate(data.dateRaised instanceof Date ? data.dateRaised : new Date(data.dateRaised)),
    dateResolved: data.dateResolved
      ? Timestamp.fromDate(data.dateResolved instanceof Date ? data.dateResolved : new Date(data.dateResolved))
      : null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
  return ref.id
}

export async function updateMaintenanceRequest(
  id: string,
  data: Partial<MaintenanceRequest>
): Promise<void> {
  const payload: Record<string, unknown> = { ...data, updatedAt: Timestamp.now() }
  if (data.dateRaised) payload.dateRaised = Timestamp.fromDate(
    data.dateRaised instanceof Date ? data.dateRaised : new Date(data.dateRaised)
  )
  if (data.dateResolved) payload.dateResolved = Timestamp.fromDate(
    data.dateResolved instanceof Date ? data.dateResolved : new Date(data.dateResolved)
  )
  await updateDoc(doc(db, COL, id), payload)
}

export async function deleteMaintenanceRequest(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}