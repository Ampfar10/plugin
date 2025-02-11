const admin = require("firebase-admin");
const ffmpeg = require("fluent-ffmpeg");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Initialize Firebase
const serviceAccount = require("../../william-b3a2b-firebase-adminsdk-u5y2f-ee37853315.json");
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

module.exports = {
    name: "coll",
    aliases: ["cards"],
    category: "Card game",
    async execute(ctx) {
        const userId = ctx._sender?.jid;
        if (!userId) {
            console.error("User ID is undefined");
            return ctx.reply("🟥 *User not found.*");
        }

        try {
            const userDoc = await db.collection("users").doc(userId).get();
            if (!userDoc.exists) {
                return ctx.reply("🟥 *User not found.*");
            }

            const userData = userDoc.data();
            const claimedCards = userData.claimedCards || [];

            if (claimedCards.length === 0) {
                return ctx.reply("🟥 *You have no claimed cards.*");
            }

            // Parse arguments for specific card selection
            const args = ctx.args;
            const isTierMode = args.includes("--tier");
            const isNameMode = args.includes("--name");
            const isSortMode = args.includes("--sort");  

            if (isSortMode) {
                claimedCards.sort((a, b) => (a.title.toLowerCase() > b.title.toLowerCase() ? 1 : -1));
            }

            if (isNameMode && args.length === 2) {
                const cardName = args.slice(1).join(" ").toLowerCase();
                const card = claimedCards.find(c => c.title.toLowerCase() === cardName);
                const cardIndex = claimedCards.findIndex(c => c.title.toLowerCase() === cardName);
                if (card) {
                    const mediaType = card.url.toLowerCase().endsWith(".gif") ? "video" : "image";
                    const mediaOptions = mediaType === "video" ? { gifPlayback: true } : {}; 

                    // If the card URL is a gif, download and save it
                    if (mediaType === "video") {
                        const gifPath = path.resolve(__dirname, "../../downloads", `${card.title}.gif`);
                        await downloadGif(card.url, gifPath);
                        return await ctx.reply({
                            video: { url: gifPath },
                            caption: `📜 *Card Details:*\n\n*Index:* #${cardIndex + 1}\n*🃏Name:* ${card.title}\n*⭐Tier:* ${card.tier}\n*💰Price:* ${card.price} bnhz `
                        });
                    } else {
                        return await ctx.reply({
                            [mediaType]: { url: card.url, ...mediaOptions },
                            caption: `📜 *Card Details:*\n\n*Index:* #${cardIndex + 1}\n*🃏Name:* ${card.title}\n*⭐Tier:* ${card.tier}\n*💰Price:* ${card.price} bnhz `
                        });
                    }
                } else {
                    return ctx.reply("🟥 *Card not found in your collection.*");
                }
            } else if (args.length === 1 && !isTierMode) {
                const index = parseInt(args[0], 10) - 1;
                if (index >= 0 && index < claimedCards.length) {
                    const card = claimedCards[index];
                    const mediaType = card.url.toLowerCase().endsWith(".gif") ? "video" : "image";
                    const mediaOptions = mediaType === "video" ? { gifPlayback: true } : {}; 

                    // If the card URL is a gif, download and save it
                    if (mediaType === "video") {
                        const gifPath = path.resolve(__dirname, "../../downloads", `${card.title}.gif`);
                        await downloadGif(card.url, gifPath);
                        return await ctx.reply({
                            video: { url: gifPath },
                            caption: `📜 *Card Details:*\n\n*🃏Name:* ${card.title}\n*⭐Tier:* ${card.tier}\n*💰Price:* ${card.price} bnhz`
                        });
                    } else {
                        return await ctx.reply({
                            [mediaType]: { url: card.url, ...mediaOptions },
                            caption: `📜 *Card Details:*\n\n*🃏Name:* ${card.title}\n*⭐Tier:* ${card.tier}\n*💰Price:* ${card.price} bnhz`
                        });
                    }
                } else {
                    return ctx.reply("🟥 *Invalid card index.*");
                }
            } else if (isTierMode) {
                const tiers = {
                    "S": { cards: [], emoji: "💎" },
                    "6": { cards: [], emoji: "🧧" }, 
                    "5": { cards: [], emoji: "🔮" },
                    "4": { cards: [], emoji: "🧸" },
                    "3": { cards: [], emoji: "🚀" },
                    "2": { cards: [], emoji: "⭐" },
                    "1": { cards: [], emoji: "🏮" }
                };

                claimedCards.forEach((card) => {
                    const tier = card.tier || "1"; 
                    (tiers[tier] || tiers["1"]).cards.push(card);
                });

                let tierList = "📜 *Your Claimed Cards by Tier:*\n\n";
                Object.keys(tiers).sort((a, b) => (a === "S" ? -1 : b === "S" ? 1 : b - a)).forEach((tier) => {
                    if (tiers[tier].cards.length > 0) {
                        tierList += `${tiers[tier].emoji} *Tier ${tier}*${tiers[tier].emoji}\n`;
                        tiers[tier].cards.forEach((card, index) => {
                            tierList += `#${index + 1} ${card.title}\n`;
                        });
                        tierList += "\n";
                    }
                });

                const randomCard = claimedCards[Math.floor(Math.random() * claimedCards.length)];
                const mediaType = randomCard.url.toLowerCase().endsWith(".gif") ? "video" : "image";
                const mediaOptions = mediaType === "video" ? { gifPlayback: true } : {}; 

                // If the card URL is a gif, download and save it
                if (mediaType === "video") {
                    const gifPath = path.resolve(__dirname, "../../downloads", `${randomCard.title}.gif`);
                    await downloadGif(randomCard.url, gifPath);
                    return await ctx.reply({
                        video: { url: gifPath },
                        caption: tierList
                    });
                } else {
                    return await ctx.reply({
                        [mediaType]: { url: randomCard.url, ...mediaOptions },
                        caption: tierList
                    });
                }
            } else {
                let cardList = "📜 *Here Are Your Claimed Cards:*\n\n";
                claimedCards.forEach((card, index) => {
                    cardList += `#${index + 1} ${card.title}\n`;
                });

                const randomCard = claimedCards[Math.floor(Math.random() * claimedCards.length)];
                const mediaType = randomCard.url.toLowerCase().endsWith(".gif") ? "video" : "image";
                const mediaOptions = mediaType === "video" ? { gifPlayback: true } : {}; 

                // If the card URL is a gif, download and save it
                if (mediaType === "video") {
                    const gifPath = path.resolve(__dirname, "../../downloads", `${randomCard.title}.gif`);
                    await downloadGif(randomCard.url, gifPath);
                    return await ctx.reply({
                        video: { url: gifPath },
                        caption: cardList
                    });
                } else {
                    return await ctx.reply({
                        [mediaType]: { url: randomCard.url, ...mediaOptions },
                        caption: cardList
                    });
                }
            }
        } catch (error) {
            console.error("Error fetching or displaying user collection:", error);
            await ctx.reply("🟥 *An error occurred while retrieving your card collection.*");
        }
    }
};

// Helper function to download GIF files
async function downloadGif(url, outputPath) {
    const writer = fs.createWriteStream(outputPath);
    const response = await axios({
        url,
        method: "GET",
        responseType: "stream"
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
    });
}
