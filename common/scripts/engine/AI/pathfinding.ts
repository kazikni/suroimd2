import { BaseObject2D, GameObjectManager2D } from "../gameObject.ts";
import { v2, Vec2 } from "../geometry.ts";
import { Hitbox2D } from "../hitbox.ts";

function defaultHeuristic(ax: number, ay: number, bx: number, by: number) {
    return Math.abs(ax - bx) + Math.abs(ay - by)
}

type AStarNode = {
    x: number
    y: number
    g: number
    h: number
    f: number
    parent?: AStarNode
}
export function astar_path2d(
    object: BaseObject2D,
    baseHitbox: Hitbox2D,
    destWorld: Vec2,
    isBlocked: (
        manager: GameObjectManager2D<BaseObject2D>,
        hb: Hitbox2D,
        cellX: number,
        cellY: number,
        layer: number
    ) => boolean,
    heuristic = defaultHeuristic,
    dirs: readonly [number, number][] = [
        [1, 0], [-1, 0],
        [0, 1], [0, -1],
    ]
): Vec2[] {
    const manager = object.manager
    const layer = object.layer
    const cellSize = manager.cells.cellSize

    const startCell = v2.duplicate(object.position)
    const goalCell  = v2.duplicate(destWorld)

    manager.cells.cell_pos(startCell)
    manager.cells.cell_pos(goalCell)

    const start: AStarNode = {
        x: startCell.x,
        y: startCell.y,
        g: 0,
        h: heuristic(startCell.x, startCell.y, goalCell.x, goalCell.y),
        f: 0,
    }
    start.f = start.h

    const open: AStarNode[] = [start]
    const openMap = new Map<string, AStarNode>()
    openMap.set(`${start.x}:${start.y}`, start)

    const closed = new Set<string>()

    const key = (x: number, y: number) => `${x}:${y}`

    while (open.length > 0) {
        open.sort((a, b) => a.f - b.f)
        const current = open.shift()!
        openMap.delete(key(current.x, current.y))

        if (
            current.x === goalCell.x &&
            current.y === goalCell.y
        ) {
            const path: Vec2[] = []
            let n: AStarNode | undefined = current

            while (n) {
                path.push({
                    x: (n.x + 0.5) * cellSize,
                    y: (n.y + 0.5) * cellSize,
                })
                n = n.parent
            }

            path.reverse()
            return path
        }

        closed.add(key(current.x, current.y))

        for (const [dx, dy] of dirs) {
            const nx = current.x + dx
            const ny = current.y + dy
            const k = key(nx, ny)

            if (closed.has(k)) continue

            const testHB = baseHitbox.clone()

            const worldPos = {
                x: (nx + 0.5) * cellSize,
                y: (ny + 0.5) * cellSize,
            }

            testHB.translate(v2.sub(worldPos, baseHitbox.position))

            if (isBlocked(manager, testHB, nx, ny, layer)) continue

            const cost = (dx === 0 || dy === 0) ? 1 : 1.414
            const g = current.g + cost

            let node = openMap.get(k)
            if (!node) {
                node = {
                    x: nx,
                    y: ny,
                    g,
                    h: heuristic(nx, ny, goalCell.x, goalCell.y),
                    f: 0,
                    parent: current,
                }
                node.f = node.g + node.h
                open.push(node)
                openMap.set(k, node)
            } else if (g < node.g) {
                node.g = g
                node.f = node.g + node.h
                node.parent = current
            }
        }
    }

    return []
}
