import { Server } from "socket.io";

import { randomBytes } from "node:crypto";
import {
  isNetPose,
  type Peer,
  type JoinResponse,
  type Snapshot,
} from "../src/multiplayer/protocol";
import { districts } from "../src/world/atlas";
interface Room {
  code: string;
  isPublic: boolean;
  peers: Map<string, Peer>;
  start: number;
  serial: number;
}
export function attachNetwork(http: Server["httpServer"]) {
  const io = new Server(http, {
    maxHttpBufferSize: 4096,
    serveClient: false,
    destroyUpgrade: false,
    allowRequest(req, cb) {
      try {
        const origin = req.headers.origin;
        const host = req.headers["x-forwarded-host"] || req.headers.host;
        cb(
          null,
          !origin ||
            new URL(origin).host === host ||
            new URL(origin).host === req.headers.host,
        );
      } catch {
        cb(null, false);
      }
    },
  });
  const rooms = new Map<string, Room>();
  function make(pub: boolean) {
    let code = "";
    do {
      code = randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
    } while (rooms.has(code));
    const r = {
      code,
      isPublic: pub,
      peers: new Map<string, Peer>(),
      start: Date.now(),
      serial: 0,
    };
    rooms.set(code, r);
    return r;
  }
  io.on("connection", (socket) => {
    let room: Room | undefined,
      peer: Peer | undefined,
      lastMove = 0,
      lastChat = 0,
      lastTravel = 0;
    const joinTimer = setTimeout(() => {
      if (!room) socket.disconnect(true);
    }, 12000);
    socket.on("join", (req: unknown, ack: (v: JoinResponse) => void) => {
      if (typeof ack !== "function") return;
      if (room || !req || typeof req !== "object") {
        ack({ ok: false, error: "Invalid room request" });
        return;
      }
      const { mode, code, pose } = req as Record<string, unknown>;
      if (!["public", "private"].includes(String(mode)) || !isNetPose(pose)) {
        ack({ ok: false, error: "Invalid arrival point" });
        return;
      }
      if (rooms.size >= 128) {
        ack({ ok: false, error: "All districts are busy" });
        return;
      }
      if (mode === "public")
        room =
          [...rooms.values()].find((r) => r.isPublic && r.peers.size < 8) ??
          make(true);
      else if (code) {
        room =
          typeof code === "string" && /^[A-F0-9]{6}$/.test(code)
            ? rooms.get(code)
            : undefined;
        if (!room || room.isPublic || room.peers.size >= 8) {
          room = undefined;
          ack({ ok: false, error: "Private room not found or full" });
          return;
        }
      } else room = make(false);
      clearTimeout(joinTimer);
      peer = {
        x: pose.x,
        y: pose.y,
        z: pose.z,
        yaw: pose.yaw,
        car: pose.car,
        moving: false,
        gesture: false,
        id: socket.id,
        name: `Driver ${String(++room.serial).padStart(2, "0")}`,
      };
      room.peers.set(socket.id, peer);
      socket.join(room.code);
      lastMove = Date.now();
      ack({ ok: true, room: room.code, name: peer.name });
    });
    socket.on("pose", (p) => {
      if (!peer || !isNetPose(p)) return;
      const now = Date.now(),
        dt = (now - lastMove) / 1000;
      if (dt < 0.04) return;
      const maxDist = 2 + Math.min(2, dt) * (p.car ? 48 : 20);
      if (Math.hypot(p.x - peer.x, p.z - peer.z) > maxDist) {
        socket.emit("correct", {
          x: peer.x,
          y: peer.y,
          z: peer.z,
          yaw: peer.yaw,
        });
        return;
      }
      lastMove = now;
      Object.assign(peer, {
        x: p.x,
        y: p.y,
        z: p.z,
        yaw: p.yaw,
        car: p.car,
        gesture: p.gesture,
        moving: p.moving,
      });
    });
    socket.on("travel", (id) => {
      if (!peer || Date.now() - lastTravel < 600) return;
      const d = districts.find((x) => x.id === id);
      if (d) {
        lastTravel = Date.now();
        Object.assign(peer, { x: d.x, y: 1, z: d.z, car: "", moving: false });
      }
    });
    socket.on("chat", (text) => {
      if (
        !peer ||
        !room ||
        typeof text !== "string" ||
        Date.now() - lastChat < 700
      )
        return;
      const msg = text.trim().slice(0, 160);
      if (msg) {
        lastChat = Date.now();
        io.to(room.code).emit("message", `${peer.name}: ${msg}`);
      }
    });
    socket.on("disconnect", () => {
      clearTimeout(joinTimer);
      if (!room) return;
      room.peers.delete(socket.id);
      if (!room.peers.size) rooms.delete(room.code);
    });
  });
  const timer = setInterval(() => {
    const now = Date.now();
    for (const r of rooms.values()) {
      const age = (now - r.start) / 1000;
      const snapshot: Snapshot = {
        peers: [...r.peers.values()],
        minutes: (1122 + age * 0.32) % 1440,
        weather: (["Clear", "Haze", "Rain"] as const)[
          Math.floor(age / 420) % 3
        ],
        time: now,
      };
      io.to(r.code).volatile.emit("snapshot", snapshot);
    }
  }, 80);
  timer.unref();
  http.once("close", () => {
    clearInterval(timer);
    io.close();
  });
  return io;
}
