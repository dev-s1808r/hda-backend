const fs = require("fs").promises;
const path = require("path");
const { Folder, Media } = require("../models/models"); // Assuming Folder model includes the embedded file schema

async function scanStaticDirectory(staticPath, baseUrl) {
  console.log("Scanning static directory...");
  console.log("Static path:", staticPath);
  console.log("Base URL:", baseUrl);

  try {
    // Read all items (folders and files) in the static directory
    const items = await fs.readdir(staticPath); // No withFileTypes

    let folderCount = 0;
    let fileCount = 0;

    for (const item of items) {
      const itemPath = path.join(staticPath, item);
      const stats = await fs.lstat(itemPath); // Check type of the item

      if (stats.isDirectory()) {
        const folderName = item;
        const folderLocation = `${baseUrl}/${folderName}`;

        // Check if folder already exists in DB
        let folder = await Folder.findOne({ folderName });
        if (!folder) {
          folder = await Folder.create({
            folderName,
            folderLocation,
            contentType: "video", // Default contentType, adjust as needed
            file: [], // Initialize empty file array
          });
          folderCount++;
          console.log(`New folder added: ${folderName}`);
        }

        // Scan files in the folder
        const files = await fs.readdir(itemPath);
        for (const fileName of files) {
          const filePath = `${folderLocation}/${fileName}`;

          // Check if the file already exists in the folder's file array
          const fileExists = folder.file.some((f) => f.fileName === fileName);

          if (!fileExists) {
            // Add the file to the folder's file array
            folder.file.push({
              filePath,
              fileName,
              status: "draft", // Default status
            });
            fileCount++;
            console.log(`New file added: ${fileName} in folder ${folderName}`);
          }
        }

        // Save updates to the folder
        await folder.save();
      }
    }

    console.log(`Static directory scan completed!`);
    console.log(`New folders added: ${folderCount}`);
    console.log(`New files added: ${fileCount}`);
  } catch (error) {
    console.error("Error scanning static directory:", error.message);
    console.error(error.stack);
  }
}

async function scan(staticPath, baseUrl, type) {
  console.log("\n\n");
  console.log("Scanning static directory...");
  console.log("Static path:", staticPath);
  console.log("Base URL:", baseUrl);
  console.log("type: ", type);
  let mediaArray = [];
  try {
    const folders = await fs.readdir(staticPath);
    if (folders.length > 3) {
      throw new Error("There can only be three folders");
    }

    let folderOfInterest = folders.filter((e) => e === type);
    if (folderOfInterest.length > 1) {
      throw new Error("There cannot be two folders for one media type");
    }

    const folderPath = path.join(staticPath, folderOfInterest.toString());
    const stats = await fs.lstat(folderPath);

    let folderUrl = "";
    if (stats.isDirectory()) {
      folderUrl = `${baseUrl}/static/${folderOfInterest}`;
      console.log(folderUrl);
    }

    let allFiles = await fs.readdir(folderPath);
    // console.log(allFiles);
    let mediaFiles = await Media.find({ mediaType: [type] });
    let names = mediaFiles.map((media) => media.pseudoName);
    // console.log(names);

    let files = allFiles.filter((f) => !names.includes(f));
    // console.log(files);

    console.log(files.length);
    // console.log(files);
    for (const file of files) {
      let pseudoName = file;
      let mediaPath = `${folderUrl}/${pseudoName}`;
      let mediaType = type;
      let media = { pseudoName, mediaPath, mediaType };
      mediaArray.push(media);
    }
  } catch (error) {
    console.log(error.message);
  }
  console.log(mediaArray.length, "Files scanned");
  return mediaArray;
}

module.exports = { scanStaticDirectory, scan };
