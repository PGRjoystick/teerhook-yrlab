import qrcode from "qrcode";
import { Client, Message, Events, LocalAuth } from "whatsapp-web.js";
import { initializeWebhookServer } from './handlers/webhooks';

// CLI
import * as cli from "./cli/ui";
import { handleIncomingMessage } from "./handlers/message";

// Config
// import { initAiConfig } from "./handlers/ai-config";

// import config from "./config";

// Ready timestamp of the bot
let botReadyTimestamp: Date | null = null;

// Fetch available images from imgdb.json file
const fs = require('fs');
const path = require('path');

// Create a writable stream to a log file
const logFilePath = path.join(__dirname, 'server.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// Redirect console.log to the log file if debug mode is enabled
if (process.env.DEBUG === 'true') {
    console.log = function (message) {
        if (typeof message === 'object') {
            message = JSON.stringify(message);
        }
        const date = new Date();
		const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        const formattedDate = date.toLocaleString('en-US', options)
        logStream.write(`[${formattedDate}] ${message}\n`);
    };
}


interface IConstants {
	// WhatsApp status broadcast
	statusBroadcast: string;

	// WhatsApp session storage
	sessionPath: string;
}

const constants: IConstants = {
	statusBroadcast: "status@broadcast",
	sessionPath: "./"
};

export default constants;


// WhatsApp Client
const client = new Client({
	puppeteer: {
		args: ["--no-sandbox"]
	},
	authStrategy: new LocalAuth({
		dataPath: constants.sessionPath
	})
});

// Entrypoint
const start = async () => {
	cli.printIntro();

	// WhatsApp auth
	client.on(Events.QR_RECEIVED, (qr: string) => {
		console.log("");
		qrcode.toString(
			qr,
			{
				type: "terminal",
				small: true,
				margin: 2,
				scale: 1
			},
			(err, url) => {
				if (err) throw err;
				cli.printQRCode(url);
			}
		);
	});

	// WhatsApp loading
	client.on(Events.LOADING_SCREEN, (percent) => {
		if (percent == "0") {
			cli.printLoading();
		}
	});

	// WhatsApp authenticated
	client.on(Events.AUTHENTICATED, () => {
		cli.printAuthenticated();
	});

	// WhatsApp authentication failure
	client.on(Events.AUTHENTICATION_FAILURE, () => {
		cli.printAuthenticationFailure();
	});

	// WhatsApp ready
	client.on(Events.READY, async () => {
		// Print outro
		const wwjsVer = await client.getWWebVersion();
		console.log(`WhatsApp Web initialized with version : ${wwjsVer}`);
		cli.printOutro();

		// Set bot ready timestamp
		botReadyTimestamp = new Date();
		// Initialize the webhook server
		initializeWebhookServer();

	});

	// WhatsApp message
	client.on(Events.MESSAGE_RECEIVED, async (message: any) => {
		// Ignore if message is from status broadcast
		if (message.from == constants.statusBroadcast) return;
		await handleIncomingMessage(message);
	});

	client.on(Events.CALL, async (call) => {
		call.reject();
		return;
	});

	// Reply to own message
	client.on(Events.MESSAGE_CREATE, async (message: Message) => {
		// Ignore if message is from status broadcast
		if (message.from == constants.statusBroadcast) return;

		// Ignore if it's a quoted message, (e.g. Bot reply)
		if (message.hasQuotedMsg) return;

		// Ignore if it's not from me
		if (!message.fromMe) return;

		await handleIncomingMessage(message);
	});

	// WhatsApp initialization
	client.initialize();
};

start();


process.on('SIGINT', function() {
    process.exit();
});

export { botReadyTimestamp, client };
