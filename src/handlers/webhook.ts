import express from 'express';
import bodyParser from 'body-parser';
import { client } from '../index'
import { PaymentPayload, LastTransactionPayload } from '../types/trakteer';
import { activatePackage, checkLastTransaction } from '../utils';
import * as cli from "../cli/ui";
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { addPhoneNumber, getPackages } from '../api/sqlite3';
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
        let phoneNumber
        let statusMessage = `Donasi terbaru : ${paymentPayload.price} dari ${paymentPayload.supporter_name} ${paymentPayload.supporter_message ? `dengan pesan ${paymentPayload.supporter_message}` : ``} Makasih banyak ${paymentPayload.supporter_name} atas donasi nya yah 🥰 Emuach~ 😘`;

        // Log the total number of characters in statusMessage
        const totalChar = statusMessage.length;

        // Check if the supporter message contains a phone number
        if (paymentPayload.supporter_message) {
            const matches = paymentPayload.supporter_message.match(/(?:\+62|62|08)[0-9]{8,15}/g);
            if (matches && matches.length > 0) {
                phoneNumber = matches[0]; // Get the first phone number
                // Normalize the phone number format
                if (phoneNumber.startsWith('08')) {
                    phoneNumber = '628' + phoneNumber.substring(2); // Correctly convert 08 to 628
                } else if (phoneNumber.startsWith('+62')) {
                    phoneNumber = '62' + phoneNumber.substring(3); // Remove the + and ensure it starts with 62
                }
                // Append domain
                phoneNumber += '@c.us';
            }
        // if not, check the last transaction in the api
        } else {
            const lastTransactionPayload: LastTransactionPayload | any = await checkLastTransaction();
            if (lastTransactionPayload) {
                const lastTransaction = lastTransactionPayload.result.data[0];
                // fetch the phone number from support message
                const matches = lastTransaction.support_message.match(/(?:\+62|62|08)[0-9]{8,15}/g);
                if (matches && matches.length > 0) {
                    phoneNumber = matches[0]; // Get the first phone number
                    // Normalize the phone number format
                    if (phoneNumber.startsWith('08')) {
                        phoneNumber = '628' + phoneNumber.substring(2); // Correctly convert 08 to 628
                    } else if (phoneNumber.startsWith('+62')) {
                        phoneNumber = '62' + phoneNumber.substring(3); // Remove the + and ensure it starts with 62
                    }
                    // Append domain
                    phoneNumber += '@c.us';
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
                await activatePackage(phoneNumber ,selectedPackage.package_type);
                client.sendMessage(phoneNumber, `Yay 🥳 Terima kasih telah berdonasi sebesar Rp. ${paymentPayload.price} untuk paket ${selectedPackage.package_type}! 🔑 dibawah ini adalah kode paket ${selectedPackage.package_type} untuk kamu. Makasih banyak yah sekali lagi 😉`);
                await new Promise(resolve => setTimeout(resolve, 500));
                client.sendMessage(phoneNumber, `${selectedPackage.license_key}`);
            }
            await addPhoneNumber(paymentPayload.supporter_name, phoneNumber);
        }

        // Send a response back to the external service
        res.send('Payment processed successfully');
    });

    // Start the server
    app.listen(PORT, () => {
        console.log(`Server webhook untuk donasi berjalan pada http://localhost:${PORT}`);
    });
}