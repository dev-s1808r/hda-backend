const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["sevarthi", "moderator", "admin"],
    default: "sevarthi",
  },
  assignedMedia: {
    type: Object,
  },
});

const mediaSchema = new mongoose.Schema({
  mediaType: {
    type: String,
    enum: ["audios", "videos", "photos"],
    required: true,
  },
  mediaPath: {
    type: String,
    required: true,
  },
  pseudoName: {
    type: String,
    required: true,
    unique: true,
  },
  title: String,
  description: String,
  eventLocation: String,
  eventName: String,
  isTouched: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isAssigned: {
    type: Boolean,
    default: false,
  },
  timeStamp: [
    {
      startTime: { type: Number },
      endTime: { type: Number },
      content: String,
    },
  ],
});

const dbMetaSchema = new mongoose.Schema({
  totalMedia: Number,
  totalPages: Number,
  videos: Number,
  videosPages: Number,
  audios: Number,
  audiosPages: Number,
  photos: Number,
  photosPages: Number,
});

const User = mongoose.model("User", userSchema);
const Media = mongoose.model("Media", mediaSchema);
const DbMeta = mongoose.model("DbMeta", dbMetaSchema);

module.exports = {
  User,
  Media,
  DbMeta,
};
