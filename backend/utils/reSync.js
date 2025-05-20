const blockchain = require('../blockchain/blockchain');
const pool = require('../config/db.js');

const reSyncVotersFromBlockchain = async () => {
    try {
        const blockchainData = await blockchain.loadBlockchainFromDatabase();

        if (!blockchainData || blockchainData.length === 0) {
            console.log("ℹ️ No blockchain data found for syncing.");
            return;
        }

        console.log("⏳ Running scheduled blockchain-to-votes_log re-sync...");

        // First, get all existing votes to avoid duplicates
        const [existingVotes] = await pool.execute(
            "SELECT voterID, electionID FROM votes_log"
        );
        
        const existingVotesMap = new Map();
        existingVotes.forEach(vote => {
            const key = `${vote.voterID}-${vote.electionID}`;
            existingVotesMap.set(key, true);
        });

        let syncedCount = 0;
        let skippedCount = 0;
        
        for (let block of blockchainData) {
            const { data } = block;

            // ✅ Validate that data has all required fields
            if (
                !data || typeof data !== 'object' ||
                !data.voter || !data.candidate || !data.election
            ) {
                console.warn("⚠️ Skipping block with missing vote data:", block);
                skippedCount++;
                continue;
            }

            const hashedVoterID = data.voter;
            const candidateID = data.candidate;
            const electionID = data.election;
            const voteTime = data.timestamp || new Date();

            // Find actual voterID from hash
            const [voterRows] = await pool.execute(
                "SELECT voterID FROM voters WHERE SHA2(voterID, 256) = ?",
                [hashedVoterID]
            );

            if (voterRows.length === 0) {
                console.log(`⚠️ No matching voter found for hash: ${hashedVoterID}`);
                skippedCount++;
                continue;
            }

            const voterID = voterRows[0].voterID;

            // Check if candidate exists in the candidates table
            const [candidateRows] = await pool.execute(
                "SELECT id FROM candidates WHERE id = ?",
                [candidateID]
            );

            if (candidateRows.length === 0) {
                console.log(`⚠️ Candidate ID ${candidateID} does not exist in the database. Skipping vote.`);
                skippedCount++;
                continue;
            }

            // Check for existing vote using the map for better performance
            const voteKey = `${voterID}-${electionID}`;
            if (existingVotesMap.has(voteKey)) {
                console.log(`ℹ️ Vote already exists for voterID ${voterID} in election ${electionID}, skipping.`);
                skippedCount++;
                continue;
            }

            // Insert into votes_log including the candidateID field
            await pool.execute(
                "INSERT INTO votes_log (voterID, electionID, candidateID, vote_time) VALUES (?, ?, ?, ?)",
                [voterID, electionID, candidateID, voteTime]
            );

            // Update the map with the new vote
            existingVotesMap.set(voteKey, true);
            
            syncedCount++;
            console.log(`✅ Vote synced for voterID ${voterID} (Election: ${electionID}, Candidate: ${candidateID})`);
        }

        console.log(`✅ Blockchain-to-votes_log re-sync complete. Synced: ${syncedCount}, Skipped: ${skippedCount}`);

    } catch (err) {
        console.error("❌ Error re-syncing votes_log:", err);
        
        // More specific error handling for foreign key constraint failure
        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
            console.error("💡 This error occurs when trying to insert a vote with a candidateID that doesn't exist.");
            console.error("💡 Suggestion: Verify that all candidates in the blockchain exist in the candidates table.");
        }
    }
};

module.exports = {
    reSyncVotersFromBlockchain,
};