import {
  GridCell,
  Rule,
  GRID_SIZE,
  WIRE_CONNECTIONS,
  DIR_OFFSETS,
  BUILDING_STATS,
  DAY_THRESHOLD,
  LOW_BATTERY_THRESHOLD,
} from './constants';

export function isWireConnected(wire: GridCell, direction: number): boolean {
  if (wire.type !== 'wire') return false;
  const connections = WIRE_CONNECTIONS[wire.rotation % 6];
  if (!connections) return false;
  return connections[direction];
}

export function getOppositeDirection(dir: number): number {
  return (dir + 2) % 4;
}

function isRelayOpen(cell: GridCell, rules: Rule[]): boolean {
  if (cell.type !== 'relay') return false;
  for (const rule of rules) {
    if (!rule.enabled || !rule.triggered) continue;
    if (rule.action === 'cutoff_nonessential' || rule.action === 'bypass_fault') {
      return true;
    }
  }
  return !!cell.relayOpen;
}

function isTimerBlocked(cell: GridCell, dayTime: number): boolean {
  if (cell.type !== 'timer') return false;
  const isDay = dayTime < DAY_THRESHOLD;
  const schedule = cell.timerSchedule || (cell.rotation === 0 ? 'day' : 'night');
  if (schedule === 'day') {
    return !isDay;
  }
  return isDay;
}

function canCellConnect(cell: GridCell, dir: number, dayTime: number, rules: Rule[]): boolean {
  if (cell.type === 'wire') {
    return isWireConnected(cell, dir);
  }
  if (cell.type === 'relay') {
    if (isRelayOpen(cell, rules)) return false;
    return true;
  }
  if (cell.type === 'timer') {
    if (isTimerBlocked(cell, dayTime)) return false;
    return true;
  }
  if (cell.type === 'priority_valve') {
    return true;
  }
  if (
    cell.type === 'windmill' ||
    cell.type === 'house' ||
    cell.type === 'factory' ||
    cell.type === 'battery'
  ) {
    return true;
  }
  return false;
}

export function evaluateRules(
  rules: Rule[],
  dayTime: number,
  storedPower: number,
  maxStorage: number,
  grid: GridCell[][]
): Rule[] {
  const isDay = dayTime < DAY_THRESHOLD;
  const batteryRatio = maxStorage > 0 ? storedPower / maxStorage : 0;
  const hasFault = grid.some((row) => row.some((c) => c.faulty));

  return rules.map((rule) => {
    let triggered = false;
    if (rule.enabled) {
      switch (rule.condition) {
        case 'day':
          triggered = isDay;
          break;
        case 'night':
          triggered = !isDay;
          break;
        case 'low_battery':
          triggered = batteryRatio < LOW_BATTERY_THRESHOLD;
          break;
        case 'fault':
          triggered = hasFault;
          break;
      }
    }
    return { ...rule, triggered };
  });
}

export function calculatePowerNetwork(
  grid: GridCell[][],
  dayTime: number,
  storedPower: number,
  rules: Rule[] = []
): {
  poweredCells: Set<string>;
  totalGeneration: number;
  totalConsumption: number;
  batteryCapacity: number;
  evaluatedRules: Rule[];
} {
  const evaluatedRules = evaluateRules(rules, dayTime, storedPower, 0, grid);
  const isDay = dayTime < DAY_THRESHOLD;
  let totalGeneration = 0;
  let totalConsumption = 0;
  let batteryCapacity = 0;

  const windmillSources: Array<{ x: number; y: number; gen: number }> = [];
  const batterySources: Array<{ x: number; y: number; discharge: number }> = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = grid[y][x];
      if (cell.faulty) continue;

      if (cell.type === 'windmill') {
        const gen = isDay
          ? BUILDING_STATS.windmill.dayGen
          : BUILDING_STATS.windmill.nightGen;
        totalGeneration += gen;
        windmillSources.push({ x, y, gen });
      }
      if (cell.type === 'battery') {
        batteryCapacity += BUILDING_STATS.battery.storage;
      }
      if (cell.type === 'house') {
        totalConsumption += BUILDING_STATS.house.consumption;
      }
      if (cell.type === 'factory') {
        totalConsumption += BUILDING_STATS.factory.consumption;
      }
    }
  }

  const availableFromBatteries = Math.max(0, storedPower);
  const totalAvailable = totalGeneration + availableFromBatteries;

  if (availableFromBatteries > 0) {
    const batteryCount = grid.flat().filter(
      (c) => c.type === 'battery' && !c.faulty
    ).length;
    if (batteryCount > 0) {
      const dischargePerBattery = availableFromBatteries / batteryCount;
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const cell = grid[y][x];
          if (cell.type === 'battery' && !cell.faulty) {
            batterySources.push({ x, y, discharge: dischargePerBattery });
          }
        }
      }
    }
  }

  const allSources = [
    ...windmillSources.map((s) => ({ x: s.x, y: s.y })),
    ...batterySources.map((s) => ({ x: s.x, y: s.y })),
  ];

  const connectedCells = new Set<string>();
  const visited = new Set<string>();
  const queue: Array<{ x: number; y: number }> = [...allSources];

  for (const s of allSources) {
    visited.add(`${s.x},${s.y}`);
    connectedCells.add(`${s.x},${s.y}`);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentCell = grid[current.y][current.x];

    for (let dir = 0; dir < 4; dir++) {
      const [dx, dy] = DIR_OFFSETS[dir];
      const nx = current.x + dx;
      const ny = current.y + dy;

      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;

      const neighbor = grid[ny][nx];
      if (neighbor.faulty) {
        const bypassFaultRule = evaluatedRules.find(
          (r) => r.action === 'bypass_fault' && r.triggered
        );
        if (!bypassFaultRule) continue;
      }

      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;

      const canConnectFromCurrent = canCellConnect(currentCell, dir, dayTime, evaluatedRules);
      const canConnectFromNeighbor = canCellConnect(neighbor, getOppositeDirection(dir), dayTime, evaluatedRules);

      if (canConnectFromCurrent && canConnectFromNeighbor) {
        visited.add(key);
        connectedCells.add(key);
        if (
          neighbor.type === 'wire' ||
          neighbor.type === 'relay' ||
          neighbor.type === 'timer' ||
          neighbor.type === 'priority_valve'
        ) {
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  const poweredCells = new Set<string>();

  for (const s of allSources) {
    poweredCells.add(`${s.x},${s.y}`);
  }

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = grid[y][x];
      if (
        (cell.type === 'wire' || cell.type === 'relay' || cell.type === 'timer' || cell.type === 'priority_valve') &&
        connectedCells.has(`${x},${y}`)
      ) {
        poweredCells.add(`${x},${y}`);
      }
    }
  }

  const connectedConsumers: Array<{
    x: number;
    y: number;
    consumption: number;
    buildingType: 'house' | 'factory';
    priorityBoost: number;
  }> = [];

  const prioritizedHouse = evaluatedRules.some(
    (r) => r.triggered && r.action === 'prioritize_house'
  );
  const prioritizedFactory = evaluatedRules.some(
    (r) => r.triggered && r.action === 'prioritize_factory'
  );
  const cutoffNonessential = evaluatedRules.some(
    (r) => r.triggered && r.action === 'cutoff_nonessential'
  );

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = grid[y][x];
      if (
        (cell.type === 'house' || cell.type === 'factory') &&
        connectedCells.has(`${x},${y}`)
      ) {
        const buildingType = cell.type;
        let consumption =
          buildingType === 'house'
            ? BUILDING_STATS.house.consumption
            : BUILDING_STATS.factory.consumption;

        if (cutoffNonessential && buildingType === 'factory') {
          continue;
        }

        let priorityBoost = 0;
        const valveNearby = hasPriorityValveNeighbor(grid, x, y, connectedCells);
        if (valveNearby) {
          const target = valveNearby.priorityTarget || (valveNearby.rotation === 0 ? 'house' : 'factory');
          if (target === buildingType) {
            priorityBoost = 100;
          }
        }

        if (prioritizedHouse && buildingType === 'house') priorityBoost += 50;
        if (prioritizedFactory && buildingType === 'factory') priorityBoost += 50;

        connectedConsumers.push({
          x,
          y,
          consumption,
          buildingType,
          priorityBoost,
        });
      }
    }
  }

  let remainingPower = totalAvailable;
  connectedConsumers.sort((a, b) => {
    if (b.priorityBoost !== a.priorityBoost) return b.priorityBoost - a.priorityBoost;
    return a.consumption - b.consumption;
  });

  for (const consumer of connectedConsumers) {
    if (remainingPower >= consumer.consumption) {
      remainingPower -= consumer.consumption;
      poweredCells.add(`${consumer.x},${consumer.y}`);
    }
  }

  return { poweredCells, totalGeneration, totalConsumption, batteryCapacity, evaluatedRules };
}

function hasPriorityValveNeighbor(
  grid: GridCell[][],
  x: number,
  y: number,
  connectedCells: Set<string>
): GridCell | null {
  for (let dir = 0; dir < 4; dir++) {
    const [dx, dy] = DIR_OFFSETS[dir];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
    const neighbor = grid[ny][nx];
    if (neighbor.type === 'priority_valve' && connectedCells.has(`${nx},${ny}`)) {
      return neighbor;
    }
  }
  return null;
}

export function countPoweredBuildings(
  grid: GridCell[][],
  poweredCells: Set<string>
): { houses: number; poweredHouses: number; factories: number; poweredFactories: number } {
  let houses = 0;
  let poweredHouses = 0;
  let factories = 0;
  let poweredFactories = 0;

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = grid[y][x];
      if (cell.type === 'house') {
        houses++;
        if (poweredCells.has(`${x},${y}`)) poweredHouses++;
      }
      if (cell.type === 'factory') {
        factories++;
        if (poweredCells.has(`${x},${y}`)) poweredFactories++;
      }
    }
  }

  return { houses, poweredHouses, factories, poweredFactories };
}
