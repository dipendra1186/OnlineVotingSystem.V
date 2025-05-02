const blockchain = require('../blockchain/blockchain');
const pool = require('../config/db.js');

const reSyncVotersFromBlockchain = async () => {
    try {
        const blockchainData = await blockchain.loadBlockchainFromDatabase();

        if (!blockchainData || blockchainData.length === 0) {
            // ✅ Exit silently when there's nothing to sync
            return;
        }

        console.log("⏳ Running scheduled blockchain-to-voters re-sync...");

        for (let block of blockchainData) {
            const { data } = block;

            if (!data || !data.voter) {
                console.warn("⚠️ Skipping block with missing voter data:", block);
                continue;
            }

            const { voter: hashedVoterID } = data;

            const result = await pool.execute(
                "UPDATE voters SET has_voted = 1 WHERE SHA2(voterID, 256) = ?",
                [hashedVoterID]
            );

            if (result[0].affectedRows === 0) {
                console.log(`⚠️ No matching voter found for: ${hashedVoterID}`);
            }
        }

        console.log("✅ Blockchain-to-voters re-sync complete.");

    } catch (err) {
        console.error("❌ Error re-syncing voters table:", err);
    }
};

module.exports = {
    reSyncVotersFromBlockchain,
};
