export interface ZoneDef {
  id: string;
  name: string;
  color: string;
}

export const ZONES: Record<string, ZoneDef> = {
  APP:  { id: 'APP',  name: 'APP',              color: '#e74c3c' },
  GPT:  { id: 'GPT',  name: 'Growth Product',   color: '#8bc34a' },
  GRC:  { id: 'GRC',  name: 'GRC + AML',        color: '#00bcd4' },
  CH:   { id: 'CH',   name: 'Central Hub',       color: '#ffc107' },
  UQ:   { id: 'UQ',   name: 'Unified Quality',   color: '#ff9800' },
  BC:   { id: 'BC',   name: 'Blockchain',         color: '#9c27b0' },
  ITS:  { id: 'ITS',  name: 'IT + Security',      color: '#ff5722' },
  HR:   { id: 'HR',   name: 'HR',                 color: '#4caf50' },
  FM:   { id: 'FM',   name: 'Fin/Marketing',      color: '#2196f3' },
  INF:  { id: 'INF',  name: 'Infra',              color: '#ff9800' },
  B2B:  { id: 'B2B',  name: 'B2B',                color: '#e91e63' },
  DBU:  { id: 'DBU',  name: 'DBU',                color: '#03a9f4' },
  UF:   { id: 'UF',   name: 'Unified Frontend',   color: '#f44336' },
  FIN:  { id: 'FIN',  name: 'Finance',             color: '#673ab7' },
  OPEN: { id: 'OPEN', name: 'Open Area',           color: '#78909c' },
};

// Cell encoding: "ZONE.type" or special codes
// d = desk, m = meeting, c = corridor, p = plant, b = break, w = wall
// Example: "APP.d" = APP zone desk, "_.c" = corridor, "_.m" = meeting room
type CellCode = string;

// 16 columns x 10 rows
const PLAN: CellCode[][] = [
  // Row 0: top departments
  ['APP.d','APP.d','APP.d','GPT.d','GPT.d','GRC.d','GRC.d','GRC.d','_.w','CH.d','CH.d','_.w','_.m','UQ.d','UQ.d','UQ.d'],
  ['APP.d','APP.d','APP.d','GPT.d','GPT.d','GRC.d','GRC.d','GRC.d','_.w','CH.d','CH.d','_.w','_.m','UQ.d','UQ.d','UQ.d'],
  ['APP.d','APP.d','_.m','GPT.d','GPT.d','GRC.d','GRC.d','_.m','_.w','CH.d','CH.d','_.w','_.w','UQ.d','UQ.d','UQ.d'],
  // Row 3: corridor
  ['_.c','_.c','_.c','_.c','_.c','_.c','_.c','_.c','_.c','_.c','_.c','_.c','_.c','_.c','_.c','_.c'],
  // Row 4-5: middle section
  ['BC.d','BC.d','_.c','_.m','_.m','_.c','_.m','_.m','_.c','OPEN.d','OPEN.d','OPEN.d','OPEN.d','OPEN.d','OPEN.d','OPEN.d'],
  ['BC.d','BC.d','_.c','_.m','_.m','_.c','ITS.d','ITS.d','HR.d','HR.d','_.c','OPEN.d','OPEN.d','OPEN.d','OPEN.d','OPEN.d'],
  // Row 6: corridor
  ['_.c','_.c','_.c','_.c','_.c','_.c','_.c','_.c','_.c','_.c','_.c','_.c','_.c','_.c','_.c','_.c'],
  // Row 7-9: bottom departments
  ['FM.d','FM.d','FM.d','_.c','INF.d','INF.d','B2B.d','B2B.d','DBU.d','DBU.d','UF.d','UF.d','_.c','FIN.d','FIN.d','FIN.d'],
  ['FM.d','FM.d','FM.d','_.c','INF.d','INF.d','B2B.d','B2B.d','DBU.d','DBU.d','UF.d','UF.d','_.c','FIN.d','FIN.d','FIN.d'],
  ['_.p','FM.d','_.b','_.c','INF.d','_.p','_.c','_.c','_.c','_.c','_.p','UF.d','_.c','FIN.d','FIN.d','_.p'],
];

export interface FloorCell {
  type: 'desk' | 'meeting' | 'corridor' | 'plant' | 'break' | 'wall';
  zone: string;
  zoneColor: string;
  zoneName: string;
}

const TYPE_MAP: Record<string, FloorCell['type']> = {
  d: 'desk', m: 'meeting', c: 'corridor', p: 'plant', b: 'break', w: 'wall',
};

export function getFloorPlan(): FloorCell[][] {
  return PLAN.map(row =>
    row.map(code => {
      const [zoneId, typeCode] = code.split('.');
      const zone = ZONES[zoneId];
      return {
        type: TYPE_MAP[typeCode] || 'corridor',
        zone: zone?.id ?? '',
        zoneColor: zone?.color ?? '#9e9e9e',
        zoneName: zone?.name ?? '',
      };
    })
  );
}

export const GRID_ROWS = PLAN.length;
export const GRID_COLS = PLAN[0].length;
