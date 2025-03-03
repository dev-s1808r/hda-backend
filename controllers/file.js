const { File } = require("../models/models");

const createFile = async (req, res) => {
  const { folderId, fileName, status } = req.body;
  try {
    const file = new File({ folderId, fileName, status });
    await file.save();
    res.status(201).json(file);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getFiles = async (req, res) => {
  try {
    const { folderId } = req.params; // Extract folderId from request parameters
    const query = folderId ? { folderId } : {}; // If folderId is provided, filter by it
    const files = await File.find(query).populate("folderId", "folderName");
    res.status(200).json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const file = {
  createFile,
  getFiles,
};

module.exports = file;
