import { Message, MessageTypes } from "whatsapp-web.js";
import { startsWithIgnoreCase, broadcastMessage, checkAndUpdateProStatus, normalizeWhiteSpaces } from "../utils";
import { client } from "../index";
import { getPhoneNumbersByLocation, getPhoneNumbersByLocationPrefix, getAllPhoneNumbers, addUser, deleteUser, changePackageKey, changePackagePrice, createPackage, deletePackage, getUserIdByPhoneNumber, getPackages, getUserAndPhoneNumbers, deletePhoneNumber, addPhoneNumber, initializeUserParam } from "../api/sqlite3";


// Config & Constants
import config from "../config";

// CLI
import * as cli from "../cli/ui";

// For deciding to ignore old messages
import { botReadyTimestamp } from "../index";
import { changePasswordProtectedPostsByCategory } from "../api/wordpress";

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const whitelistedPhoneNumbers = process.env.WHITELISTED_PHONE_NUMBERS?.split(',');

// Function to check if a phone number is whitelisted
function isWhitelisted(phoneNumber: string): boolean {
    return whitelistedPhoneNumbers?.includes(phoneNumber) ?? false;
}

// Handles message
async function handleIncomingMessage(message: Message) {
	
	const messageString = normalizeWhiteSpaces(message.body);
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

		// preparing send typing state to 25 sec interval
		const typingInterval = setInterval(sendTypingState, 25000)
		async function sendTypingState() {
			const readchat = await message.getChat();
			readchat.sendStateTyping();
		}	
		
		// access control
		if (isWhitelisted(message.author || message.from)) {
			cli.print(`[Access Control] Command input dari ${message.from}: "${messageString}"`);
			// send message to all users by location prefix
			if (startsWithIgnoreCase(messageString, '!castlocprefix')) {
				const args = messageString.split(' ').slice(1);
				if (args.length < 2) {
					message.reply('Format salah! Gunakan: !castlocprefix LOCATION_PREFIX message');
					return;
				}
				const locationPrefix = args[0];
				const messageBody = args.slice(1).join(' ');
				const phoneNumbers = await getPhoneNumbersByLocationPrefix(locationPrefix);
				const phoneNumberStrings = phoneNumbers.map(row => row.phone_number);
				console.log(phoneNumberStrings);

				//send whatsapp state to typing
				const readchat = await message.getChat();
				await readchat.sendStateTyping();

				if (Array.isArray(phoneNumbers)) {
					for (const phoneNumber of phoneNumberStrings) {
						client.sendMessage(phoneNumber, messageBody);
						cli.print(`[Broadcast] Pesan telah di kirim ke ${phoneNumber}`);
						await delay(5000); 
					}
				}
				message.reply('Pesan telah di kirim ke semua nomor yang terdaftar di lokasi tersebut');
				//clear typing status
				clearInterval(typingInterval);
				readchat.clearState();
				return;
			}

			// send message to all users by location
			if (startsWithIgnoreCase(messageString, '!castloc')) {
				const args = messageString.split(' ').slice(1);
				if (args.length < 2) {
					message.reply('Format salah! Gunakan: !castloc LOCATION message');
					return;
				}
				const location = args[0];
				const messageBody = args.slice(1).join(' ');
				const phoneNumbers = await getPhoneNumbersByLocation(location);
				const phoneNumberStrings = phoneNumbers.map(row => row.phone_number);
				console.log(phoneNumberStrings);

				//send whatsapp state to typing
				const readchat = await message.getChat();
				await readchat.sendStateTyping();

				if (Array.isArray(phoneNumbers)) {
					for (const phoneNumber of phoneNumberStrings) {
						client.sendMessage(phoneNumber, messageBody);
						cli.print(`[Broadcast] Pesan telah di kirim ke ${phoneNumber}`);
						await delay(5000); 
					}
				}
				message.reply('Pesan telah di kirim ke semua nomor yang terdaftar di lokasi tersebut');
				//clear typing status
				clearInterval(typingInterval);
				readchat.clearState();
				return;
			}
			
			// broadcast message
			if (startsWithIgnoreCase(messageString, '!castjson')) {
				const messageBody = messageString.substring('!castjson'.length + 1);
				//send whatsapp state to typing
				const readchat = await message.getChat();
				await readchat.sendStateTyping();
				try {
					await broadcastMessage(messageBody);
					message.reply('Pesan telah di kirim ke semua nomor yang terdaftar');
				} catch (err) {
					console.error(err);
					message.reply('Terjadi kesalahan saat mengirim pesan broadcast.');
				}
				//clear typing status
				clearInterval(typingInterval);
				readchat.clearState();
				return;
			}

			// print a list of phone number and username
			if (startsWithIgnoreCase(messageString, '!sublist')) {
				const phoneNumbers = await getUserAndPhoneNumbers();
				const formattedOutput = phoneNumbers.map(row => `Phone numbers: ${row.phoneNumber} | Usernames: ${row.userId}`).join('\n');
				message.reply(formattedOutput);
				return;
			}

			// broadcast message
			if (startsWithIgnoreCase(messageString, '!cast')) {
				const footer = '\n\n##################\nPesan ini dikirim kepada user yang berlangganan newsletter yuri lab. untuk berhenti berlangganan, balas pesan ini dengan `!unsub`';
				const messageBody = messageString.substring('!cast'.length + 1);
				const phoneNumbers = await getAllPhoneNumbers();
				const phoneNumberStrings = phoneNumbers.map(row => row.phone_number);
				console.log(phoneNumberStrings);
				//send whatsapp state to typing
				const readchat = await message.getChat();
				await readchat.sendStateTyping();
				if (Array.isArray(phoneNumbers)) {
					for (const phoneNumber of phoneNumberStrings) {
						const username = await getUserIdByPhoneNumber(phoneNumber);
						const finalMessageBody = messageBody.replace('{username}', username || '') + footer;
						client.sendMessage(phoneNumber, finalMessageBody);
						cli.print(`[Broadcast] Pesan telah di kirim ke ${phoneNumber}`);
						await delay(5000); 
					}
				}
				message.reply('Pesan telah di kirim ke semua nomor yang terdaftar');
				//clear typing status
				clearInterval(typingInterval);
				readchat.clearState();
				return;
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
			
			// // pwchange
			// if (startsWithIgnoreCase(messageString, '!pwchange')) {
			// 	// Normalize whitespace by replacing all whitespace characters with a single space
			// 	const args = messageString.split(' ').slice(1).map(arg => arg.trim());
			// 	if (args.length < 2) {
			// 		message.reply('Format salah! Gunakan: !pwchange USER_NAME NEW_PASSWORD');
			// 		return;
			// 	}
			// 	const category = args[0];
			// 	const newPassword = args[1];
			// 	try {
			// 		await changePasswordProtectedPostsByCategory(category, newPassword);
			// 		cli.print(`Password ${category} berhasil diubah`);
			// 		message.reply(`Password ${category} berhasil diubah`);
			// 	} catch(err) {
			// 		console.error(err);
			// 		message.reply('Terjadi kesalahan saat mengubah password.');
			// 	};
			// 	return;
			// }

			// pkgpricechange
			if (startsWithIgnoreCase(messageString, '!pkgpricechange')) {
				// Normalize whitespace by replacing all whitespace characters with a single space
				const args = messageString.split(' ').slice(1).map(arg => arg.trim());
				if (args.length < 2) {
					message.reply('Format salah! Gunakan: !pkgpricechange Nama_Paket Harga_baru');
					return;
				}
				const packageKey = args[0];
				const newPrice = parseInt(args[1]);
				try {
					await changePackagePrice(packageKey, newPrice);
					cli.print(`Harga Paket ${packageKey} berhasil diubah menjadi ${newPrice}`);
					message.reply(`Harga Paket ${packageKey} berhasil diubah menjadi ${newPrice}`);
				} catch(err) {
					console.error(err);
					message.reply('Terjadi kesalahan saat mengubah harga.');
				};
				return;
			}

			if (startsWithIgnoreCase(messageString, '!pkgkeychange')) {
				// Normalize whitespace by replacing all whitespace characters with a single space
				const normalizedMessage = messageString.replace(/\s+/g, ' ').trim();
				const args = normalizedMessage.split(' ').slice(1).map(arg => arg.trim());
				if (args.length < 2) {
					message.reply('Format salah! Gunakan: !pkgkeychange Nama_Paket Key_baru');
					return;
				}
				//send whatsapp state to typing
				const readchat = await message.getChat();
				await readchat.sendStateTyping();
				const packageKey = args[0];
				const newKey = args[1];
				try {
					await changePackageKey(packageKey, newKey);
					cli.print(`Key ${packageKey} berhasil diubah menjadi ${newKey}`);
					message.reply(`Key ${packageKey} berhasil diubah menjadi ${newKey}`);
				} catch(err) {
					console.error(err);
					message.reply('Terjadi kesalahan saat mengubah key.');
				};
				//clear typing status
				clearInterval(typingInterval);
				readchat.clearState();
				return;
			}

			// pkgprint
			if (startsWithIgnoreCase(messageString, '!pkgprint')) {
				try {
					const packages = await getPackages();
					if (packages.length === 0) {
						message.reply('Tidak ada paket yang tersedia.');
					} else {
						const pkgList = "Paket yang tersedia:\n";
						const formattedPackages = packages.map(pkg => `- Nama Paket: ${pkg.package_type}, Harga: ${pkg.price}, License Key: ${pkg.license_key}`);
						const response = pkgList + formattedPackages.join('\n');
						message.reply(response);
						clearInterval(typingInterval);
						return;
					}
				} catch (err) {
					message.reply('Terjadi kesalahan saat mengambil paket.');
					console.error(err.message);
					clearInterval(typingInterval);
					return;
				}
				return;
			}
			

			// pkgdelete
			if (startsWithIgnoreCase(messageString, '!pkgdel')) {
				// Normalize whitespace by replacing all whitespace characters with a single space
				const normalizedMessage = messageString.replace(/\s+/g, ' ').trim();
				const args = normalizedMessage.split(' ').slice(1).map(arg => arg.trim());
				if (args.length < 1) {
					message.reply('Format salah! Gunakan: !pkgdelete Nama_Paket');
					return;
				}
				const packageKey = args[0];
				try {
					const result = await deletePackage(packageKey);
					if (result) {
						cli.print(`Paket ${packageKey} berhasil dihapus`);
						message.reply(`Paket ${packageKey} berhasil dihapus`);
					} else {
						cli.print(`Paket ${packageKey} tidak ditemukan`);
						message.reply(`Paket ${packageKey} tidak ditemukan`);
					}
				} catch(err) {
					console.error(err);
					message.reply('Terjadi kesalahan saat menghapus paket.');
				}
				return;
			}

			// pkgcreate
			if (startsWithIgnoreCase(messageString, '!pkgcreate')) {
				// Normalize whitespace by replacing all whitespace characters with a single space
				const normalizedMessage = messageString.replace(/\s+/g, ' ').trim();
				const args = normalizedMessage.split(' ').slice(1).map(arg => arg.trim());
				cli.print('Arguments: ' + JSON.stringify(args)); // Log the arguments for debugging
			
				if (args.length < 3) {
					cli.print('Paket gagal dibuat karena format salah. command yang di input: ' + `"${messageString}"`);
					message.reply('Format salah! Gunakan: !pkgcreate Nama_Paket Harga Key');
					cli.print('Package name: ' + (args[0] || 'undefined'));
					cli.print('Price: ' + (parseInt(args[1]) || 'undefined'));
					cli.print('Key: ' + (args[2] || 'undefined'));
					return;
				}
			
				const packageName = args[0];
				const price = parseInt(args[1]);
				const key = args[2];
			
				cli.print('Package name: ' + packageName);
				cli.print('Price: ' + price);
				cli.print('Key: ' + key);
			
				if (!packageName || isNaN(price) || !key) {
					cli.print('Paket gagal dibuat karena format salah. command yang di input: ' + `"${messageString}"`);
					message.reply('Format salah! Gunakan: !pkgcreate Nama_Paket Harga Key');
					return;
				}
			
				try {
					await createPackage(packageName, price, key);
					cli.print(`Paket ${packageName} berhasil dibuat dengan harga ${price} dan key ${key}`);
					message.reply(`Paket ${packageName} berhasil dibuat dengan harga ${price} dan key ${key}`);
				} catch(err) {
					if (err.message.includes('already exists')) {
						cli.print(`Paket ${packageName} gagal dibuat karena sudah ada di database.`);
						message.reply(`Paket ${packageName} gagal dibuat karena sudah ada di database.`);
					} else {
						console.error(err);
						message.reply('Terjadi kesalahan saat membuat paket.');
					}
				}
				return;
			}

			// Add a user into a newsletter manually 
			if (startsWithIgnoreCase(messageString, '!newsletteradd')) {
				const regex = /!newsletteradd\s+'([^']+)'\s+(\S+)/;
				const match = messageString.match(regex);
			
				if (!match) {
					message.reply('Format salah! Gunakan: !newsletteradd \'USER_NAME\' PHONE_NUMBER');
					return;
				}
			
				const username = match[1];
				const phoneNumber = match[2];
			
				try {
					await addPhoneNumber(username, phoneNumber);
					cli.print(`User ${username} dengan nomor ${phoneNumber} berhasil ditambahkan ke newsletter.`);
					message.reply(`User ${username} dengan nomor ${phoneNumber} berhasil ditambahkan ke newsletter.`);
				} catch (err) {
					console.error(err);
					message.reply('Terjadi kesalahan saat menambahkan user ke newsletter.');
				}
				return;
			}

			// debug print chat id (!chatid)
			if (startsWithIgnoreCase(messageString, '!chatid')) {
				console.log(message.rawData);
				const userName: string = (message.rawData as any).notifyName as string;
				message.reply("ID Nomor Ayana : "+message.to);
				message.reply("Username Pengirim : "+userName);
				if (message.author) {
					message.reply("Message Author jika ini grup chat : "+message.author);
					message.reply("ID Grup : "+message.from);
					message.reply("Nama Grup : "+(await message.getChat()).name);
				} else {
					message.reply("ID Pengirim : "+message.from);
				}
				return;
			}

			//clear typing status
			clearInterval(typingInterval);
			return;
		}
		if (startsWithIgnoreCase(messageString, '!unsub')) {
			const phoneNumber = message.from;
		
			try {
				const result = await deletePhoneNumber(phoneNumber);
				if (result) {
					cli.print(`[Unsubscribe] Nomor ${phoneNumber} Telah berhenti berlangganan newsletter Yuri Lab.`);
					message.reply(`Yah, sedih banget mendengar kamu berhenti berlangganan newsletter Yuri Lab 😞. untuk berlangganan kembali, kirim pesan !sub disini yah 😊`);
				} else {
					cli.print(`[Unsubscribe] Nomor ${phoneNumber} tidak di temukan.`);
					message.reply(`Kamu belum pernah berlangganan newsletter Yuri Lab 😞. untuk berlangganan newsletter, kirim pesan !sub disini yah 😊`);
				}
			} catch (err) {
				console.error(err);
				message.reply('Terjadi kesalahan saat berhenti berlangganan newsletter.');
			}
			return;
		}
		// subscribe
		if (startsWithIgnoreCase(messageString, '!sub')) {
			const phoneNumber = message.from;
			const userName: string = (message.rawData as any).notifyName as string;
			try {
				await addPhoneNumber(userName, phoneNumber);
				cli.print(`[Subscribe] Nomor ${phoneNumber} dengan username ${userName} Telah berlangganan newsletter Yuri Lab.`);
				message.reply(`Yay 🥳 Terima kasih Telah berlangganan newsletter Yuri Lab. Nantikan update manga terbaru dari Yuri Lab yah 😊`);
			} catch (err) {
				console.error(err);
				message.reply('Terjadi kesalahan saat berlangganan newsletter.');
			}
			return;
		}
		// check status for user (!status)
		if (startsWithIgnoreCase(messageString, '!status')) {
			const userName: string = (message.rawData as any).notifyName as string;
			try {
				await initializeUserParam(message.from, userName);
				const hasActivePackage = await checkAndUpdateProStatus(message.from);
				if (hasActivePackage.hasActivePackage) {
					const activePackageName = hasActivePackage.activePackageName;
					const packageInfo = await getPackages(activePackageName);
					// Convert expiryDate to human-readable text
					const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
					const humanReadableExpiryDate = hasActivePackage.expiryDate ? new Date(hasActivePackage.expiryDate).toLocaleDateString('id-ID', options) : '';
					message.reply(`Hai ${userName}, kamu memiliki paket ${activePackageName} yang aktif. berikut Kode untuk paket tersebut :`);
					await delay(500);
					message.reply(packageInfo[0].license_key);
					await delay(500);
					message.reply(`Paket berakhir pada ${humanReadableExpiryDate}`);
				} else {
					message.reply(`Hai ${userName}, kamu tidak memiliki paket aktif saat ini. Untuk membeli paket, kirim pesan !donate untuk melihat link donasi.`);
				}
			} catch (err) {
				console.error(err);
				message.reply('Terjadi kesalahan saat memeriksa status berlangganan.');
			}
			return;
		}
		//clear typing status
		clearInterval(typingInterval);
	}
	cli.print(`[Message] Pesan masuk dari ${message.from}: ${messageString}`);
} 
export { handleIncomingMessage };
