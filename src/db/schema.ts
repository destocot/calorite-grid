import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

const base = {
  id: uuid('id')
    .default(sql`pg_catalog.gen_random_uuid()`)
    .primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}

export const users = pgTable('users', {
  ...base,
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  username: text('username').unique(),
  displayUsername: text('display_username'),
})

export const sessions = pgTable(
  'sessions',
  {
    ...base,
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [index('sessions_userId_idx').on(table.userId)],
)

export const accounts = pgTable(
  'accounts',
  {
    ...base,
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
  },
  (table) => [index('accounts_userId_idx').on(table.userId)],
)

export const verifications = pgTable(
  'verifications',
  {
    ...base,
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  (table) => [index('verifications_identifier_idx').on(table.identifier)],
)

export const foods = pgTable(
  'foods',
  {
    ...base,
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    calories: integer('calories').notNull(),
    showOnGrid: boolean('show_on_grid').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => [index('foods_userId_idx').on(table.userId)],
)

export const entries = pgTable(
  'entries',
  {
    ...base,
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    foodId: uuid('food_id')
      .notNull()
      .references(() => foods.id, { onDelete: 'cascade' }),
    localDate: date('local_date', { mode: 'string' }).notNull(),
    calories: integer('calories').notNull(),
  },
  (table) => [
    unique('entries_userId_foodId_localDate_unq').on(
      table.userId,
      table.foodId,
      table.localDate,
    ),
    index('entries_userId_localDate_idx').on(table.userId, table.localDate),
  ],
)

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  foods: many(foods),
  entries: many(entries),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  users: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  users: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))

export const foodsRelations = relations(foods, ({ one, many }) => ({
  users: one(users, {
    fields: [foods.userId],
    references: [users.id],
  }),
  entries: many(entries),
}))

export const entriesRelations = relations(entries, ({ one }) => ({
  users: one(users, {
    fields: [entries.userId],
    references: [users.id],
  }),
  foods: one(foods, {
    fields: [entries.foodId],
    references: [foods.id],
  }),
}))
