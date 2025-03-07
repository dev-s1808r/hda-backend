const { Media, User } = require("../models/models");

const mediaTypes = ["audios", "videos", "photos"];

const findMediaById = async (req, res) => {
  const { mediaId } = req.params;
  const mediaFile = await Media.findById(mediaId);
  console.log(mediaId);
  if (!mediaFile) return res.status(404).send("Media file not found");
  res.status(200).send(mediaFile);
};

const assignNewMedia = async (req, res) => {
  const { userId } = req.body;
  const user = await User.findById(userId);
  const mediaType = mediaTypes[Math.floor(Math.random() * mediaTypes.length)];
  const media = await Media.findOne({ mediaType, isAssigned: false });
  user.assignedMedia = media;
  media.isAssigned = true;
  await media.save();
  await user.save();
  res.status(200).send(user);
};

const markTouched = async (req, res) => {
  const { mediaId, userId } = req.body;

  console.log(mediaId, userId);

  const media = await Media.findById(mediaId);
  if (!media) return res.status(404).json({ error: "Media not found" });

  media.isTouched = true;
  await media.save();

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const mediaType = mediaTypes[Math.floor(Math.random() * mediaTypes.length)];
  const newMedia = await Media.findOne({ mediaType, isAssigned: false });

  if (newMedia) {
    user.assignedMedia = newMedia;
    newMedia.isAssigned = true;
    await newMedia.save();
  }

  console.log(user.assignedMedia);

  await user.save();
  res
    .status(200)
    .json({ message: "Media updated", assignedMedia: user.assignedMedia });
};

const markVerified = async (req, res) => {
  const { mediaId } = req.body;

  const media = await Media.findById(mediaId);
  if (!media) return res.status(404).json({ error: "Media not found" });

  media.isVerified = true;
  await media.save();

  res.status(200).json({ message: "Media updated", media });
};

const isVerified = async (req, res) => {
  const { mediaId } = req.body;

  const media = await Media.findById(mediaId);
  if (!media) return res.status(404).json({ error: "Media not found" });

  media.isVerified = true;
  await media.save();

  res.status(200).send(media);
};

const updateMedia = async (req, res) => {
  const { mediaId, formData } = req.body;
  if (!mediaId || !formData) {
    return res.status(400).json({ error: "mediaId and formData are required" });
  }

  const updatedMedia = await Media.findByIdAndUpdate(mediaId, formData, {
    new: true,
  });
  console.log("updateMedia", updatedMedia);
  if (!updatedMedia) return res.status(404).json({ error: "Media not found" });
  res.status(200).json({ message: "Media updated successfully", updatedMedia });
};

module.exports = {
  findMediaById,
  assignNewMedia,
  markTouched,
  isVerified,
  updateMedia,
  markVerified,
};
