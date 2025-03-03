const path = require("path");
const fs = require("fs");
const axios = require("axios");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const speech = require("@google-cloud/speech");

ffmpeg.setFfmpegPath(ffmpegPath);

const client = new speech.SpeechClient({
  keyFilename: path.resolve(
    __dirname,
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
 * Chunk audio into 50-second segments with a 10-minute limit
 */
async function chunkAudio(inputAudioPath) {
  const segmentDuration = 50; // 50 seconds
  const maxDuration = 120; // 10 minutes
  const chunks = [];

  console.log(`[INFO] Calculating total audio duration...`);
  const { stdout } = await execPromise(
    `ffprobe -i "${inputAudioPath}" -show_entries format=duration -v quiet -of csv="p=0"`
  );

  let totalDuration = Math.ceil(parseFloat(stdout));
  console.log(`[INFO] Total audio duration: ${totalDuration} seconds`);

  // Limit to the first 10 minutes
  totalDuration = Math.min(totalDuration, maxDuration);

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

  console.log(
    `[INFO] Audio chunking complete. Total chunks created: ${chunks.length}`
  );
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

  console.log(`[INFO] Transcription for chunk ${index + 1} complete.`);
  return transcription;
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

  // Step 1: Download file from CDN
  await downloadFile(fileUrl, downloadedFilePath);

  let audioPath = downloadedFilePath;

  // Step 2: Extract audio if it's a video file
  const videoExtensions = [".mp4", ".mkv", ".avi", ".mov"];
  const fileExtension = path.extname(downloadedFilePath);
  if (videoExtensions.includes(fileExtension)) {
    audioPath = path.join(tempDir, "audio.wav");
    await extractAudio(downloadedFilePath, audioPath);
  }

  // Step 3: Chunk the audio (limited to 10 minutes)
  const chunks = await chunkAudio(audioPath);

  // Step 4: Transcribe each chunk
  const results = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const content = await transcribeAudio(chunk.path, i);
    results.push({
      startTime: chunk.startTime,
      endTime: chunk.endTime,
      content,
    });
    // Clean up chunk files
    fs.unlinkSync(chunk.path);
  }

  // Clean up the original file
  fs.unlinkSync(downloadedFilePath);
  if (audioPath !== downloadedFilePath) fs.unlinkSync(audioPath);

  console.log(`[INFO] Processing complete. Returning results.`);
  return results;
}

/**
 * Helper function to execute shell commands
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

async function testSTT() {
  const request = {
    config: {
      encoding: "LINEAR16",
      sampleRateHertz: 16000,
      languageCode: "en-US",
    },
    audio: {
      content: Buffer.from("hello world").toString("base64"),
    },
  };
  try {
    const [response] = await client.recognize(request);
    console.log(response);
  } catch (error) {
    console.error("Speech-to-Text test failed:", error);
  }
}

/**
 * Controller for /convert route
 */
const convertController = async (req, res) => {
  const { fileUrl } = req.body;
  testSTT();

  if (!fileUrl) {
    console.warn(`[WARN] Missing fileUrl in request.`);
    return res.status(400).json({ error: "fileUrl is required" });
  }

  try {
    console.log(`[INFO] Received request for file: ${fileUrl}`);
    const result = await processFileFromCDN(fileUrl);
    console.log(`[INFO] Transcription process completed. Sending response.`);
    return res.status(200).json({ success: true, transcriptions: result });
  } catch (error) {
    console.error(`[ERROR] Failed to process file: ${error.message}`);
    return res
      .status(500)
      .json({ error: "Failed to process the file", details: error.message });
  }
};

module.exports = { convertController };
