import bot from "../src/bot.mjs";

const getURL = ({
                    headers = {},
                    path = "api/update",
                    header = "x-forwarded-host",
                }) => {
    const host = headers?.[header] || process.env.VERCEL_URL;
    return new URL(path, `https://${host}`).href;
}

export default async ({headers}, {json}) => {
    const result = await bot.api.setWebhook(getURL({headers}));
    return json({result});
}
