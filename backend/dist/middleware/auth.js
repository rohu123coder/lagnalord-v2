import jwt from "jsonwebtoken";
const secret = process.env.JWT_SECRET;
export function authMiddleware(req, res, next) {
    if (!secret) {
        console.error("JWT_SECRET is not set");
        res.status(500).json({ success: false, error: "Server misconfiguration" });
        return;
    }
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
    }
    const token = header.slice("Bearer ".length).trim();
    if (!token) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
    }
    try {
        const decoded = jwt.verify(token, secret);
        if (!decoded?.userId) {
            res.status(401).json({ success: false, error: "Unauthorized" });
            return;
        }
        req.user = {
            userId: decoded.userId,
            phone: decoded.phone,
            role: decoded.role,
            iat: decoded.iat,
            exp: decoded.exp,
        };
        next();
    }
    catch {
        res.status(401).json({ success: false, error: "Unauthorized" });
    }
}
export function requireAstrologer(req, res, next) {
    if (req.user?.role !== "astrologer") {
        res.status(403).json({ success: false, error: "Astrologer access only" });
        return;
    }
    next();
}
export function requireAdmin(req, res, next) {
    const role = req.user?.role;
    if (role !== "admin" && role !== "superadmin") {
        res.status(403).json({ success: false, error: "Admin access only" });
        return;
    }
    next();
}
/** Attaches `req.user` when a valid Bearer token is present; no-op otherwise. */
export function optionalAuthMiddleware(req, res, next) {
    if (!secret) {
        next();
        return;
    }
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        next();
        return;
    }
    const token = header.slice("Bearer ".length).trim();
    if (!token) {
        next();
        return;
    }
    try {
        const decoded = jwt.verify(token, secret);
        if (decoded?.userId) {
            req.user = {
                userId: decoded.userId,
                phone: decoded.phone,
                role: decoded.role,
                iat: decoded.iat,
                exp: decoded.exp,
            };
        }
    }
    catch {
        // public response when token invalid
    }
    next();
}
