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

    // Execute SQL commands to create tables and add new columns
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            user_id TEXT UNIQUE NOT NULL
        );`);

        db.run(`CREATE TABLE IF NOT EXISTS newsletter (
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

        // Create Parameters table
        db.run(`CREATE TABLE IF NOT EXISTS parameters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            active_package TEXT,
            packageExpires TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );`);
    });
}

export function saveParam(userID: string, paramToChange: string, value: any) {
    // Validate the parameter to change
    const validParams = [
        'active_package', 'packageExpires'
    ];
    
    if (!validParams.includes(paramToChange)) {
        console.error(`Invalid parameter: ${paramToChange}`);
        return;
    }

    // Update the parameter in the database
    db.serialize(() => {
        // Get the user ID from the users table
        db.get(`SELECT id FROM users WHERE user_id = ?`, [userID], (err, row) => {
            if (err) {
                console.error(err.message);
                return;
            }
            if (!row) {
                console.error(`User not found: ${userID}`);
                return;
            }
            const userIdDb = row.id;

            // Update the parameter in the parameters table
            const sql = `UPDATE parameters SET ${paramToChange} = ? WHERE user_id = ?`;
            db.run(sql, [value, userIdDb], (err) => {
                if (err) {
                    console.error(err.message);
                } else {
                    console.log(`Parameter ${paramToChange} updated for user ${userID}`);
                }
            });
        });
    });
}

export function readParam(userID: string, parameterToGet: string): Promise<any> {
    return new Promise((resolve, reject) => {
        // Validate the parameter to get
        const validParams = [
            'active_package', 'packageExpires'
        ];
        
        if (!validParams.includes(parameterToGet)) {
            reject(new Error(`Invalid parameter: ${parameterToGet}`));
            return;
        }

        // Get the user ID from the users table
        db.get(`SELECT id FROM users WHERE user_id = ?`, [userID], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (!row) {
                reject(new Error(`User not found: ${userID}`));
                return;
            }
            const userIdDb = row.id;

            // Get the parameter from the parameters table
            const sql = `SELECT ${parameterToGet} FROM parameters WHERE user_id = ?`;
            db.get(sql, [userIdDb], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!row) {
                    reject(new Error(`Parameter not found for user: ${userID}`));
                    return;
                }
                resolve(row[parameterToGet]);
            });
        });
    });
}

export function initializeUserParam(userID: string): Promise<void> {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Check if the user already exists
            db.get(`SELECT id FROM users WHERE user_id = ?`, [userID], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (row) {
                    // User already exists, no need to initialize
                    resolve();
                    return;
                }

                // Insert new user into users table
                db.run(`INSERT INTO users (user_id) VALUES (?)`, [userID], function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    const userIdDb = this.lastID;

                    // Insert default parameters into parameters table
                    db.run(`INSERT INTO parameters (user_id, active_package, packageExpires) VALUES (?, ?, ?)`, 
                    [
                        userIdDb, 
                        null,  // active_package
                        null  // packageExpires
                    ], (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            });
        });
    });
}

export function getUsernameByPhoneNumber(phoneNumber: string): Promise<string> {
    return new Promise((resolve, reject) => {
        db.get(`SELECT users.name
                FROM users
                JOIN newsletter ON users.id = newsletter.user_id
                WHERE newsletter.phone_number = ?`, [phoneNumber], (err, row) => {
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
        db.all(`SELECT newsletter.phone_number
                FROM newsletter
                JOIN users ON users.id = newsletter.user_id
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
        db.all(`SELECT users.name, newsletter.phone_number
                FROM newsletter
                JOIN users ON users.id = newsletter.user_id
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
        db.all(`SELECT newsletter.phone_number
                FROM newsletter
                JOIN users ON users.id = newsletter.user_id
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
        db.all(`SELECT newsletter.phone_number
                 FROM newsletter`, [], (err, rows) => {
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
            db.run(`INSERT INTO newsletter (user_id, phone_number) VALUES (?, ?)`, [userId, phoneNumber], (err) => {
                if (err) {
                    return console.log(err.message);
                }
            cli.print(`[DB] user ${username} telah di tambahkan ke dalam DB!`)
            });
        });
    });
}
export function getUserAndPhoneNumbers(): Promise<{ userId: string, phoneNumber: string }[]> {
    return new Promise((resolve, reject) => {
        db.all(`SELECT user_id, phone_number FROM newsletter`, [], (err, rows) => {
            if (err) {
                console.log(err.message);
                return reject(err);
            }
            resolve(rows.map(row => ({ userId: row.user_id, phoneNumber: row.phone_number })));
        });
    });
}

export function addPhoneNumber(userId: string, phoneNumber: string) {
    if (userId === "Seseorang") {
        // Allow multiple entries for "someone" with different phone numbers
        db.run(`INSERT INTO newsletter (user_id, phone_number) VALUES (?, ?)`, [userId, phoneNumber], function(err) {
            if (err) {
                return console.log(err.message);
            }
            cli.print(`[DB] Nomor telepon ${phoneNumber} telah ditambahkan untuk user ${userId} ke dalam DB!`);
        });
    } else {
        // Check for existing entry for other user IDs
        db.get(`SELECT * FROM newsletter WHERE user_id = ? AND phone_number = ?`, [userId, phoneNumber], function(err, row) {
            if (err) {
                return console.log(err.message);
            }
            if (row) {
                cli.print(`[DB] Nomor telepon ${phoneNumber} sudah ada untuk user ${userId}.`);
            } else {
                db.run(`INSERT INTO newsletter (user_id, phone_number) VALUES (?, ?)`, [userId, phoneNumber], function(err) {
                    if (err) {
                        return console.log(err.message);
                    }
                    cli.print(`[DB] Nomor telepon ${phoneNumber} telah di tambahkan untuk user ${userId} ke dalam DB!`);
                });
            }
        });
    }
}

export function deletePhoneNumber(phoneNumber: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        // Check if the phone number exists
        db.get(`SELECT * FROM newsletter WHERE phone_number = ?`, [phoneNumber], function(err, row) {
            if (err) {
                console.log(err.message);
                return reject(err);
            }
            if (row) {
                // Phone number exists, proceed to delete
                db.run(`DELETE FROM newsletter WHERE phone_number = ?`, [phoneNumber], function(err) {
                    if (err) {
                        console.log(err.message);
                        return reject(err);
                    }
                    cli.print(`[DB] Phone number ${phoneNumber} has been deleted!`);
                    resolve(true);
                });
            } else {
                // Phone number does not exist
                cli.print(`[DB] Phone number ${phoneNumber} not found.`);
                resolve(false);
            }
        });
    });
}

export function getUserIdByPhoneNumber(phoneNumber: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
        db.get(`SELECT user_id FROM newsletter WHERE phone_number = ?`, [phoneNumber], function(err, row) {
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
                db.run(`DELETE FROM newsletter WHERE user_id = ?`, [userId], (err) => {
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
        // Check if the package type already exists
        db.get(`SELECT 1 FROM packages WHERE package_type = ?`, [packageType], function(err, row) {
            if (err) {
                console.error(err.message);
                return reject(err);
            }
            if (row) {
                // Package type already exists
                console.log(`[DB] Package type ${packageType} already exists.`);
                return reject(new Error(`Package type ${packageType} already exists.`));
            } else {
                // Insert the new package
                db.run(`INSERT INTO packages (package_type, price, license_key) VALUES (?, ?, ?)`, [packageType, price, key], function(err) {
                    if (err) {
                        console.error(err.message);
                        return reject(err);
                    } else {
                        resolve();
                    }
                });
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

export function getPackages(packageType?: string): Promise<{ package_type: string, price: number, license_key: string }[]> {
    return new Promise((resolve, reject) => {
        let query = `SELECT package_type, price, license_key FROM packages`;
        const params: any[] = [];

        if (packageType) {
            query += ` WHERE package_type = ?`;
            params.push(packageType);
        }

        db.all(query, params, (err, rows) => {
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