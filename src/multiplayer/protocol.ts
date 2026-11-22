export type NetPose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  moving: boolean;
  car: "" | "veloce" | "courier";
  gesture: boolean;
};
export type Peer = NetPose & { id: string; name: string };
export type Snapshot = {
  peers: Peer[];
  minutes: number;
  weather: "Clear" | "Haze" | "Rain";
  time: number;
};
export type JoinResponse = {
  ok: boolean;
  room?: string;
  name?: string;
  error?: string;
};
export const isNetPose = (p: unknown): p is NetPose => {
  if (!p || typeof p !== "object") return false;
  const q = p as NetPose;
  return (
    Number.isFinite(q.x) &&
    Number.isFinite(q.y) &&
    Number.isFinite(q.z) &&
    Number.isFinite(q.yaw) &&
    q.x >= -147 &&
    q.x <= 126 &&
    q.z >= -157 &&
    q.z <= 157 &&
    q.y >= -2 &&
    q.y <= 60 &&
    Math.abs(q.yaw) < 1e8 &&
    typeof q.moving === "boolean" &&
    typeof q.gesture === "boolean" &&
    ["", "veloce", "courier"].includes(q.car)
  );
};
