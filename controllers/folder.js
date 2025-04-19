const path = require("path");
const { Media, DbMeta } = require("../models/models");
const { scanStaticDirectory, scan } = require("../utils/scanFolder");
const { staticPath, baseUrl, scanPassword } = require("../config/config");

const staticDirectory = path.resolve(staticPath);

/**
 * 
const createFolder = async (req, res) => {
  const { folderName, folderLocation, contentType } = req.body;
  try {
    const folder = new Folder({ folderName, folderLocation, contentType });
    await folder.save();
    res.status(201).json(folder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const getFolders = async (req, res) => {
  try {
    const folders = await Folder.find();
    res.status(200).json(folders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createFolderWithFiles = async (req, res) => {
  console.log("req.body", req.body);
  const { folderName, folderLocation, contentType } = req.body;

  try {
    // Step 1: Save the folder details
    const folder = new Folder({ folderName, folderLocation, contentType });
    await folder.save();

    // Step 2: Scan the folder for files
    const files = scanFolder(folderLocation);

    // Step 3: Save files to the database
    const fileEntries = files.map((file) => ({
      folderId: folder._id,
      fileName: file.fileName,
    }));

    await File.insertMany(fileEntries);

    res.status(201).json({ folder, files: fileEntries });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

*/

const scanStaticContent = async (req, res) => {
  await scanStaticDirectory(staticDirectory, baseUrl);
  res.status(200).json({ message: "Static directory scanned successfully!" });
};

const scanForVideos = async (req, res) => {
  console.log("scanning");
  const { type } = req.query;
  const { password } = req.body;
  if (password !== scanPassword) {
    return res.status(400).send("Wrong password");
  }
  console.log(password, "password");
  let files = await scan(staticDirectory, baseUrl, type);
  let data = await Media.insertMany(files);
  let mediaCount = await Media.countDocuments();
  let mediaPages = Math.ceil(mediaCount / 10);
  let typeCount = await Media.countDocuments({ mediaType: type });
  let typePages = Math.ceil(typeCount / 10);
  await updateCount({ type, mediaCount, mediaPages, typeCount, typePages });
  return res.send(data);
};

const getContent = async (req, res) => {
  let { type, page = 1 } = req.query;
  console.log(type);
  page = Number(page);
  const mediaFiles = await Media.find()
    .skip((page - 1) * 10) // Skip previous pages
    .limit(10) // Get only `limit` items
    .exec();
  return res.status(200).send(mediaFiles);
};

const getTouchedContent = async (req, res) => {
  let { type, page = 1 } = req.query;
  console.log(type);
  page = Number(page);
  const mediaFiles = await Media.find({ mediaType: type, isTouched: true })
    .skip((page - 1) * 10) // Skip previous pages
    .limit(10) // Get only `limit` items
    .exec();
  return res.status(200).send(mediaFiles);
};

const getDbMeta = async (req, res) => {
  let data = await DbMeta.findOne();
  return res.status(200).send(data);
};

module.exports = {
  scanStaticContent,
  scanForVideos,
  getContent,
  getDbMeta,
  getTouchedContent,
};

// dbOps

async function updateCount({
  type,
  mediaCount,
  mediaPages,
  typeCount,
  typePages,
}) {
  let dbMeta = await DbMeta.findOne();
  if (!dbMeta) {
    let newDbMeta = new DbMeta({
      totalMedia: mediaCount,
      totalPages: mediaPages,
      [`${type}`]: typeCount,
      [`${type}Pages`]: typePages,
    });
    await newDbMeta.save();
  } else {
    dbMeta["totalMedia"] = mediaCount;
    dbMeta["totalPages"] = mediaPages;
    dbMeta[`${type}`] = typeCount;
    dbMeta[`${type}Pages`] = typePages;
    await dbMeta.save();
  }
}

async function addMedia(mediaType) {}

// i want to store the count of content somewhere
