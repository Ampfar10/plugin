import admin from "firebase-admin";
import { Ctx } from "../../lib/ctx";
import { db, invalidateUserDocumentCache } from "../../db/DatabaseHandler";
import { appendSpendingHistoryEntry } from "../../lib/economy/economyStatement";
import { formatBnhz, formatDuration, getJailRemainingMs } from "../../lib/economy/economyStore";
import { debitUserBankAccounts, getTotalUserBankBalance, getUserBankAccounts } from "../../lib/economy/banking";
import { isNewBankSystemEnabled } from "../../lib/economy/bankSystemSettings";

module.exports = {
  name: "paybail",
  aliases: ["bail"],
  category: "Economy",
  code: async (ctx: Ctx): Promise<void> => {
    const userId = ctx.sender?.jid;
    if (!userId) return void ctx.reply("🟥 *User not found.*");

    const userRef = db.collection("users").doc(userId);

    try {
      let bailAmount = 0;
      let walletUsed = 0;
      let bankUsed = 0;

      await db.runTransaction(async (transaction: any) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) throw new Error("User not found.");

        const userData = userDoc.data() || {};
        const jailRemaining = getJailRemainingMs(userData);

        if (jailRemaining <= 0) throw new Error("Not jailed.");

        bailAmount = Math.max(0, Number(userData.bailAmount || 0));
        const wallet = Math.max(0, Number(userData.wallet || 0));
        const usingNewBank = isNewBankSystemEnabled();
        const bank = usingNewBank
          ? getTotalUserBankBalance(userData, { withdrawableOnly: true })
          : getTotalUserBankBalance(userData);
        const totalHeld = wallet + bank;

        if (totalHeld < bailAmount) throw new Error(`Insufficient:${bailAmount}`);

        walletUsed = Math.min(wallet, bailAmount);
        bankUsed = Math.max(0, bailAmount - walletUsed);
        const debitedBanks = usingNewBank
          ? debitUserBankAccounts(userData, bankUsed, { withdrawableOnly: true })
          : debitUserBankAccounts(userData, bankUsed);

        if (debitedBanks.remainingAmount > 0) {
          throw new Error(`Insufficient:${bailAmount}`);
        }

        const hasRealBankAccounts = getUserBankAccounts(userData).length > 0;
        const nextBankTotal = hasRealBankAccounts
          ? getTotalUserBankBalance({ bankAccounts: debitedBanks.accounts })
          : Math.max(0, Number(userData.bank || 0)) - bankUsed;

        transaction.update(userRef, {
          wallet: wallet - walletUsed,
          ...(hasRealBankAccounts
            ? {
                bankAccounts: debitedBanks.accounts,
                bank: nextBankTotal,
              }
            : {
                bank: nextBankTotal,
              }),
          jailedUntil: 0,
          bailAmount: 0,
          spendingHistory: appendSpendingHistoryEntry(userData.spendingHistory, {
            amount: bailAmount,
            category: "Bail",
            detail:
              bankUsed > 0
                ? `Wallet ${formatBnhz(walletUsed)} + Bank ${formatBnhz(bankUsed)}`
                : "Wallet only",
            timestamp: Date.now(),
            direction: "expense",
          }),
        });
      });

      invalidateUserDocumentCache(userId);

      const sourceLine =
        bankUsed > 0
          ? `\nWallet: *${formatBnhz(walletUsed)}* | Bank: *${formatBnhz(bankUsed)}*`
          : "";
      await ctx.reply(`🔓 Bail paid. You spent *${formatBnhz(bailAmount)}* and are out of jail now.${sourceLine}`);
    } catch (error: any) {
      if (error.message === "User not found.") {
        return void ctx.reply("🟥 *User not found. Please write !register*");
      }
      if (error.message === "Not jailed.") {
        return void ctx.reply("🟨 *You are not in jail right now.*");
      }
      if (String(error.message || "").startsWith("Insufficient:")) {
        const bail = Number(String(error.message).split(":")[1] || 0);
        const userDoc = await userRef.get();
        const userData = userDoc.data() || {};
        const wallet = Math.max(0, Number(userData.wallet || 0));
        const bank = isNewBankSystemEnabled()
          ? getTotalUserBankBalance(userData, { withdrawableOnly: true })
          : getTotalUserBankBalance(userData);
        const totalHeld = wallet + bank;
        return void ctx.reply(
          `🟥 *You do not have enough money to pay bail.*\n` +
            `Bail: *${formatBnhz(bail)}*\n` +
            `Wallet + Available Banks: *${formatBnhz(totalHeld)}*\n` +
            `Time left: *${formatDuration(getJailRemainingMs(userData))}*`
        );
      }

      console.error("Error processing paybail command:", error);
      return void ctx.reply("❌ An error occurred while paying bail.");
    }
  },
};
