let io = null;
export function setSocketServer(server) {
    io = server;
}
export function getSocketServer() {
    if (!io) {
        throw new Error("Socket server not initialized");
    }
    return io;
}
