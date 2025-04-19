const path = require("path");
const fs = require("fs");
const axios = require("axios");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const speech = require("@google-cloud/speech");

let pLimit;
async function getLimiter() {
  if (!pLimit) {
    const mod = await import("p-limit");
    pLimit = mod.default;
  }
  return pLimit(3); // concurrency limit
}

ffmpeg.setFfmpegPath(ffmpegPath);

const client = new speech.SpeechClient({
  keyFilename: path.resolve(
    __dirname,
    "..",
    "lisc",
    "round-music-450811-g5-ca7499541424.json"
  ),
});

/**
 * Download file from a CDN URL
 */
async function downloadFile(url, outputPath) {
  console.log(`[INFO] Downloading file from URL: ${url}`);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });
  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", () => {
      console.log(`[INFO] File downloaded successfully: ${outputPath}`);
      resolve(outputPath);
    });
    writer.on("error", (error) => {
      console.error(`[ERROR] Failed to download file: ${error.message}`);
      reject(error);
    });
  });
}

/**
 * Extract audio from a video file
 */
function extractAudio(videoPath, outputAudioPath) {
  console.log(`[INFO] Extracting audio from video: ${videoPath}`);
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(outputAudioPath)
      .noVideo()
      .audioCodec("pcm_s16le")
      .audioChannels(1)
      .audioFrequency(16000)
      .on("end", () => {
        console.log(`[INFO] Audio extracted successfully: ${outputAudioPath}`);
        resolve(outputAudioPath);
      })
      .on("error", (error) => {
        console.error(`[ERROR] Failed to extract audio: ${error.message}`);
        reject(error);
      })
      .run();
  });
}

/**
 * Chunk audio into 50-second segments (no artificial limit)
 */
async function chunkAudio(inputAudioPath) {
  const segmentDuration = 50;
  const chunks = [];

  console.log(`[INFO] Calculating total audio duration...`);
  const { stdout } = await execPromise(
    `ffprobe -i "${inputAudioPath}" -show_entries format=duration -v quiet -of csv="p=0"`
  );

  let totalDuration = Math.ceil(parseFloat(stdout));
  console.log(`[INFO] Total audio duration: ${totalDuration} seconds`);

  for (let start = 0; start < totalDuration; start += segmentDuration) {
    const chunkPath = path.join(
      path.dirname(inputAudioPath),
      `chunk_${start}.wav`
    );
    console.log(
      `[INFO] Creating chunk: ${chunkPath} (from ${start}s to ${Math.min(
        start + segmentDuration,
        totalDuration
      )}s)`
    );
    const command = `ffmpeg -y -i "${inputAudioPath}" -ss ${start} -t ${segmentDuration} -acodec pcm_s16le -ar 16000 -ac 1 "${chunkPath}"`;
    await execPromise(command);
    chunks.push({
      startTime: start,
      endTime: Math.min(start + segmentDuration, totalDuration),
      path: chunkPath,
    });
  }

  console.log(`[INFO] Audio chunking complete. Total chunks: ${chunks.length}`);
  return chunks;
}

/**
 * Transcribe an audio file using Google Speech-to-Text
 */
async function transcribeAudio(filePath, index) {
  console.log(`[INFO] Transcribing chunk ${index + 1}: ${filePath}`);
  const fileContent = fs.readFileSync(filePath);
  const audio = { content: fileContent.toString("base64") };

  const config = {
    encoding: "LINEAR16",
    sampleRateHertz: 16000,
    languageCode: "en-US",
  };

  const request = { audio, config };
  const [response] = await client.recognize(request);
  const transcription = response.results
    .map((result) => result.alternatives[0].transcript)
    .join(" ");

  console.log(`[INFO] Transcription complete for chunk ${index + 1}`);
  return transcription;
}

/**
 * Optional retry wrapper
 */
async function transcribeWithRetry(filePath, index, retries = 2) {
  try {
    return await transcribeAudio(filePath, index);
  } catch (err) {
    if (retries > 0) {
      console.warn(`[WARN] Retrying chunk ${index + 1}...`);
      await new Promise((res) => setTimeout(res, 2000));
      return transcribeWithRetry(filePath, index, retries - 1);
    }
    throw err;
  }
}

/**
 * Main function to process audio/video file from a CDN URL
 */
async function processFileFromCDN(fileUrl) {
  console.log(`[INFO] Starting process for file: ${fileUrl}`);
  const tempDir = path.join(__dirname, "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const fileName = path.basename(fileUrl);
  const downloadedFilePath = path.join(tempDir, fileName);

  // Step 1: Download file
  await downloadFile(fileUrl, downloadedFilePath);

  let audioPath = downloadedFilePath;

  // Step 2: Extract audio if video
  const videoExtensions = [".mp4", ".mkv", ".avi", ".mov"];
  const fileExtension = path.extname(downloadedFilePath);
  if (videoExtensions.includes(fileExtension)) {
    audioPath = path.join(tempDir, "audio.wav");
    await extractAudio(downloadedFilePath, audioPath);
  }

  // Step 3: Chunk audio
  const chunks = await chunkAudio(audioPath);

  // Step 4: Transcribe concurrently with control
  const limit = await getLimiter();

  const transcriptionPromises = chunks.map((chunk, index) =>
    limit(async () => {
      try {
        const content = await transcribeWithRetry(chunk.path, index);
        return {
          startTime: chunk.startTime,
          endTime: chunk.endTime,
          index,
          content,
        };
      } catch (error) {
        return {
          startTime: chunk.startTime,
          endTime: chunk.endTime,
          index,
          content: `[ERROR] Transcription failed: ${error.message}`,
        };
      } finally {
        fs.unlinkSync(chunk.path); // cleanup
      }
    })
  );

  let results = await Promise.all(transcriptionPromises);
  results = results.sort((a, b) => a.index - b.index); // sort by original order

  // Final cleanup
  fs.unlinkSync(downloadedFilePath);
  if (audioPath !== downloadedFilePath) fs.unlinkSync(audioPath);

  console.log(`[INFO] Processing complete.`);
  return results;
}

/**
 * Shell command helper
 */
function execPromise(cmd) {
  const { exec } = require("child_process");
  console.log(`[INFO] Executing command: ${cmd}`);
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`[ERROR] Command failed: ${cmd}`);
        console.error(stderr);
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/**
 * Controller for /convert route
 */
const convertController = async (req, res) => {
  const { fileUrl } = req.body;

  if (!fileUrl) {
    console.warn(`[WARN] Missing fileUrl in request.`);
    return res.status(400).json({ error: "fileUrl is required" });
  }

  try {
    console.log(`[INFO] Received request for file: ${fileUrl}`);
    const result = await processFileFromCDN(fileUrl);
    console.log(`[INFO] Transcription complete.`);
    return res.status(200).json({ success: true, transcriptions: result });
  } catch (error) {
    console.error(`[ERROR] Failed to process file: ${error.message}`);
    return res
      .status(500)
      .json({ error: "Failed to process the file", details: error.message });
  }
};

module.exports = { convertController };
