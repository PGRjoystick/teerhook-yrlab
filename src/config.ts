import process from "process";

// Environment variables
import dotenv from "dotenv";
dotenv.config();

// Config Interface
interface IConfig {
	// Access control
	whitelistedPhoneNumbers: string[];
	bannedPhoneNumbers: string[];
	whitelistedEnabled: boolean;
	// OpenAI
	openAIModel: string;
	openAIAPIKeys: string[];
	elevenLabsAPIKeys: string[];
	maxModelTokens: number;
	maxConvTokens: number;
	prePrompt: string | undefined;

	// Prefix
	prefixEnabled: boolean;
	prefixSkippedForMe: boolean;
	gptPrefix: string;
	dallePrefix: string;
	stableDiffusionPrefix: string;
	stableDiffusionInterrogator: string;
	stableDiffusionGetModelPrefix: string;
	stableDiffusionGetImgPrefix: String;
	stableDiffusionSetModelPrefix: string;
	stableDiffusionSetImgPrefix: string;
	stableDiffusionImg2ImgPrefix: string;
	langChainPrefix: string;
	resetPrefix: string;
	aiConfigPrefix: string;
	singPrefix: string;

	// Groupchats
	groupchatsEnabled: boolean;

	// Prompt Moderation
	promptModerationEnabled: boolean;
	promptModerationBlacklistedCategories: string[];



	// Voice transcription & Text-to-Speech
	speechServerUrl: string;
	whisperServerUrl: string;
	openAIServerUrl: string;
	whisperApiKey: string;
	transcriptionEnabled: boolean;
	transcriptionLanguage: string;
}

// Config
export const config: IConfig = {
	whitelistedPhoneNumbers: process.env.WHITELISTED_PHONE_NUMBERS?.split(",") || [],
	bannedPhoneNumbers: process.env.BANNED_PHONE_NUMBERS?.split(",") || [],
	whitelistedEnabled: getEnvBooleanWithDefault("WHITELISTED_ENABLED", false),

	openAIAPIKeys: (process.env.OPENAI_API_KEYS || process.env.OPENAI_API_KEY || "").split(",").filter((key) => !!key), // Default: []
	elevenLabsAPIKeys: (process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY || "").split(",").filter((key) => !!key), // Default: []
	openAIModel: process.env.OPENAI_GPT_MODEL || "gpt-3.5-turbo", // Default: gpt-3.5-turbo
	maxModelTokens: getEnvMaxModelTokens(), // Default: 800
	maxConvTokens: getEnvMaxConvTokens(), // Default 4089
	prePrompt: process.env.PRE_PROMPT, // Default: undefined

	// Prefix
	prefixEnabled: getEnvBooleanWithDefault("PREFIX_ENABLED", true), // Default: true
	prefixSkippedForMe: getEnvBooleanWithDefault("PREFIX_SKIPPED_FOR_ME", true), // Default: true
	gptPrefix: process.env.GPT_PREFIX || "!gpt", // Default: !gpt
	dallePrefix: process.env.DALLE_PREFIX || "!dalle", // Default: !dalle
	singPrefix: process.env.SING_PREFIX || "!sing", // Default: !sing
	stableDiffusionGetImgPrefix: process.env.STABLE_DIFFUSION_GETIMG_PREFIX || "!getimg", // Default: !getimg
	stableDiffusionPrefix: process.env.STABLE_DIFFUSION_PREFIX || "!sd", // Default: !sd
	stableDiffusionSetImgPrefix: process.env.STABLE_DIFFUSION_SETIMG_PREFIX || "!setimg", // Default: !setimg
	stableDiffusionImg2ImgPrefix: process.env.STABLE_DIFFUSION_IMG2IMG_PREFIX || "!sdimg", // Default: !sdimg
	stableDiffusionInterrogator: process.env.STABLE_DIFFUSION_INTERROGATOR_PREFIX || "!iniapa", // Default: !iniapa
	resetPrefix: process.env.RESET_PREFIX || "!rst", // Default: !reset
	aiConfigPrefix: process.env.AI_CONFIG_PREFIX || "!cfg", // Default: !config
	langChainPrefix: process.env.LANGCHAIN_PREFIX || "!lang", // Default: !lang
	stableDiffusionGetModelPrefix: process.env.STABLE_DIFFUSION_GET_MODEL_PREFIX || "!getmodel", // Default: !sdgetmodel
	stableDiffusionSetModelPrefix: process.env.STABLE_DIFFUSION_SET_MODEL_PREFIX || "!setmodel", // Default: !sdsetmodel

	// Groupchats
	groupchatsEnabled: getEnvBooleanWithDefault("GROUPCHATS_ENABLED", false), // Default: false

	// Prompt Moderation
	promptModerationEnabled: getEnvBooleanWithDefault("PROMPT_MODERATION_ENABLED", false), // Default: false
	promptModerationBlacklistedCategories: getEnvPromptModerationBlacklistedCategories(), // Default: ["hate", "hate/threatening", "self-harm", "sexual", "sexual/minors", "violence", "violence/graphic"]

	// Speech API, Default: https://speech-service.verlekar.com
	speechServerUrl: process.env.SPEECH_API_URL || "https://speech-service.verlekar.com",
	whisperServerUrl: process.env.WHISPER_API_URL || "https://transcribe.whisperapi.com",
	openAIServerUrl: process.env.OPENAI_API_URL || "https://api.openai.com/v1/audio/transcriptions",
	whisperApiKey: process.env.WHISPER_API_KEY || "", // Default: ""

	// Transcription
	transcriptionEnabled: getEnvBooleanWithDefault("TRANSCRIPTION_ENABLED", false), // Default: false
	transcriptionLanguage: process.env.TRANSCRIPTION_LANGUAGE || "" // Default: null
};

/**
 * Get the max model tokens from the environment variable
 * @returns The max model tokens from the environment variable or 800
 */
function getEnvMaxModelTokens() {
	const envValue = process.env.MAX_MODEL_TOKENS;
	if (envValue == undefined || envValue == "") {
		return 800;
	}

	return parseInt(envValue);
}

function getEnvMaxConvTokens() {
	const envValue = process.env.MAX_CONV_TOKENS;
	if (envValue == undefined || envValue == "") {
		return 4089;
	}

	return parseInt(envValue);
}

/**
 * Get an environment variable as a boolean with a default value
 * @param key The environment variable key
 * @param defaultValue The default value
 * @returns The value of the environment variable or the default value
 */
function getEnvBooleanWithDefault(key: string, defaultValue: boolean): boolean {
	const envValue = process.env[key]?.toLowerCase();
	if (envValue == undefined || envValue == "") {
		return defaultValue;
	}

	return envValue == "true";
}

/**
 * Get the blacklist categories for prompt moderation from the environment variable
 * @returns Blacklisted categories for prompt moderation
 */
function getEnvPromptModerationBlacklistedCategories(): string[] {
	const envValue = process.env.PROMPT_MODERATION_BLACKLISTED_CATEGORIES;
	if (envValue == undefined || envValue == "") {
		return ["hate", "hate/threatening", "self-harm", "sexual", "sexual/minors", "violence", "violence/graphic"];
	} else {
		return JSON.parse(envValue.replace(/'/g, '"'));
	}
}

/**
 * Get the transcription mode from the environment variable
 * @returns The transcription mode
 */

export default config;
