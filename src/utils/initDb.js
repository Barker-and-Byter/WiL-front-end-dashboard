import Database from "better-sqlite3";
import bcrypt from 'bcrypt';

const db = new Database('credentials.db');

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT
    )
    `);

const testEmail = 'dev@gmail.com';
const saltRounds = 10;
const passwordHash = bcrypt.hashSync('password123', saltRounds);

const insert = db.prepare('INSERT OR IGNORE INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)')
insert.run('1',testEmail,passwordHash,"jared")

console.log("database succesfully initialised")
