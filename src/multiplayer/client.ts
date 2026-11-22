import { io, type Socket } from "socket.io-client";
import type { JoinResponse, NetPose, Snapshot } from "./protocol";
import type { District } from "../world/atlas";
export class Session {
  socket: Socket | null = null;
  room = "";
  name = "";
  latest: Snapshot | null = null;
  messages: string[] = [];
  received = 0;
  onCorrect: ((p: NetPose) => void) | null = null;
  onLoss: (() => void) | null = null;
  onMessage: (() => void) | null = null;
  async join(mode: "public" | "private", code: string, pose: NetPose) {
    this.leave();
    const socket = io({
      autoConnect: false,
      reconnection: false,
      timeout: 6500,
    });
    this.socket = socket;
    const joined = await new Promise<JoinResponse>((ok, fail) => {
      const timer = setTimeout(
        () => fail(Error("Room server did not respond")),
        9000,
      );
      socket.once("connect_error", () => {
        clearTimeout(timer);
        fail(Error("Room server is unavailable. You can still play solo."));
      });
      socket.once("connect", () => {
        socket.emit("join", { mode, code, pose }, (r: JoinResponse) => {
          clearTimeout(timer);
          r.ok ? ok(r) : fail(Error(r.error || "Could not join room"));
        });
      });
      socket.connect();
    }).catch((e) => {
      this.leave();
      throw e;
    });
    this.room = joined.room!;
    this.name = joined.name!;
    socket.on("snapshot", (s: Snapshot) => {
      this.latest = s;
      this.received = performance.now();
    });
    socket.on("correct", (p) => this.onCorrect?.(p));
    socket.on("message", (s: string) => {
      this.messages.push(s);
      if (this.messages.length > 40) this.messages.shift();
      this.onMessage?.();
    });
    socket.on("disconnect", () => {
      this.room = "";
      this.latest = null;
      this.onLoss?.();
    });
  }
  leave() {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.latest = null;
    this.room = "";
    this.messages = [];
  }
  send(p: NetPose) {
    this.socket?.volatile.emit("pose", p);
  }
  travel(id: District) {
    this.socket?.emit("travel", id);
  }
  chat(s: string) {
    this.socket?.emit("chat", s);
  }
}
