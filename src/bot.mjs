import {Bot} from "grammy";
import fetch from "node-fetch";
import HttpsProxyAgent from "https-proxy-agent";

export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

const getParts = text => text.replace(/\r\n|\n\r|\n|\r| /g, "\n").split("\n").map(line => line.trim()).filter(Boolean);

const checkProxy = async (url, signal, testURL = "https://api.ipify.org") => {
    try {
        const targetURL = url.startsWith("http") ? url : `http://${url}`;
        const agent = new HttpsProxyAgent(targetURL);
        const response = await fetch(testURL, {agent, signal});
        const ip = await response.text();
        return `✅ ${ip}`;
    } catch (e) {
        const error = e.message || e.name;
        if (error.includes("reason: ")) return `⚠️ ${error.split("reason: ").pop()}`;
        return `⚠️ ${error}`;
    }
}

bot.on("message:text", async ctx => {
    try {
        const urls = getParts(ctx.msg.text);
        const signal = AbortSignal.timeout(9000);
        const options = {reply_to_message_id: ctx.msg.message_id};
        const replyResult = (url, result, index) => ctx.reply(`[${index}] ${url}\r\n${result}`, options, signal);
        await Promise.all([
            ctx.replyWithChatAction("typing"),
            ctx.reply(`Checking ${urls.length} proxies...`, options, signal),
            ...urls.map((url, index) => checkProxy(url, signal).then(result => replyResult(url, result, index)))
        ]);
    } catch (e) {
        console.error(e);
    }
});

export default bot;
