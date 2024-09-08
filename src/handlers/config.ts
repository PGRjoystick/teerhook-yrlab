import { Message } from "whatsapp-web.js";
import { IAiConfig } from "../types/config";
import { GeneralModule } from "../commands/general";
import { ChatModule } from "../commands/chat";
import { ICommandDefinition } from "../types/commands";

import config from "../config";

let aiConfig: IAiConfig = {
	// chatgpt: {}
	commandsMap: {}
};

const initAiConfig = () => {
	// Register commands
	[ChatModule, GeneralModule].forEach((module) => {
		aiConfig.commandsMap[module.key] = module.register();
	});
	console.log("[Ayana] (￣ω￣;)...");
};

const handleMessageAIConfig = async (message: Message, prompt: any) => {
	try {
		console.log("[Ayana] Mendapatkan prompt dari " + message.from + ": " + prompt);

		const args: string[] = prompt.split(" ");

		/*
			!config
			!config help
		*/
		if (args.length == 1 || prompt === "help") {
			// Available commands
			let helpMessage = "Command yang tersedia:\n";
			for (let module in aiConfig.commandsMap) {
				for (let command in aiConfig.commandsMap[module]) {
					helpMessage += `\t${config.aiConfigPrefix} ${module} ${command} ${aiConfig.commandsMap[module][command].help}\n`;
				}
			}

			// Available values
			helpMessage += "\nNilai <value> yang tersedia:\n";
			for (let module in aiConfig.commandsMap) {
				for (let command in aiConfig.commandsMap[module]) {
					if (aiConfig.commandsMap[module][command].hint) {
						let hint = aiConfig.commandsMap[module][command].hint;
						if (typeof hint === "object") {
							hint = Object.keys(hint).join(", ");
						}
						helpMessage += `\t${module} ${command}: ${hint}\n`;
					}
				}
			}
			message.reply(helpMessage);
			return;
		}

		// !config <target> <type> <value>
		if (args.length < 2) {
			message.reply(
				"Invalid number of arguments, tolong gunakan format seperti ini: <target> <type> <value> atau ketik !config help untuk info lebih lanjut."
			);
			return;
		}

		const target: string = args[0];
		const type: string = args[1];
		const value: string | undefined = args.length >= 3 ? args.slice(2).join(" ") : undefined;

		if (target && type && aiConfig.commandsMap[target]) {
			if (aiConfig.commandsMap[target][type]) {
				aiConfig.commandsMap[target][type].execute(message, value);
			} else {
				message.reply("Invalid command, tolong gunakan salah satu command yang tersedia: " + Object.keys(aiConfig.commandsMap[target]).join(", "));
			}
			return;
		}

		aiConfig[target][type] = value;

		message.reply("Berhasil meng-set " + target + " " + type + " ke " + value);
	} catch (error: any) {
		console.error("An error occured", error);
		message.reply("An error occured, tolong hubungi pengelola server ini. (" + error.message + ")");
	}
};

export function getCommand(module: string, command: string): ICommandDefinition {
	return aiConfig.commandsMap[module][command];
}

export function getConfig(target: string, type: string): any {
	if (aiConfig.commandsMap[target] && aiConfig.commandsMap[target][type]) {
		if (typeof aiConfig.commandsMap[target][type].data === "function") {
			return aiConfig.commandsMap[target][type].data();
		}
		return aiConfig.commandsMap[target][type].data;
	}
	return aiConfig[target][type];
}

export function executeCommand(target: string, type: string, message: Message, value?: string | undefined) {
	if (aiConfig.commandsMap[target] && aiConfig.commandsMap[target][type]) {
		if (typeof aiConfig.commandsMap[target][type].execute === "function") {
			return aiConfig.commandsMap[target][type].execute(message, value);
		}
	}
}

export { aiConfig, handleMessageAIConfig, initAiConfig };
