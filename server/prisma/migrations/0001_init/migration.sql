-- This is a simplified initial migration for SQLite.
CREATE TABLE Restaurant (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT DEFAULT 'PKR',
  timezone TEXT NOT NULL,
  locale TEXT NOT NULL,
  serviceFee REAL DEFAULT 0,
  tipOptions TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME
);

CREATE TABLE "Table" (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  status TEXT NOT NULL,
  currentSessionId TEXT UNIQUE,
  restaurantId TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME,
  FOREIGN KEY (restaurantId) REFERENCES Restaurant(id)
);

CREATE TABLE Session (
  id TEXT PRIMARY KEY,
  tableId TEXT NOT NULL,
  openedByUserId TEXT NOT NULL,
  openedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  closedAt DATETIME,
  pax INTEGER NOT NULL,
  notes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME,
  FOREIGN KEY (tableId) REFERENCES "Table"(id)
);

CREATE TABLE User (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL,
  pinHash TEXT NOT NULL,
  status TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME
);

CREATE TABLE MenuCategory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sortOrder INTEGER NOT NULL,
  visible INTEGER DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME
);

CREATE TABLE MenuItem (
  id TEXT PRIMARY KEY,
  categoryId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  photoUrl TEXT,
  tags TEXT,
  allergens TEXT,
  active INTEGER DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME,
  FOREIGN KEY (categoryId) REFERENCES MenuCategory(id)
);

-- Additional tables omitted for brevity in dev sample.
