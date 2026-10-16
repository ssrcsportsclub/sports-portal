import express from "express";
import {
  getEquipment,
  addEquipment,
  updateEquipment,
  deleteEquipment,
  requestEquipment,
  getResponsibilities,
  updateResponsibilityStatus,
  transferEquipment,
  forceReturn,
  getChainOfCustodyReport,
  getWaitlist,
  getWaitlists,
} from "../controllers/equipmentController.js";
import {
  getRequestWindow,
  updateRequestWindow,
} from "../controllers/requestWindowController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";
import { validateBody } from "../middlewares/validateRequest.js";
import { requestWindowSchema } from "../schemas/index.js";
import { UserRole } from "../models/User.js";

const router = express.Router();

router.use(protect);

// Request window: everyone can read it; staff who manage requests can change it.
// Registered before the "/:id" routes so "request-window" is not taken as an id.
router.get("/request-window", getRequestWindow);
router.put(
  "/request-window",
  authorize(UserRole.ADMIN, UserRole.SUPERUSER, UserRole.MODERATOR),
  validateBody(requestWindowSchema),
  updateRequestWindow,
);

// Inventory
router.get("/", getEquipment); // Viewable by all logged in? Dashboards say "View equipments" for Super/Admin. Mod doesn't say.
// Let's assume View only for all, but maybe restrict if needed.

router.post("/", authorize(UserRole.ADMIN, UserRole.SUPERUSER), addEquipment);
router.put(
  "/:id",
  authorize(UserRole.ADMIN, UserRole.SUPERUSER),
  updateEquipment,
);
router.delete("/:id", authorize(UserRole.ADMIN), deleteEquipment);

// Reports
router.get(
  "/report/chain-of-custody",
  authorize(UserRole.ADMIN, UserRole.SUPERUSER),
  getChainOfCustodyReport,
);

// Responsibilities / Requests
router.post("/request", requestEquipment); // All users
router.get("/responsibilities", getResponsibilities); // Filtered inside controller
router.put(
  "/responsibilities/:id",
  authorize(UserRole.ADMIN, UserRole.SUPERUSER, UserRole.MODERATOR),
  updateResponsibilityStatus,
);

// Actions
router.get("/waitlists", getWaitlists); // batched: ?ids=a,b,c
router.get("/waitlist/:id", getWaitlist); // View waitlist for an item (Any user can see who is waiting?)
router.post("/transfer/:id", transferEquipment); // Student transferring their responsibility
router.post(
  "/responsibilities/:id/force-return",
  authorize(UserRole.ADMIN, UserRole.SUPERUSER),
  forceReturn,
);

export default router;
