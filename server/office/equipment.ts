export interface EquipmentTier {
  level: number;
  name: string;
  price: number;
  bonus: number; // multiplier added to work efficiency (e.g. 0.1 = +10%)
}

export interface EquipmentType {
  id: string;
  label: string;
  icon: string;
  tiers: EquipmentTier[];
}

export const EQUIPMENT_TYPES: EquipmentType[] = [
  {
    id: 'computer',
    label: '电脑',
    icon: '💻',
    tiers: [
      { level: 1, name: 'MacBook Air M1',      price: 100,  bonus: 0.1 },
      { level: 2, name: 'MacBook Pro M2',       price: 300,  bonus: 0.25 },
      { level: 3, name: 'MacBook Pro M3 Max',   price: 800,  bonus: 0.45 },
      { level: 4, name: 'MacBook Pro M4 Ultra',  price: 2000, bonus: 0.7 },
      { level: 5, name: 'Mac Studio M4 Ultra',   price: 5000, bonus: 1.0 },
    ],
  },
  {
    id: 'monitor',
    label: '显示器',
    icon: '🖥️',
    tiers: [
      { level: 1, name: 'Dell P2423',           price: 80,   bonus: 0.05 },
      { level: 2, name: 'Dell U2723QE 4K',      price: 250,  bonus: 0.15 },
      { level: 3, name: 'LG 27UK850 4K',        price: 600,  bonus: 0.3 },
      { level: 4, name: 'Apple Studio Display',  price: 1500, bonus: 0.5 },
      { level: 5, name: 'Apple Pro Display XDR', price: 4000, bonus: 0.75 },
    ],
  },
  {
    id: 'desk',
    label: '办公桌',
    icon: '🪑',
    tiers: [
      { level: 1, name: '普通工位桌',            price: 50,   bonus: 0.03 },
      { level: 2, name: '手动升降桌',            price: 150,  bonus: 0.08 },
      { level: 3, name: '乐歌电动升降桌',        price: 400,  bonus: 0.15 },
      { level: 4, name: 'Herman Miller 升降桌',  price: 1200, bonus: 0.25 },
      { level: 5, name: '定制实木行政桌',        price: 3000, bonus: 0.4 },
    ],
  },
  {
    id: 'keyboard',
    label: '键盘',
    icon: '⌨️',
    tiers: [
      { level: 1, name: '公司标配薄膜键盘',      price: 30,   bonus: 0.02 },
      { level: 2, name: 'Keychron K2',           price: 100,  bonus: 0.06 },
      { level: 3, name: 'HHKB Professional',     price: 300,  bonus: 0.12 },
      { level: 4, name: 'Realforce R3',          price: 800,  bonus: 0.2 },
      { level: 5, name: '定制 Ergodox',          price: 2000, bonus: 0.3 },
    ],
  },
  {
    id: 'chair',
    label: '椅子',
    icon: '💺',
    tiers: [
      { level: 1, name: '公司标配办公椅',        price: 40,   bonus: 0.02 },
      { level: 2, name: '西昊 M57',             price: 120,  bonus: 0.06 },
      { level: 3, name: '永艺 XY',              price: 350,  bonus: 0.12 },
      { level: 4, name: 'Herman Miller Aeron',  price: 1000, bonus: 0.2 },
      { level: 5, name: 'Herman Miller Embody', price: 2500, bonus: 0.3 },
    ],
  },
];

export type PlayerEquipment = Record<string, number>; // equipmentId → level (0 = not owned)

export function getDefaultEquipment(): PlayerEquipment {
  const eq: PlayerEquipment = {};
  for (const t of EQUIPMENT_TYPES) {
    eq[t.id] = 0;
  }
  return eq;
}

export function calcEquipmentBonus(equipment: PlayerEquipment): number {
  let bonus = 0;
  for (const t of EQUIPMENT_TYPES) {
    const level = equipment[t.id] ?? 0;
    if (level > 0) {
      bonus += t.tiers[level - 1].bonus;
    }
  }
  return bonus;
}

export function getNextTier(equipmentId: string, currentLevel: number): EquipmentTier | null {
  const type = EQUIPMENT_TYPES.find(t => t.id === equipmentId);
  if (!type) return null;
  const nextLevel = currentLevel + 1;
  return type.tiers[nextLevel - 1] ?? null;
}

export function getCurrentTier(equipmentId: string, level: number): EquipmentTier | null {
  const type = EQUIPMENT_TYPES.find(t => t.id === equipmentId);
  if (!type || level <= 0) return null;
  return type.tiers[level - 1] ?? null;
}
