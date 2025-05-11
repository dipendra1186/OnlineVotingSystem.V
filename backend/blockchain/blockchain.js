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

    async addBlock(newData) {
        // Extract hashed voterID
        const hashedVoterID = newData.voter;

        // ✅ Check for duplicate vote in the DB
        const [rows] = await db.execute(
            "SELECT * FROM blockchain WHERE JSON_EXTRACT(data, '$.voter') = ?",
            [hashedVoterID]
        );

        if (rows.length > 0) {
            // 🛑 Instead of throwing, return a rejected Promise to handle it in controller
            throw new Error("You have already voted.");
        }

        const latestBlock = this.getLatestBlock();
        const newBlock = new Block(
            latestBlock.index + 1,
            new Date().toISOString(),
            newData,
            latestBlock.hash
        );

        this.chain.push(newBlock);
        await this.saveBlockToDatabase(newBlock);

        return newBlock;
    }

    async saveBlockToDatabase(block) {
        const { index, timestamp, data, previousHash, hash } = block;
        const query = `INSERT INTO blockchain (\`index\`, timestamp, data, previousHash, hash) VALUES (?, ?, ?, ?, ?)`;

        try {
            await db.execute(query, [index, timestamp, JSON.stringify(data), previousHash, hash]);
        } catch (err) {
            console.error("Error saving block to database:", err);
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
