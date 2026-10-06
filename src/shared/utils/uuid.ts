import { randomUUID } from 'expo-crypto'
import type { UUID } from '../../domain/models'

export function createUUID(): UUID {
  return randomUUID() as UUID
}

export function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
