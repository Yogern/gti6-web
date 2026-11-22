export const districts = [
  {
    id: "beach",
    name: "Vice Beach",
    tag: "Coastal district",
    area: "Ocean Drive",
    image: "vice-beach",
    icon: "tree-palm",
    x: 84,
    z: 50,
    description:
      "Cruise the palm-lined beachfront, pastel hotels and the Ocean Drive promenade.",
  },
  {
    id: "neon",
    name: "Neon Strip",
    tag: "Nightlife district",
    area: "Mirage Boulevard",
    image: "neon-strip",
    icon: "building-2",
    x: -44,
    z: 87,
    description:
      "Explore neon-fronted hotels and late-night cafés beneath the downtown towers.",
  },
  {
    id: "campus",
    name: "Sharaga College",
    tag: "University campus",
    area: "Шарага Courtyard",
    image: "sharaga",
    icon: "landmark",
    x: -12,
    z: -3,
    description:
      "Visit the open courtyard, lounge and lecture rooms of the fictional Шарага campus.",
  },
  {
    id: "port",
    name: "Port Leonida",
    tag: "Industrial docks",
    area: "East Pier",
    image: "port",
    icon: "container",
    x: 84,
    z: -94,
    description:
      "Follow the waterfront past container stacks, cargo cranes and the dispatch yard.",
  },
] as const;
export type District = (typeof districts)[number]["id"];
export type Location = (typeof districts)[number];
export function place(id: District) {
  return districts.find((d) => d.id === id)!;
}
export function districtAt(x: number, z: number): District {
  return z < -2 ? (x > 30 ? "port" : "campus") : x > 51 ? "beach" : "neon";
}
export const roadsX = [-108, -44, 20, 84],
  roadsZ = [-128, -64, 0, 64, 128];
export const bounds = { left: -145, right: 124, top: -155, bottom: 155 };
export const art = (id: string) => `/assets/art/${id}.webp`;
export const cars = {
  veloce: {
    name: "Veloce GT",
    tag: "Sport coupe",
    top: 42,
    accel: 13,
    length: 4.65,
  },
  courier: {
    name: "Coastline Courier",
    tag: "Delivery truck",
    top: 27,
    accel: 8,
    length: 5.2,
  },
} as const;
export type CarId = keyof typeof cars;
