import { Message, MessageTypes } from "whatsapp-web.js";
import { startsWithIgnoreCase } from "../utils";
import { client } from "../index";
import { getPhoneNumbersByLocation, getPhoneNumbersByLocationPrefix, getAllPhoneNumbers, addUser, deleteUser } from "../api/sqlite3";

// Config & Constants
import config from "../config";

// CLI
import * as cli from "../cli/ui";

// For deciding to ignore old messages
import { botReadyTimestamp } from "../index";

const singState: string[] = [];

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Handles message
async function handleIncomingMessage(message: Message, groupDescription?: String) {
	let messageString = message.body;
	// Prevent handling old messages
	if (message.timestamp != null) {
		const messageTimestamp = new Date(message.timestamp * 1000);

		// If startTimestamp is null, the bot is not ready yet
		if (botReadyTimestamp == null) {
			cli.print("Mengabaikan pesan karena ayana belum siap: " + messageString);
			return;
		}

		// Ignore messages that are sent before the bot is started
		if (messageTimestamp < botReadyTimestamp) {
			cli.print("Mengabaikan pesan lama: " + messageString);
			return;
		}
	}
	
	// Private Message
	if (!(await message.getChat()).isGroup && !message.hasMedia) {

		// access control
		if (message.from == process.env.WHITELISTED_PHONE_NUMBERS) {

			// send message to all users by location prefix
			if (startsWithIgnoreCase(message.body, '!castlocprefix')) {
				const args = message.body.split(' ').slice(1);
				if (args.length < 2) {
					message.reply('Format salah! Gunakan: !castlocprefix LOCATION_PREFIX message');
					return;
				}
				const locationPrefix = args[0];
				const messageBody = args.slice(1).join(' ');
				const phoneNumbers = await getPhoneNumbersByLocationPrefix(locationPrefix);
				const phoneNumberStrings = phoneNumbers.map(row => row.phone_number);
				console.log(phoneNumberStrings);
				if (Array.isArray(phoneNumbers)) {
					for (const phoneNumber of phoneNumberStrings) {
						client.sendMessage(phoneNumber, messageBody);
						cli.print(`[Broadcast] Pesan telah di kirim ke ${phoneNumber}`);
						await delay(5000); 
					}
				}
				message.reply('Pesan telah di kirim ke semua nomor yang terdaftar di lokasi tersebut');
				return;
			}

			// send message to all users by location
			if (startsWithIgnoreCase(message.body, '!castloc')) {
				const args = message.body.split(' ').slice(1);
				if (args.length < 2) {
					message.reply('Format salah! Gunakan: !castloc LOCATION message');
					return;
				}
				const location = args[0];
				const messageBody = args.slice(1).join(' ');
				const phoneNumbers = await getPhoneNumbersByLocation(location);
				const phoneNumberStrings = phoneNumbers.map(row => row.phone_number);
				console.log(phoneNumberStrings);
				if (Array.isArray(phoneNumbers)) {
					for (const phoneNumber of phoneNumberStrings) {
						client.sendMessage(phoneNumber, messageBody);
						cli.print(`[Broadcast] Pesan telah di kirim ke ${phoneNumber}`);
						await delay(5000); 
					}
				}
				message.reply('Pesan telah di kirim ke semua nomor yang terdaftar di lokasi tersebut');
				return;
			}
			
			// broadcast message
			if (startsWithIgnoreCase(message.body, '!cast')) {
				const messageBody = message.body.substring('!cast'.length + 1);
				const phoneNumbers = await getAllPhoneNumbers();
				const phoneNumberStrings = phoneNumbers.map(row => row.phone_number);
				console.log(phoneNumberStrings);
				if (Array.isArray(phoneNumbers)) {
					for (const phoneNumber of phoneNumberStrings) {
						client.sendMessage(phoneNumber, messageBody);
						cli.print(`[Broadcast] Pesan telah di kirim ke ${phoneNumber}`);
						await delay(5000); 
					}
				}
				message.reply('Pesan telah di kirim ke semua nomor yang terdaftar');
				return;
			}
		}

		if (startsWithIgnoreCase(messageString, '!useradd')) {
			// Split the message string into lines
			const lines = messageString.split('\n');

			// Array to store the usernames of the added users
			const addedUsers: string[] = [];

			// Iterate over each line
			for (const line of lines) {
				// Split the line into words, ignoring the first word
				const args = line.split(' ').slice(1);

				// Check if the line has at least 3 arguments
				if (args.length < 3) {
					message.reply('Format salah! Gunakan: !useradd USER_NAME location phone_number,another_phone_number');
					continue; // Skip to the next line
				}

				const username = args[0];
				const location = args[1];
				const phoneNumbers = args[2].split(',');

				try {
					addUser(username, location, phoneNumbers);
					addedUsers.push(username);
				} catch(err) {
					console.error(err);
					message.reply('Terjadi kesalahan saat menambahkan user.');
				};
			}

			// Send a single reply with all the usernames
			if (addedUsers.length > 0) {
				message.reply(`User ${addedUsers.join(', ')} berhasil ditambahkan.`);
			}

			return;
		}

		if (startsWithIgnoreCase(messageString, '!userdel')) {
			// Split the message string into lines
			const lines = messageString.split('\n');

			// Array to store the usernames of the deleted users
			const deletedUsers: string[] = [];

			// Iterate over each line
			for (const line of lines) {
				// Split the line into words, ignoring the first word
				const args = line.split(' ').slice(1);

				// Check if the line has at least 1 argument
				if (args.length < 1) {
					message.reply('Format salah! Gunakan: !userdel USER_NAME');
					continue; // Skip to the next line
				}

				const username = args[0];

				try {
					const success = await deleteUser(username);
					if (success) {
						deletedUsers.push(username);
					}
				} catch(err) {
					console.error(err);
					message.reply('Terjadi kesalahan saat menghapus user.');
				};
			}

			// Send a single reply with all the usernames
			if (deletedUsers.length > 0) {
				message.reply(`User ${deletedUsers.join(', ')} berhasil dihapus.`);
			} else {
				message.reply('User tidak ditemukan.');
			}

			return;
		}
	}
} 
export { handleIncomingMessage };
