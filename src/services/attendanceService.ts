import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/firebase/config'
import type { AttendanceRecord, OshiEvent } from '@/types'

// 参戦記録（推し活Wrapped の集計元）。
// 本番: users/{uid}/attendance/{eventId}。デモ: localStorage。

const DEMO_KEY = 'oshihub_demo_attendance'

function readDemo(): AttendanceRecord[] {
  const raw = localStorage.getItem(DEMO_KEY)
  return raw ? (JSON.parse(raw) as AttendanceRecord[]) : []
}
function writeDemo(records: AttendanceRecord[]) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(records))
}

/** 参戦記録を全件取得 */
export async function fetchAttendance(uid: string): Promise<AttendanceRecord[]> {
  if (!isFirebaseConfigured || !db) return readDemo()
  const snap = await getDocs(collection(db, 'users', uid, 'attendance'))
  return snap.docs.map((d) => d.data() as AttendanceRecord)
}

/** 参戦のON/OFFを切り替えて保存 */
export async function setAttendance(
  uid: string,
  event: OshiEvent,
  attended: boolean
): Promise<void> {
  const record: AttendanceRecord = {
    eventId: event.id,
    groupId: event.groupId,
    category: event.category,
    startAt: event.startAt,
    title: event.title,
    markedAt: new Date().toISOString(),
  }

  if (!isFirebaseConfigured || !db) {
    const all = readDemo().filter((r) => r.eventId !== event.id)
    if (attended) all.push(record)
    writeDemo(all)
    return
  }

  const ref = doc(db, 'users', uid, 'attendance', event.id)
  if (attended) await setDoc(ref, record)
  else await deleteDoc(ref)
}
