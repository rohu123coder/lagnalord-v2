"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNonEmptyString = isNonEmptyString;
function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}
