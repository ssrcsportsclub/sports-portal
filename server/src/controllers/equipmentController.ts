import { Request, Response } from "express";
import Equipment, { IEquipment } from "../models/Equipment.js";
import Responsibility, { RequestStatus } from "../models/Responsibility.js";
import { UserRole } from "../models/User.js";
import { closedReason, getEquipmentWindow } from "./requestWindowController.js";

// --- Equipment Inventory ---

// @desc    Get all equipment
// @route   GET /api/equipment
// @access  Private
export const getEquipment = async (req: Request, res: Response) => {
  try {
    const equipment = await Equipment.find({});
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Add new equipment
// @route   POST /api/equipment
// @access  Admin, Superuser
export const addEquipment = async (req: Request, res: Response) => {
  try {
    const { name, category, quantity, condition, description } = req.body;
    const equipment = await Equipment.create({
      name,
      category,
      quantity,
      condition,
      description,
    });
    res.status(201).json(equipment);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Update equipment
// @route   PUT /api/equipment/:id
// @access  Admin, Superuser
export const updateEquipment = async (req: Request, res: Response) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment)
      return res.status(404).json({ message: "Equipment not found" });

    Object.assign(equipment, req.body);
    const updated = await equipment.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Delete equipment
// @route   DELETE /api/equipment/:id
// @access  Admin
export const deleteEquipment = async (req: Request, res: Response) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment)
      return res.status(404).json({ message: "Equipment not found" });

    await equipment.deleteOne();
    res.json({ message: "Equipment removed" });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// --- Responsibilities / Requests ---

// @desc    Request equipment
// @route   POST /api/equipment/request
// @access  All Users
export const requestEquipment = async (req: Request, res: Response) => {
  try {
    const { equipmentId, quantity, notes } = req.body;
    const userId = req.user?._id;

    // Request window (scheduled hours / always open / closed), managed by staff.
    const closed = closedReason(await getEquipmentWindow());
    if (closed) {
      return res.status(403).json({ message: closed });
    }

    if (req.user?.role === UserRole.SUPERUSER) {
      return res
        .status(403)
        .json({ message: "Superusers cannot request equipment." });
    }

    const equip = await Equipment.findById(equipmentId);
    if (!equip) return res.status(404).json({ message: "Equipment not found" });

    // 1. Anti-hoarding: Check if user already holds this specific equipment (Pending or Approved)
    const existingRequest = await Responsibility.findOne({
      user: userId,
      equipment: equipmentId,
      status: { $in: [RequestStatus.PENDING, RequestStatus.APPROVED] },
    });

    if (existingRequest) {
      return res.status(400).json({
        message: "You already have an active request for this item.",
      });
    }

    let status = RequestStatus.PENDING;
    let autoApproved = false;

    // 2. Secondary Item Logic (Auto-Approval)
    // If it's Secondary, check if user holds the Linked Primary Equipment
    if (equip.type === "Secondary" && equip.linkedEquipment) {
      const primaryHeld = await Responsibility.findOne({
        user: userId,
        equipment: equip.linkedEquipment,
        status: RequestStatus.APPROVED,
      });

      if (primaryHeld) {
        // User holds the primary, so they get auto-approved for secondary if stock exists
        if (equip.quantity >= quantity) {
          status = RequestStatus.APPROVED;
          autoApproved = true;
          // Decrement stock immediately for auto-approved
          equip.quantity -= quantity;
          await equip.save();
        } else {
          // No stock for secondary? technically waitlist or reject.
          // Let's Put them in waitlist logic below if we didn't auto-approve
          status = RequestStatus.WAITING; // Correct flow? Or should we just fail?
          // Prompt says "Auto-Approved". If no stock, cannot auto-approve.
        }
      }
    }

    // 3. Primary Item / General Logic (If not already handled)
    if (!autoApproved) {
      if (equip.quantity < quantity) {
        // Waitlist Logic
        status = RequestStatus.WAITING;
      }
      // If stock exists, it remains PENDING for Staff Approval (unless it was Secondary and we failed check?)
      // If Secondary and NOT primaryHeld, it goes to PENDING (Staff can manually approve exception?)
    }

    // Safety check for negative stock if race condition, though single threaded nodejs mostly fine here.
    if (autoApproved && equip.quantity < 0) {
      return res
        .status(400)
        .json({ message: "Stock ran out during processing" });
    }

    const responsibility = await Responsibility.create({
      user: userId,
      equipment: equipmentId,
      quantity,
      notes,
      status,
      issueDate: status === RequestStatus.APPROVED ? new Date() : undefined,
    });

    res.status(201).json(responsibility);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get Responsibilities (My requests or All for mods/admins)
// @route   GET /api/equipment/responsibilities
// @access  Private
export const getResponsibilities = async (req: Request, res: Response) => {
  try {
    let query = {};
    // If regular user, only see own.
    // If Mod/Super/Admin, can see all?
    // Mod: "View responsibilities"
    // Superuser: "View responsibilities"
    // Admin: "View responsibilities"
    // User: "My team" (doesn't explicitly say view responsibilities in dashboard sidebar, but features say "Responsibilities transfer")

    if (req.user?.role === UserRole.USER) {
      query = { user: req.user._id };
    }
    // Else assume they can see all (maybe filter by status?)

    const responsibilities = await Responsibility.find(query)
      .populate("user", "name email role")
      .populate("equipment", "name category type")
      .populate("approvedBy", "name")
      .sort({ requestDate: -1 })
      .lean();

    res.json(responsibilities);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Update Responsibility Status (Approve/Reject/Return)
// @route   PUT /api/equipment/responsibilities/:id
// @access  Admin, Superuser, Moderator
export const updateResponsibilityStatus = async (
  req: Request,
  res: Response,
) => {
  try {
    const { status } = req.body; // approved, returned, etc.
    const resp = await Responsibility.findById(req.params.id);

    if (!resp) return res.status(404).json({ message: "Request not found" });

    // Logic for inventory adjustment
    const equip = await Equipment.findById(resp.equipment);

    if (
      status === RequestStatus.APPROVED &&
      resp.status === RequestStatus.PENDING
    ) {
      if (equip && equip.quantity >= resp.quantity) {
        equip.quantity -= resp.quantity;
        resp.issueDate = new Date();
        // Record who approved the request
        if (req.user) {
          resp.approvedBy = req.user._id as any;
        }
        await equip.save();
      } else {
        return res
          .status(400)
          .json({ message: "Not enough inventory to approve" });
      }
    } else if (
      status === RequestStatus.RETURNED &&
      (resp.status === RequestStatus.APPROVED ||
        resp.status === RequestStatus.OVERDUE)
    ) {
      if (equip) {
        equip.quantity += resp.quantity;
        resp.returnDate = new Date();
        await equip.save();
      }
    }

    resp.status = status;
    await resp.save();
    res.json(resp);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Transfer Responsibility (Student to Student)
// @route   POST /api/equipment/transfer/:id
// @access  Private (The user holding the item)
export const transferEquipment = async (req: Request, res: Response) => {
  try {
    const { targetUserId } = req.body; // Student B
    const currentRespId = req.params.id; // Student A's responsibility ID
    const senderId = req.user?._id;

    const currentResp = await Responsibility.findOne({
      _id: currentRespId,
      user: senderId,
      status: RequestStatus.APPROVED,
    });

    if (!currentResp) {
      return res
        .status(404)
        .json({ message: "Active responsibility not found for transfer" });
    }

    // 1. Validate Target User (Must be in WAITLIST)
    // "If Student B is next" - User might pick from dropdown or system auto-picks.
    // Prompt: "Student A initiates Responsibility Transfer... check Waitlist Queue."
    // Prompt also says: "Next in Waitlist: [Student Name] | [Transfer Button]"
    // This implies A sees B. So B must be waiting.

    const targetResp = await Responsibility.findOne({
      user: targetUserId,
      equipment: currentResp.equipment,
      status: RequestStatus.WAITING,
    });

    if (!targetResp) {
      return res
        .status(400)
        .json({ message: "Target user is not in the waitlist for this item." });
    }

    // 2. Atomic Transfer
    // A -> Returned/Transferred
    // B -> Approved

    // Update A's record
    currentResp.status = RequestStatus.TRANSFERRED;
    currentResp.returnDate = new Date();
    await currentResp.save();

    // Update B's record
    targetResp.status = RequestStatus.APPROVED;
    targetResp.issueDate = new Date();

    // Chain of Custody
    // We can link B's record to A's record if we added `previousResponsibility`
    // Or update `transferChain` if we are passing the SAME asset object (Physical Asset ID).
    // Start tracking chain on B?

    // If A had a chain, pass it to B?
    const existingChain = currentResp.transferChain || [];
    const newChainEntry = {
      fromUser: senderId as any,
      toUser: targetUserId as any,
      date: new Date(),
    };

    targetResp.transferChain = [...existingChain, newChainEntry];

    await targetResp.save();

    res.json({ message: "Transfer successful", targetResp });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Force Return (Admin Override)
// @route   POST /api/equipment/responsibilities/:id/force-return
// @access  Admin, Superuser
export const forceReturn = async (req: Request, res: Response) => {
  try {
    const resp = await Responsibility.findById(req.params.id);
    if (!resp)
      return res.status(404).json({ message: "Responsibility not found" });

    if (resp.status === RequestStatus.RETURNED) {
      return res.status(400).json({ message: "Already returned" });
    }

    const equip = await Equipment.findById(resp.equipment);
    if (equip) {
      equip.quantity += resp.quantity; // Add back to stock
      await equip.save();
    }

    resp.status = RequestStatus.RETURNED;
    resp.returnDate = new Date();
    resp.notes = (resp.notes || "") + " [FORCE RETURNED BY ADMIN]";
    await resp.save();

    res.json({ message: "Force return successful", resp });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get Chain of Custody Report Data
// @route   GET /api/equipment/report/chain-of-custody
// @access  Admin, Superuser
export const getChainOfCustodyReport = async (req: Request, res: Response) => {
  try {
    const data = await Responsibility.find({})
      .populate("user", "name email studentId phone")
      .populate("equipment", "name category type")
      .populate("approvedBy", "name")
      .populate({
        path: "transferChain.fromUser",
        select: "name email",
      })
      .populate({
        path: "transferChain.toUser",
        select: "name email",
      })
      .sort({ requestDate: -1 });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get Waitlist for an Item
// @route   GET /api/equipment/waitlist/:id
// @access  Private
export const getWaitlist = async (req: Request, res: Response) => {
  try {
    const equipmentId = req.params.id;
    const waitlist = await Responsibility.find({
      equipment: equipmentId,
      status: RequestStatus.WAITING,
    })
      .populate("user", "name email studentId")
      .sort({ requestDate: 1 }) // FIFO
      .lean();

    res.json(waitlist);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Waitlists for several items in one query
// @route   GET /api/equipment/waitlists?ids=a,b,c
// @access  Private
export const getWaitlists = async (req: Request, res: Response) => {
  try {
    const ids = String(req.query.ids || "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => /^[a-f\d]{24}$/i.test(id))
      .slice(0, 100);
    if (!ids.length) return res.json({});

    const waiting = await Responsibility.find({
      equipment: { $in: ids },
      status: RequestStatus.WAITING,
    })
      .populate("user", "name email studentId")
      .sort({ requestDate: 1 }) // FIFO
      .lean();

    // { [equipmentId]: Responsibility[] }, every requested id present.
    const byEquipment: Record<string, unknown[]> = Object.fromEntries(
      ids.map((id) => [id, []]),
    );
    waiting.forEach((r) => byEquipment[String(r.equipment)]?.push(r));
    res.json(byEquipment);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
