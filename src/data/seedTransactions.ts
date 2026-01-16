import type { Transaction } from '../lib/supabase'

const formatDate = (date: Date) => date.toISOString().split('T')[0]

const dateWithMonthOffset = (monthOffset: number, day: number) => {
  const date = new Date()
  date.setMonth(date.getMonth() - monthOffset)
  date.setDate(day)
  return formatDate(date)
}

const baseTransaction = {
  user_id: 'seed-user',
  account_id: 'seed-account',
  plaid_transaction_id: 'seed',
  currency_code: 'USD',
  category: ['Service'],
  category_id: null,
  primary_category: 'Service',
  datetime: null,
  authorized_date: null,
  pending: false,
  payment_channel: 'online',
  location_city: null,
  location_region: null,
  location_country: 'US',
}

const makeTransaction = (
  index: number,
  merchant: string,
  amount: number,
  date: string,
  category: string
): Transaction => ({
  ...baseTransaction,
  id: `seed-${merchant.toLowerCase().replace(/\s+/g, '-')}-${index}`,
  name: merchant,
  merchant_name: merchant,
  amount,
  category: [category],
  primary_category: category,
  date,
  created_at: `${date}T00:00:00Z`,
  updated_at: `${date}T00:00:00Z`,
})

export const seededTransactions: Transaction[] = [
  makeTransaction(1, 'Netflix', 15.99, dateWithMonthOffset(3, 4), 'Recreation'),
  makeTransaction(2, 'Netflix', 15.99, dateWithMonthOffset(2, 4), 'Recreation'),
  makeTransaction(3, 'Netflix', 15.99, dateWithMonthOffset(1, 4), 'Recreation'),
  makeTransaction(4, 'Netflix', 15.99, dateWithMonthOffset(0, 4), 'Recreation'),
  makeTransaction(5, 'Spotify', 9.99, dateWithMonthOffset(3, 18), 'Recreation'),
  makeTransaction(6, 'Spotify', 9.99, dateWithMonthOffset(2, 18), 'Recreation'),
  makeTransaction(7, 'Spotify', 9.99, dateWithMonthOffset(1, 18), 'Recreation'),
  makeTransaction(8, 'Spotify', 9.99, dateWithMonthOffset(0, 18), 'Recreation'),
  makeTransaction(9, 'AT&T Internet', 74.5, dateWithMonthOffset(3, 22), 'Service'),
  makeTransaction(10, 'AT&T Internet', 74.5, dateWithMonthOffset(2, 22), 'Service'),
  makeTransaction(11, 'AT&T Internet', 74.5, dateWithMonthOffset(1, 22), 'Service'),
  makeTransaction(12, 'AT&T Internet', 74.5, dateWithMonthOffset(0, 22), 'Service'),
  makeTransaction(13, 'Whole Foods', 68.42, dateWithMonthOffset(0, 16), 'Food and Drink'),
  makeTransaction(14, 'Delta Airlines', 420.0, dateWithMonthOffset(1, 9), 'Travel'),
]
