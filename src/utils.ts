import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getAllPhoneNumbersFromJson } from './api/sqlite3';
import { client } from "./index";
import * as cli from "./cli/ui";
import axios from 'axios';
import { LastTransactionPayload } from './types/trakteer';

const startsWithIgnoreCase = (str, prefix) => str.toLowerCase().startsWith(prefix.toLowerCase());

const startsWithCase = (str, prefix) => str.toLowerCase().startsWith(prefix);

export { startsWithIgnoreCase, startsWithCase, broadcastMessage, checkLastTransaction };

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const jobFilePath = path.join(__dirname, '../jobProgress.json');

async function saveJobProgress(jobId: string, processedNumbers: string[], messageBody: string) {
    const jobProgress = { jobId, processedNumbers, messageBody };
    fs.writeFileSync(jobFilePath, JSON.stringify(jobProgress, null, 2));
}

async function loadJobProgress(): Promise<{ jobId: string, processedNumbers: string[], messageBody: string }> {
    if (fs.existsSync(jobFilePath)) {
        const data = fs.readFileSync(jobFilePath, 'utf8');
        if (data) {
            return JSON.parse(data);
        }
    }
    return { jobId: '', processedNumbers: [], messageBody: '' };
}

async function broadcastMessage(messageBody: string) {
    const { jobId, processedNumbers, messageBody: savedMessageBody } = await loadJobProgress();
    const newJobId = jobId || uuidv4();
    const phoneNumbers = await getAllPhoneNumbersFromJson();

    // Use the saved message body if it exists, otherwise use the provided message body
    const finalMessageBody = savedMessageBody || messageBody;

    // Initialize processedNumbers if it's undefined
    const processedNumbersArray = processedNumbers || [];

    for (const phoneNumber of phoneNumbers) {
        if (!processedNumbersArray.includes(phoneNumber)) {
            try {
                await client.sendMessage(phoneNumber, finalMessageBody);
                cli.print(`[Broadcast] Pesan telah di kirim ke ${phoneNumber}`);
                processedNumbersArray.push(phoneNumber);
                await saveJobProgress(newJobId, processedNumbersArray, finalMessageBody);
                await delay(10000);
            } catch (err) {
                console.error(`Failed to send message to ${phoneNumber}:`, err);
                break; // Stop the loop if an error occurs
            }
        }
    }

    cli.print('Pesan telah di kirim ke semua nomor yang terdaftar dengan job id : ' + newJobId);

    // Clear the job progress after completion
    await saveJobProgress('', [], '');
}
async function resumeJobOnStartup() {
    const { jobId, processedNumbers, messageBody } = await loadJobProgress();
    if (jobId) {
        console.log(`Resuming job with ID: ${jobId}`);
        await broadcastMessage(messageBody);
    }
}

async function checkLastTransaction() {
    try {
        const response = await axios.get<LastTransactionPayload>('https://api.trakteer.id/v1/public/supports?limit=1', {
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'key': process.env.PUBLIC_TRAKTEER_API_KEY,
            }
        });
        if (response.data) {
            return response.data;
        } else {
            throw new Error('No data received from the API');
        }
    } catch (error) {
        console.error('Failed to fetch the last transaction', error);
    }
}