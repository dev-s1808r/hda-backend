const { User } = require("../models/models");

const listUsers = async (req, res) => {
  const users = await User.find().select("-password");
  res.status(200).json({ users });
};

const getUserById = async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId).select("-password");
  if (!user) {
    return res.status(404).send("User not found");
  }
  res.status(200).json(user);
};

module.exports = { listUsers, getUserById };

// const assignFoldersToUser = async (req, res) => {
//   const { userId, folderIds } = req.body; // Extract userId and folderIds from the request body

//   if (!userId || !folderIds) {
//     return res
//       .status(400)
//       .json({ message: "User ID and folder IDs are required." });
//   }

//   try {
//     // Find the user
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found." });
//     }

//     // Validate folders
//     const validFolders = await Folder.find({ _id: { $in: folderIds } });
//     if (validFolders.length !== folderIds.length) {
//       return res
//         .status(400)
//         .json({ message: "Some folder IDs are invalid or do not exist." });
//     }

//     // Assign folders to the user
//     user.allowedFolders = [...new Set([...user.allowedFolders, ...folderIds])];
//     await user.save();

//     res.status(200).json({
//       message: "Folders assigned successfully.",
//       user: {
//         id: user._id,
//         userName: user.userName,
//         allowedFolders: user.allowedFolders,
//       },
//     });
//   } catch (error) {
//     console.error("Error assigning folders:", error);
//     res
//       .status(500)
//       .json({ message: "Error assigning folders", error: error.message });
//   }
// };
