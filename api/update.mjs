import bot from "../src/bot.mjs";
import {webhookCallback} from "grammy";

export default webhookCallback(bot, "next-js");
