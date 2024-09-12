const sqlite3 = require('sqlite3').verbose();
import * as cli from "../cli/ui";
let db: any;
import fs from 'fs';
import path from 'path';

export function getAllPhoneNumbersFromJson(): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const filePath = path.join(__dirname, '../../phoneNumbers.json');
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error(err.message);
                reject(err);
            } else {
                try {
                    const phoneNumbers = JSON.parse(data);
                    resolve(phoneNumbers);
                } catch (parseErr) {
                    console.error(parseErr.message);
                    reject(parseErr);
                }
            }
        });
    });
}

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

        db.run(`CREATE TABLE IF NOT EXISTS packages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            package_type TEXT NOT NULL UNIQUE,
            price INTEGER NOT NULL,
            license_key TEXT NOT NULL
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

export function addPhoneNumber(userId: string, phoneNumber: string) {
    if (userId === "Seseorang") {
        // Allow multiple entries for "someone" with different phone numbers
        db.run(`INSERT INTO phone_numbers (user_id, phone_number) VALUES (?, ?)`, [userId, phoneNumber], function(err) {
            if (err) {
                return console.log(err.message);
            }
            cli.print(`[DB] Phone number ${phoneNumber} telah di tambahkan untuk user ${userId} ke dalam DB!`);
        });
    } else {
        // Check for existing entry for other user IDs
        db.get(`SELECT * FROM phone_numbers WHERE user_id = ? AND phone_number = ?`, [userId, phoneNumber], function(err, row) {
            if (err) {
                return console.log(err.message);
            }
            if (row) {
                cli.print(`[DB] Phone number ${phoneNumber} already exists for user ${userId}.`);
            } else {
                db.run(`INSERT INTO phone_numbers (user_id, phone_number) VALUES (?, ?)`, [userId, phoneNumber], function(err) {
                    if (err) {
                        return console.log(err.message);
                    }
                    cli.print(`[DB] Phone number ${phoneNumber} telah di tambahkan untuk user ${userId} ke dalam DB!`);
                });
            }
        });
    }
}

export function getUserIdByPhoneNumber(phoneNumber: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
        db.get(`SELECT user_id FROM phone_numbers WHERE phone_number = ?`, [phoneNumber], function(err, row) {
            if (err) {
                console.log(err.message);
                reject(err);
            } else {
                if (row) {
                    resolve(row.user_id);
                } else {
                    resolve(null);
                }
            }
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

export function changePackageKey(packageType: string, newKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE packages SET license_key = ? WHERE package_type = ?`, [newKey, packageType], function(err) {
            if (err) {
                console.error(err.message);
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

export function changePackagePrice(packageType: string, newPrice: number): Promise<void> {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE packages SET price = ? WHERE package_type = ?`, [newPrice, packageType], function(err) {
            if (err) {
                console.error(err.message);
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

export function createPackage(packageType: string, price: number, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO packages (package_type, price, license_key) VALUES (?, ?, ?)`, [packageType, price, key], function(err) {
            if (err) {
                console.error(err.message);
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

export function getLicenseKey(packageType: string): Promise<string> {
    return new Promise((resolve, reject) => {
        db.get(`SELECT license_key FROM packages WHERE package_type = ?`, [packageType], (err, row) => {
            if (err) {
                console.error(err.message);
                reject(err);
            } else if (row) {
                resolve(row.license_key);
            } else {
                reject(new Error('Package not found'));
            }
        });
    });
}

export function getPackages(): Promise<{ package_type: string, price: number, license_key: string }[]> {
    return new Promise((resolve, reject) => {
        db.all(`SELECT package_type, price, license_key FROM packages`, [], (err, rows) => {
            if (err) {
                console.error(err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

export async function deletePackage(packageType: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        // First, check if the package exists
        db.get(`SELECT id FROM packages WHERE package_type = ?`, [packageType], (err, row) => {
            if (err) {
                console.log(err.message);
                return reject(err);
            }
            if (row) {
                let packageId = row.id;

                // Delete the package
                db.run(`DELETE FROM packages WHERE id = ?`, [packageId], (err) => {
                    if (err) {
                        console.log(err.message);
                        return reject(err);
                    }
                    console.log(`[DB] Package ${packageType} has been deleted!`);
                    resolve(true);
                });
            } else {
                console.log(`[DB] Package ${packageType} not found.`);
                resolve(false);
            }
        });
    });
}