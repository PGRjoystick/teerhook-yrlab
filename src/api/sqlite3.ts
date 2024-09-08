const sqlite3 = require('sqlite3').verbose();
import * as cli from "../cli/ui";
let db: any;

export function initializeDatabase() {
    // Connect to SQLite database
    db = new sqlite3.Database('./db.sqlite', (err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Connected to the SQLite database.');
    });

    // Execute SQL commands to create tables
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location_code TEXT NOT NULL
        );`);

        db.run(`CREATE TABLE IF NOT EXISTS phone_numbers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            phone_number TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );`);
    });
}

export function getUsernameByPhoneNumber(phoneNumber: string): Promise<string> {
    return new Promise((resolve, reject) => {
        db.get(`SELECT users.name
                FROM users
                JOIN phone_numbers ON users.id = phone_numbers.user_id
                WHERE phone_numbers.phone_number = ?`, [phoneNumber], (err, row) => {
            if (err) {
                reject(err);
            } else if (row) {
                resolve(row.name);
            } else {
                resolve('No user found for this phone number');
            }
        });
    });
}

export function getPhoneNumbersByLocation(location: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
        db.all(`SELECT phone_numbers.phone_number
                FROM phone_numbers
                JOIN users ON users.id = phone_numbers.user_id
                WHERE users.location_code = ?`, [location], (err, rows) => {
            if (err) {
                console.error(err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

export function getPhoneNumbersByLocationPrefix(locationPrefix: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
        db.all(`SELECT users.name, phone_numbers.phone_number
                FROM phone_numbers
                JOIN users ON users.id = phone_numbers.user_id
                WHERE users.location_code LIKE ?`, [locationPrefix + '%'], (err, rows) => {
            if (err) {
                console.error(err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

export function getPhoneNumbersByUser(username: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
        db.all(`SELECT phone_numbers.phone_number
                FROM phone_numbers
                JOIN users ON users.id = phone_numbers.user_id
                WHERE users.name = ?`, [username], (err, rows) => {
            if (err) {
                console.error(err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

export function getAllPhoneNumbers(): Promise<any[]> {
    return new Promise((resolve, reject) => {
        db.all(`SELECT phone_numbers.phone_number
                 FROM phone_numbers`, [], (err, rows) => {
            if (err) {
                console.error(err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

export function addUser(username: string, location: string, phoneNumbers: string[]) {
    db.run(`INSERT INTO users (name, location_code) VALUES (?, ?)`, [username, location], function(err) {
        if (err) {
            return console.log(err.message);
        }
        let userId = this.lastID;
        phoneNumbers.forEach(phoneNumber => {
            db.run(`INSERT INTO phone_numbers (user_id, phone_number) VALUES (?, ?)`, [userId, phoneNumber], (err) => {
                if (err) {
                    return console.log(err.message);
                }
            cli.print(`[DB] user ${username} telah di tambahkan ke dalam DB!`)
            });
        });
    });
}

export async function deleteUser(username: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        // First, get the user's ID
        db.get(`SELECT id FROM users WHERE name = ?`, [username], (err, row) => {
            if (err) {
                console.log(err.message);
                return reject(err);
            }
            if (row) {
                let userId = row.id;

                // Delete the user's phone numbers
                db.run(`DELETE FROM phone_numbers WHERE user_id = ?`, [userId], (err) => {
                    if (err) {
                        console.log(err.message);
                        return reject(err);
                    }

                    // Then delete the user
                    db.run(`DELETE FROM users WHERE id = ?`, [userId], (err) => {
                        if (err) {
                            console.log(err.message);
                            return reject(err);
                        }
                        cli.print(`[DB] User ${username} telah dihapus!`);
                        resolve(true);
                    });
                });
            } else {
                cli.print(`[DB] User ${username} tidak di temukan.`);
                resolve(false);
            }
        });
    });
}