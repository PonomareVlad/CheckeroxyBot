import {Bot} from "grammy";
import fetch from "node-fetch";
import HttpsProxyAgent from "https-proxy-agent";

export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

const getURL = text => new URL(text.startsWith("http") ? text : `http://${text}`).href;

const getParts = text => text.replace(/\r\n|\n\r|\n|\r| /g, "\n").split("\n").map(line => line.trim()).filter(Boolean);

const checkProxy = async (url, signal, testURL = "https://api.ipify.org") => {
    try {
        const agent = new HttpsProxyAgent(getURL(url));
        const response = await fetch(testURL, {agent, signal});
        const ip = await response.text();
        return `${response.ok ? "✅" : "⚠️"} ${ip}`;
    } catch (e) {
        const error = e.message || e.name;
        if (error.includes("reason: ")) return `⚠️ ${error.split("reason: ").pop()}`;
        return `⚠️ ${error}`;
    }
}

bot.on("message:text", async ctx => {
    const signal = AbortSignal.timeout(9000);
    try {
        const time = Date.now();
        const urls = getParts(ctx.msg.text);
        const options = {reply_to_message_id: ctx.msg.message_id};
        const replyResult = (url, result, index) => {
            return ctx.reply(`[${index}] ${url}\r\n${result}\r\n⏱️ ${Date.now() - time} ms`, options);
        }
        await Promise.all([
            ctx.replyWithChatAction("typing"),
            ctx.reply(`Checking ${urls.length} proxies...`, options, signal),
            ...urls.map((url, index) => checkProxy(url, signal).then(result => replyResult(url, result, index)))
        ]);
    } catch (e) {
        console.error(e);
        if (signal.aborted) return ctx.reply(`⚠️ Other proxies did not respond within 10 seconds`);
        return ctx.reply(`⚠️ ${e.message || e.name}`);
    }
});

export default bot;
