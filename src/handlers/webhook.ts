import express from 'express';
import bodyParser from 'body-parser';
import { client } from '../index'
import { PaymentPayload, LastTransactionPayload } from '../types/trakteer';
import { activatePackage, checkLastTransaction, createUser, generateRandomString, sendEmail } from '../utils';
import * as cli from "../cli/ui";
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { addPhoneNumber, getPackages, initializeUserParam } from '../api/sqlite3';
const readFile = promisify(fs.readFile);

// Function to initialize webhook server
export function initializeWebhookServer() {
    // Initialize Express app
    const app = express();
    const PORT = 3020;

    // Middleware to parse JSON bodies
    app.use(bodyParser.json());

    // Your predefined webhook token for verification
    const WEBHOOK_TOKEN = process.env.TRAKTEER_WEBHOOK_TOKEN;

    // POST route to handle webhook
    app.post('/webhook', async (req, res) => {
        // Extract the token from headers
        const token = req.headers['x-webhook-token'];

        // Verify the token
        if (token !== WEBHOOK_TOKEN) {
            return res.status(403).send('Invalid webhook token');
        }

        // Process the payment payload
        const paymentPayload: PaymentPayload = req.body;
        cli.print(`[Donasi] Pembayaran donasi diterima sebesar Rp. ${paymentPayload.price} dari ${paymentPayload.supporter_name} ${paymentPayload.supporter_message ? `dengan pesan ${paymentPayload.supporter_message}` : ``}`);
        let phoneNumber;
        let email;
        let statusMessage = `Donasi terbaru : ${paymentPayload.price} dari ${paymentPayload.supporter_name} ${paymentPayload.supporter_message ? `dengan pesan ${paymentPayload.supporter_message}` : ``} Makasih banyak ${paymentPayload.supporter_name} atas donasi nya yah 🥰 Emuach~ 😘`;
        
        // Log the total number of characters in statusMessage
        const totalChar = statusMessage.length;
        
        // Regex patterns for phone number and email
        const phoneRegex = /(?:\+62|62|08)[0-9]{8,15}/g;
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        
        // Function to normalize phone number
        function normalizePhoneNumber(phoneNumber: string): string {
            if (phoneNumber.startsWith('08')) {
                return '628' + phoneNumber.substring(2); // Correctly convert 08 to 628
            } else if (phoneNumber.startsWith('+62')) {
                return '62' + phoneNumber.substring(3); // Remove the + and ensure it starts with 62
            }
            return phoneNumber;
        }
        
        // Check if the supporter message contains a phone number or email
        if (paymentPayload.supporter_message) {
            const phoneMatches = paymentPayload.supporter_message.match(phoneRegex);
            const emailMatches = paymentPayload.supporter_message.match(emailRegex);
        
            if (phoneMatches && phoneMatches.length > 0) {
                phoneNumber = normalizePhoneNumber(phoneMatches[0]) + '@c.us'; // Get the first phone number and normalize it
            }
        
            if (emailMatches && emailMatches.length > 0) {
                email = emailMatches[0]; // Get the first email address
            }
        } else {
            // If not, check the last transaction in the API
            const lastTransactionPayload: LastTransactionPayload | any = await checkLastTransaction();
            if (lastTransactionPayload) {
                const lastTransaction = lastTransactionPayload.result.data[0];
                // Fetch the phone number and email from support message if it exists
                if (lastTransaction.support_message) {
                    const phoneMatches = lastTransaction.support_message.match(phoneRegex);
                    const emailMatches = lastTransaction.support_message.match(emailRegex);
        
                    if (phoneMatches && phoneMatches.length > 0) {
                        phoneNumber = normalizePhoneNumber(phoneMatches[0]) + '@c.us'; // Get the first phone number and normalize it
                    }
        
                    if (emailMatches && emailMatches.length > 0) {
                        email = emailMatches[0]; // Get the first email address
                    }
                }
            }
        }
        
        // trim status message if its more than 145 characters
        if (totalChar > 145) {
            statusMessage = `Hi, Ayana disini 😊. Donasi terbaru : ${paymentPayload.price} dari ${paymentPayload.supporter_name} Makasih banyak ${paymentPayload.supporter_name} atas donasi nya yah 🥰 Emuach~ 😘`;
            client.setStatus(statusMessage);
        } else {
            client.setStatus(statusMessage);
        }

        // Fetch available packages
        const packages = await getPackages();

        console.log('Fetched packages:', packages);

        // Determine the appropriate package based on the donation amount
        let selectedPackage: any = null;
        for (const pkg of packages) {
            if (paymentPayload.price >= pkg.price) {
                selectedPackage = pkg;
            }
        }

        console.log('Selected package:', selectedPackage);

        // send whatsapp message if the supporter message contains phone number
        if (phoneNumber) {
            cli.print(`[Donasi] Mengirim license key dan ucapan terima kasih dan rewards ke ${phoneNumber}`);
            if (selectedPackage) {
                await initializeUserParam(phoneNumber, paymentPayload.supporter_name);
                await activatePackage(phoneNumber ,selectedPackage.package_type);
                client.sendMessage(phoneNumber, `Yay 🥳 Terima kasih telah berdonasi sebesar Rp. ${paymentPayload.price} untuk paket ${selectedPackage.package_type}! 🔑 dibawah ini adalah kode paket ${selectedPackage.package_type} untuk kamu. Makasih banyak yah sekali lagi 😉`);
                await new Promise(resolve => setTimeout(resolve, 500));
                client.sendMessage(phoneNumber, `${selectedPackage.license_key}`);
                await new Promise(resolve => setTimeout(resolve, 500));
                client.sendMessage(phoneNumber, `Untuk melihat kembali kode paket ini jika terjadi perubahan kode, kirim pesan !status ke whatsapp ini. Selamat menikmati manga dari website kami 📚🎉`);
            }
            await addPhoneNumber(paymentPayload.supporter_name, phoneNumber);
        }

        // Send email if the supporter message contains email
        console.log('###################### Email:', email);
        if (email) {
            cli.print(`[Donasi] Mengirim license key dan ucapan terima kasih dan rewards ke ${email}`);
            if (selectedPackage) {
                let username = paymentPayload.supporter_name;
                if (username === 'Seseorang') {
                    username = generateRandomString(8); // Generate a random username if the supporter name is "Seseorang"
                }
                const newUser = {
                    username: username,
                    email: email,
                    password: generateRandomString(8),
                    membership_level: selectedPackage.id
                };
                const userResult = await createUser(newUser);
                await sendEmail(email, 'Terima Kasih atas Donasi Anda!', `Yay 🥳 Terima kasih telah berdonasi sebesar Rp. ${paymentPayload.price} untuk paket ${selectedPackage.package_type}! 🔑 dibawah ini adalah detail akun yurilab untuk kamu.\n\nUsername : ${newUser.username}\nPassword : ${newUser.password}\nEmail : ${email}\n\nMakasih banyak yah sekali lagi 😉`);
            }
        }

        // Send a response back to the external service
        res.send('Payment processed successfully');
    });

    // Start the server
    app.listen(PORT, () => {
        console.log(`Server webhook untuk donasi berjalan pada http://localhost:${PORT}`);
    });
}