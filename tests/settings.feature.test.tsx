import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import type { PropsWithChildren } from 'react'
import migration from '../drizzle/0000_wandering_bulldozer.sql'
import { AppSettingsProvider } from '../src/application/settings/AppSettingsContext'
import { SettingsService } from '../src/application/services/SettingsService'
import { CreateBookingService } from '../src/application/services/CreateBookingService'
import { DEFAULT_PRICING_RATES } from '../src/domain/models/defaults'
import { SqliteSettingsRepository } from '../src/data/repositories/sqlite/SqliteSettingsRepository'
import { SqliteBookingRepository } from '../src/data/repositories/sqlite/SqliteBookingRepository'
import type { UUID } from '../src/domain/models'
import { createMemorySqlite } from './support/memorySqlite'
import SettingsScreen from '../app/(tabs)/settings'
import DashboardScreen from '../app/(tabs)/index'

jest.mock('expo-router', () => ({
  Link: ({ children }: PropsWithChildren) => children,
}))

describe('owner settings feature', () => {
  it('saves the display name and price defaults to SQLite for future bookings', async () => {
    const { database, client } = await createMemorySqlite(migration)
    const service = new SettingsService(new SqliteSettingsRepository(client), () => '2026-10-07T10:00:00.000Z')
    const bookingRepository = new SqliteBookingRepository(client)
    let idCounter = 0
    const existingBooking = await new CreateBookingService(bookingRepository, {
      rates: DEFAULT_PRICING_RATES,
      createId: () => `10000000-0000-4000-8000-${String(++idCounter).padStart(12, '0')}` as UUID,
      now: () => '2026-09-01T10:00:00.000Z',
    }).create({
      booking: {
        guestName: 'Existing guest', cellphone: '09171234567', pax: 2,
        checkInDate: '2026-12-01', checkOutDate: '2026-12-02',
      },
      pricing: {},
    })

    try {
      const { rerender } = render(
        <AppSettingsProvider service={service}>
          <SettingsScreen />
        </AppSettingsProvider>,
      )

      fireEvent.changeText(await screen.findByDisplayValue('Bukora'), 'Cenere Ledger')
      fireEvent.changeText(screen.getByLabelText('Night-use package (PHP)'), '6100')
      fireEvent.press(screen.getByRole('button', { name: 'Save settings' }))

      expect(await screen.findByText('Settings saved on this device.')).toBeTruthy()
      await waitFor(async () => {
        await expect(service.load()).resolves.toMatchObject({
          displayName: 'Cenere Ledger',
          nightUseAmountMinor: 610000,
        })
      })
      expect((await bookingRepository.findById(existingBooking.booking.id))?.lineItems[0].totalAmountMinor).toBe(590000)

      rerender(
        <AppSettingsProvider service={service}>
          <DashboardScreen />
        </AppSettingsProvider>,
      )
      expect(screen.getByText('Cenere Ledger')).toBeTruthy()
      expect(screen.getByText('CENERE BEACH HOUSE')).toBeTruthy()
    } finally {
      database.close()
    }
  })
})
