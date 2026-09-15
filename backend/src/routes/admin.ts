import { Router } from "express";

import { authMiddleware, requireAdmin } from "../middleware/auth.js";
import { adminAiAstrologersRouter } from "./adminAiAstrologers.js";
import { adminAstrologersRouter } from "./adminAstrologers.js";
import { adminAuthRouter } from "./adminAuth.js";
import { adminKnowledgeRouter } from "./adminKnowledge.js";
import { adminOffersRouter } from "./adminOffers.js";
import { adminSettingsRouter } from "./adminSettings.js";
import { adminStatsRouter } from "./adminStats.js";
import { adminTransactionsRouter } from "./adminTransactions.js";
import { adminUsersRouter } from "./adminUsers.js";

const router = Router();

router.use(adminAuthRouter);

router.use(authMiddleware);
router.use(requireAdmin);

router.use(adminStatsRouter);
router.use(adminTransactionsRouter);
router.use(adminAstrologersRouter);
router.use(adminAiAstrologersRouter);
router.use(adminUsersRouter);
router.use(adminSettingsRouter);
router.use(adminKnowledgeRouter);
router.use(adminOffersRouter);

export { router as adminRouter };
