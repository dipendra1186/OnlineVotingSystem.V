const crypto = require("crypto");
const db = require("../config/db"); // Assuming you're using a pool with promise API

class Block {
    constructor(index, timestamp, data, previousHash = "") {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data; // Contains hashed voterID and candidateID
        this.previousHash = previousHash;
        this.hash = this.calculateHash();
    }

    calculateHash() {
        return crypto
            .createHash("sha256")
            .update(this.index + this.timestamp + JSON.stringify(this.data) + this.previousHash)
            .digest("hex");
    }
}

class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.initialized = false;
    }

    createGenesisBlock() {
        return new Block(0, new Date().toISOString(), "Genesis Block", "0");
    }

    getLatestBlock() {
        if (this.chain.length === 0) {
            throw new Error("Blockchain is empty — no latest block available.");
        }
        return this.chain[this.chain.length - 1];
    }


    async hasVoted(hashedVoterElectionID) {
        try {
            // Use transaction to prevent race conditions
            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();
                
                const [rows] = await connection.execute(
                    "SELECT * FROM blockchain WHERE JSON_EXTRACT(data, '$.voter') = ?",
                    [hashedVoterElectionID]
                );
                
                await connection.commit();
                connection.release();
                
                return rows.length > 0;
            } catch (err) {
                if (connection) {
                    await connection.rollback();
                    connection.release();
                }
                throw err;
            }
        } catch (err) {
            console.error("Error checking if voter has already voted:", err);
            throw err;
        }
    }

    async addBlock(newData) {
        if (!this.initialized) {
            await this.loadBlockchainFromDatabase();
            this.initialized = true;
        }

        // Extract hashed voterID
        const hashedVoterElectionID = newData.voter;
        
        try {
            // Check for duplicate vote with proper transaction handling
            const hasAlreadyVoted = await this.hasVoted(hashedVoterElectionID);
            
            if (hasAlreadyVoted) {
                throw new Error("You have already voted.");
            }
            
            const latestBlock = this.getLatestBlock();
            const newBlock = new Block(
                latestBlock.index + 1,
                newData.timestamp || new Date().toISOString(),
                newData,
                latestBlock.hash
            );
            
            // Save to database first, then add to memory chain only if DB operation succeeds
            await this.saveBlockToDatabase(newBlock);
            
            // Now that DB operation succeeded, update memory
            this.chain.push(newBlock);
            
            return newBlock;
        } catch (err) {
            console.error("Error in blockchain addBlock:", err);
            throw err; // Re-throw to be handled by controller
        }
    }

    async saveBlockToDatabase(block) {
        const { index, timestamp, data, previousHash, hash } = block;
        const query = `INSERT INTO blockchain (\`index\`, timestamp, data, previousHash, hash) VALUES (?, ?, ?, ?, ?)`;

        // Use transaction for atomic operation
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute(query, [index, timestamp, JSON.stringify(data), previousHash, hash]);
            await connection.commit();
            connection.release();
        } catch (err) {
            if (connection) {
                await connection.rollback();
                connection.release();
            }
            console.error("Error saving block to database:", err);
            throw err;
        }
    }

    isValidChain() {
        for (let i = 1; i < this.chain.length; i++) {
            const curr = this.chain[i];
            const prev = this.chain[i - 1];

            if (curr.hash !== curr.calculateHash()) return false;
            if (curr.previousHash !== prev.hash) return false;
        }
        return true;
    }

    async loadBlockchainFromDatabase() {
        const query = "SELECT * FROM blockchain ORDER BY `index`";
        try {
            const [rows] = await db.execute(query);

            if (rows.length === 0) {
                // Reinitialize with Genesis Block
                const genesisBlock = this.createGenesisBlock();
                this.chain = [genesisBlock];
                await this.saveBlockToDatabase(genesisBlock);
                return this.chain;
            }

            const blocks = rows.map(
                (row) => new Block(row.index, row.timestamp, JSON.parse(row.data), row.previousHash)
            );
            this.chain = blocks;
            return blocks;
        } catch (err) {
            console.error("Error loading blockchain from database:", err);
            return [];
        }
    }
}

module.exports = new Blockchain();