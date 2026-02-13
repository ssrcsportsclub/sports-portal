import { Request, Response } from "express";
import Announcement from "../models/Announcement.js";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

const transformAnnouncement = (ann: any, userId: any) => {
  const obj = ann.toObject ? ann.toObject() : ann;

  const reactionsSummary = ann.reactions
    ? ann.reactions.map((r: any) => ({
        emoji: r.emoji,
        count: r.users.length,
        isReacted: r.users.some(
          (id: any) => id.toString() === userId?.toString(),
        ),
      }))
    : [];

  return {
    ...obj,
    likes: undefined, // Clear raw likes
    reactions: undefined, // Clear raw reactions
    reactionsSummary,
    comments: obj.comments.map((c: any) => ({
      response: c.response,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      authorName: c.userId?.name || "Unknown",
      isMe:
        c.userId?._id?.toString() === userId?.toString() ||
        c.userId?.toString() === userId?.toString(),
      isEdited:
        c.updatedAt &&
        new Date(c.updatedAt).getTime() > new Date(c.createdAt).getTime(),
    })),
  };
};

// @desc    Update a comment on an announcement
// @route   PUT /api/announcements/:id/comments/:index
// @access  Private
export const updateComment = async (req: Request, res: Response) => {
  try {
    const { id, index } = req.params;
    const { response } = req.body;
    const userId = req.user?._id;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const commentIndex = parseInt(index);
    if (
      isNaN(commentIndex) ||
      commentIndex < 0 ||
      commentIndex >= announcement.comments.length
    ) {
      return res.status(400).json({ message: "Invalid comment index" });
    }

    const comment = announcement.comments[commentIndex];

    // Check ownership
    if (comment.userId.toString() !== userId?.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this comment" });
    }

    // Update comment
    announcement.comments[commentIndex].response = response;
    announcement.comments[commentIndex].updatedAt = new Date();
    await announcement.save();

    const updatedAnnouncement = await Announcement.findById(id)
      .populate("author", "name role")
      .populate("comments.userId", "name role");

    res.json(transformAnnouncement(updatedAnnouncement, userId));
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Private
export const getAnnouncements = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const announcements = await Announcement.find({})
      .sort({ createdAt: -1 })
      .populate("author", "name role")
      .populate("comments.userId", "name role");

    const transformed = announcements.map((ann) =>
      transformAnnouncement(ann, userId),
    );
    res.json(transformed);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Create announcement
// @route   POST /api/announcements
// @access  Admin, Superuser, Moderator
export const createAnnouncement = async (req: Request, res: Response) => {
  try {
    const { title, content, targetRole } = req.body;
    const announcement = await Announcement.create({
      title,
      content,
      author: req.user?._id,
      targetRole,
    });

    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate("author", "name role")
      .populate("comments.userId", "name role");

    res
      .status(201)
      .json(transformAnnouncement(populatedAnnouncement, req.user?._id));
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Add comment to announcement
// @route   POST /api/announcements/:id/comments
// @access  Private
export const addComment = async (req: Request, res: Response) => {
  try {
    const { response } = req.body;
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const newComment = {
      userId: req.user?._id,
      response,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    announcement.comments.push(newComment as any);
    await announcement.save();

    // Populate the newly added comment's user info
    const updatedAnnouncement = await Announcement.findById(req.params.id)
      .populate("author", "name role")
      .populate("comments.userId", "name role");

    res
      .status(201)
      .json(transformAnnouncement(updatedAnnouncement, req.user?._id));
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Update announcement
// @route   PUT /api/announcements/:id
// @access  Admin, Superuser
export const updateAnnouncement = async (req: Request, res: Response) => {
  try {
    const { title, content, targetRole } = req.body;
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    announcement.title = title || announcement.title;
    announcement.content = content || announcement.content;
    announcement.targetRole = targetRole || announcement.targetRole;

    await announcement.save();

    const updatedAnnouncement = await Announcement.findById(req.params.id)
      .populate("author", "name role")
      .populate("comments.userId", "name role");

    res.json(transformAnnouncement(updatedAnnouncement, req.user?._id));
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Admin
export const deleteAnnouncement = async (req: Request, res: Response) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement)
      return res.status(404).json({ message: "Announcement not found" });

    await announcement.deleteOne();
    res.json({ message: "Announcement removed" });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Toggle reaction on announcement
// @route   POST /api/announcements/:id/react
// @access  Private
export const toggleReaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const userId = req.user?._id;

    if (!REACTION_EMOJIS.includes(emoji)) {
      return res.status(400).json({ message: "Invalid emoji" });
    }

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    if (!announcement.reactions) announcement.reactions = [];

    // Check if user already has a reaction (any emoji)
    let existingEmojiIndex = -1;
    let existingUserIndexInEmoji = -1;

    announcement.reactions.forEach((r, idx) => {
      const uIdx = r.users.findIndex(
        (uid) => uid.toString() === userId?.toString(),
      );
      if (uIdx > -1) {
        existingEmojiIndex = idx;
        existingUserIndexInEmoji = uIdx;
      }
    });

    if (existingEmojiIndex > -1) {
      const prevEmoji = announcement.reactions[existingEmojiIndex].emoji;

      // Remove the existing reaction
      announcement.reactions[existingEmojiIndex].users.splice(
        existingUserIndexInEmoji,
        1,
      );
      if (announcement.reactions[existingEmojiIndex].users.length === 0) {
        announcement.reactions.splice(existingEmojiIndex, 1);
      }

      // If they clicked the same emoji, it's just a toggle off
      if (prevEmoji === emoji) {
        await announcement.save();
        const updatedAnnouncement = await Announcement.findById(id)
          .populate("author", "name role")
          .populate("comments.userId", "name role");
        return res.json(transformAnnouncement(updatedAnnouncement, userId));
      }
    }

    // Add the new reaction
    const targetReactionIndex = announcement.reactions.findIndex(
      (r) => r.emoji === emoji,
    );
    if (targetReactionIndex > -1) {
      announcement.reactions[targetReactionIndex].users.push(userId as any);
    } else {
      announcement.reactions.push({
        emoji,
        users: [userId as any],
      });
    }

    await announcement.save();

    const updatedAnnouncement = await Announcement.findById(id)
      .populate("author", "name role")
      .populate("comments.userId", "name role");

    res.json(transformAnnouncement(updatedAnnouncement, userId));
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
