const express = require("express");
const multer = require("multer"); // Middleware to handle file uploads
const cloudinary = require("../config/cloudinary"); // Cloudinary configuration
const fs = require("fs"); // File System module

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // Temporary storage

// Upload Route
router.post("/upload", upload.single("image"), async (req, res) => {
    try {
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "voting-system", // Optional: Store images in a specific folder
        });

        // Delete temporary file after upload
        fs.unlinkSync(req.file.path);

        res.status(200).json({
            success: true,
            message: "Image uploaded successfully",
            imageUrl: result.secure_url, // Return Cloudinary URL
        });
    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        res.status(500).json({ success: false, message: "Image upload failed" });
    }
});

module.exports = router;
