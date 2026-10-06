import { isUUID } from './uuid'

describe('isUUID', () => {
  it('accepts UUID values and rejects other strings', () => {
    expect(isUUID('a3d73b08-7d4c-4ecf-b5f4-62da231ad718')).toBe(true)
    expect(isUUID('not-a-uuid')).toBe(false)
  })
})
