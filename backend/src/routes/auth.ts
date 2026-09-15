import { Router } from "express";

import { authAstrologerRouter } from "./authAstrologerRoutes.js";
import { authUserRouter } from "./authUserRoutes.js";

const router = Router();

router.use(authUserRouter);
router.use(authAstrologerRouter);

export { router as authRouter };
