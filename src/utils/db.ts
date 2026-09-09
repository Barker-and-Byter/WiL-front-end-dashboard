import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';

const db = new Database('credentials.db');

export interface User {
    id: string;
    email: string;
    password_hash: string;
    name?: string;
}

export function GetUserFromDb(email: string): User | null {
    const statement = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = statement.get(email) as User | undefined;
    return user || null;

}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
}