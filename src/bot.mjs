import {Bot} from "grammy";
import fetch from "node-fetch";
import HttpsProxyAgent from "https-proxy-agent";
import {code, fmt, hydrateReply} from "@grammyjs/parse-mode";

export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

const getURL = text => new URL(text.startsWith("http") ? text : `http://${text}`).href;

const getParts = text => text.replace(/\r\n|\n\r|\n|\r| /g, "\n").split("\n").map(line => line.trim()).filter(Boolean);

const checkProxy = async (url, signal, testURL = "https://api.ipify.org") => {
    try {
        const agent = new HttpsProxyAgent(getURL(url));
        const response = await fetch(testURL, {agent, signal});
        const result = await response.text();
        return fmt`${response.ok ? "✅" : "⚠️"} ${code(result)}`;
    } catch (e) {
        if (signal.aborted) throw e;
        const error = e.message || e.name;
        if (error.includes("reason: ")) return fmt`⚠️ ${code(error.split("reason: ").pop())}`;
        return fmt`⚠️ ${code(error)}`;
    }
}

bot.use(hydrateReply);

bot.command("start", ctx => {
    return ctx.replyFmt(fmt`Send proxy URLs in format:\r\n${code(`IP:PORT`)} or ${code(`LOGIN:PASSWORD@IP:PORT`)}`);
});

bot.on(":text", async ctx => {
    const signal = AbortSignal.timeout(9000);
    try {
        const time = Date.now();
        const urls = getParts(ctx.msg.text);
        const options = {reply_to_message_id: ctx.msg.message_id};
        const replyResult = (url, result, index) => {
            const duration = Date.now() - time;
            return ctx.replyFmt(fmt`[${code(index)}] ${code(url)}\r\n${result}\r\n⏱️ ${duration} ms`, options);
        }
        await ctx.reply(`Checking ${urls.length} proxies...`, options, signal);
        await Promise.all([
            ctx.replyWithChatAction("typing"),
            ...urls.map((url, index) => checkProxy(url, signal).then(result => replyResult(url, result, index)))
        ]);
    } catch (e) {
        console.error(e);
        if (signal.aborted) return ctx.reply(`⚠️ Other proxies did not respond within 10 seconds`);
        return ctx.replyFmt(fmt`⚠️ ${code(e.message || e.name)}`);
    }
});

export default bot;
