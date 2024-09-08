import { ICommandModule, ICommandDefinition, ICommandsMap } from "../types/commands";
import { Message } from "whatsapp-web.js";
import { config } from "../config";
import { IAiConfig } from "../types/config";
import { aiConfig, getConfig } from "../handlers/config";

export const GeneralModule: ICommandModule = {
	key: "general",
	register: (): ICommandsMap => {
		return {
			settings,
			whitelist,
			banlist
		};
	}
};

const settings: ICommandDefinition = {
	help: "- Mengambil pengaturan saat ini",
	execute: function (message: Message) {
		const selfNotedMessage = message.fromMe && message.hasQuotedMsg === false && message.from === message.to;
		if (!selfNotedMessage) {
			// Only allow printing out the settings on self-noted for security reasons
			return;
		}

		let response = "Runtime settings:";
		for (let module in aiConfig.commandsMap) {
			for (let command in aiConfig.commandsMap[module]) {
				if (aiConfig.commandsMap[module][command].data === undefined) {
					continue;
				}
				let val;
				if (typeof aiConfig.commandsMap[module][command].data === "function") {
					val = aiConfig.commandsMap[module][command].data();
				} else {
					val = aiConfig.commandsMap[module][command].data;
				}
				response += `\n${module} ${command}: ${val}`;
			}
		}

		response += `\n\nStatic settings:`;

		// Whitelisted fields from config
		[
			"openAIModel",
			"prePrompt",
			"gptPrefix",
			"dallePrefix",
			"stableDiffusionPrefix",
			"resetPrefix",
			"groupchatsEnabled",
			"promptModerationEnabled",
			"promptModerationBlacklistedCategories",
			"ttsMode"
		].forEach((field) => {
			response += `\n${field}: ${config[field]}`;
		});
		message.reply(response);
	}
};

const whitelist: ICommandDefinition = {
	help: "<value> - set nomor pemilik Ayana",
	data: config.whitelistedPhoneNumbers,
	execute: function (message: Message, value?: string) {
		if (!value) {
			message.reply(`Invalid value, tolong berikan tanda koma pada setiap nomor telepon yang ingin ditambahkan.`);
			return;
		}
		this.data = value.split(",");
		message.reply(`Nomor daftar putih telah di tambahkan dengan nomor ${this.data}`);
	}
};

const banlist: ICommandDefinition = {
	help: "<value> - tambahkan orang yang akan Ayana abaikan",
	data: config.bannedPhoneNumbers,
	execute: function (message: Message, value?: string) {
		if (!value) {
			message.reply('Invalid value, tolong berikan tanda koma pada setiap nomor telepon yang ingin ditambahkan.');
			return;
		}
		this.data = value.split(",");
		message.reply(`Nomor ${this.data} Telah Ayana Banned dan Ayana tidak akan melayani permintaan dari nomor ini lagi`);
	}
};
