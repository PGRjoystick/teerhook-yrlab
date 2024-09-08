import express from 'express';
import bodyParser from 'body-parser';
import { client } from '../index'
import { PaymentPayload, LastTransactionPayload } from '../types/trakteer';
import { checkLastTransaction, generateProKeys } from '../utils';
import * as cli from "../cli/ui";
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
const readFile = promisify(fs.readFile);

// Function to initialize webhook server
export function initializeWebhookServer() {
    // Initialize Express app
    const app = express();
    const PORT = 3002;

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
        let statusMessage = `Hi, Ayana disini 😊. Donasi terbaru : ${paymentPayload.price} dari ${paymentPayload.supporter_name} ${paymentPayload.supporter_message ? `dengan pesan ${paymentPayload.supporter_message}` : ``} Makasih banyak ${paymentPayload.supporter_name} atas donasi nya yah 🥰 Emuach~ 😘`;

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

        // generate pro keys if the payment is more than PRO_KEYS_PRICE
        const proKeysPrice = process.env.PRO_KEYS_PRICE ? parseInt(process.env.PRO_KEYS_PRICE, 10) : 100000; // Default to 5000 if not defined
        const keysNeeded = Math.floor(paymentPayload.price / proKeysPrice);
        let newKey: number[] = []; 

        generateProKeys(keysNeeded).then(newKeys => {
            newKey = newKeys;
            console.log('Generated keys:', newKey);
        }).catch(err => {
            console.error('Error generating keys:', err);
        });

        // send whatsapp message if the supporter message contains phone number
        if (phoneNumber) {
            cli.print(`[Donasi] Mengirim ucapan terima kasih dan rewards ke ${phoneNumber}: ${ayanaResponse}`);
            readFile('./rewards.txt', 'utf8')
            .then(rewardsPage => {
                client.sendMessage(phoneNumber, `${ayanaResponse}\n\n${rewardsPage}`);
            })
            .catch(error => {
                console.error('Failed to read help page file:', error);
                client.sendMessage(phoneNumber, ayanaResponse);
            });
            if (newKey) {
                newKey.forEach(key => {
                    client.sendMessage(phoneNumber, `🔑 Ini adalah kode lisensi Ayana pro baru untuk kamu: ${key}\n\nAktifkan Ayana Pro dengan command : !pro activate ${key}`);
                });
            }
        }

        // do something here. idk yet :/

        // Send a response back to the external service
        res.send('Payment processed successfully');
    });

    // Start the server
    app.listen(PORT, () => {
        console.log(`Server webhook untuk donasi berjalan pada http://localhost:${PORT}`);
    });
}