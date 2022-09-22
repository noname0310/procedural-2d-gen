import { Component, CoroutineIterator, CssTilemapChunkRenderer, ReadonlyVector2, WritableVector2 } from "the-world-engine";
import { Vector2 } from "three/src/Three";

import { ChunkLoader } from "./ChunkLoader";
import { ProceduralMapGenerator } from "./ProceduralMapGenerator";

export class WorldGenerator extends Component {
    public override readonly requiredComponents = [CssTilemapChunkRenderer];

    private _chunkLoader: ChunkLoader|null = null;
    private _chunkSize = 15;
    private _playerViewDistance = 3;

    private _loadCirclePoints: ReadonlyVector2[]|null = null;
    private _unloadCirclePoints: ReadonlyVector2[]|null = null;
    private readonly _playerChunkPositions = new Map<number, Vector2>();
    private readonly _loadedChunks = new Map<`${number}_${number}`, number>();

    public awake(): void {
        const renderer = this.gameObject.getComponent(CssTilemapChunkRenderer)!;
        this._chunkLoader = new ChunkLoader(renderer, this._chunkSize);

        this._loadCirclePoints = this.computeCirclePoints(this._playerViewDistance);
        this._unloadCirclePoints = this._loadCirclePoints.slice().reverse();
    }

    private computeCirclePoints(radius: number): ReadonlyVector2[] {
        const result: Vector2[] = [];

        if (radius < 1) return result;
    
        if (radius == 1) {
            result.push(new Vector2(0, 0));
            return result;
        }
    
        radius -= 1;
    
        let xk = 0;
        let yk = radius;
        let pk = 3 - (radius + radius);
    
        do {
            const axkt = xk;
            for (let i = -xk; i <= axkt; i++) {
                result.push(new Vector2(i, -yk));
                result.push(new Vector2(i, yk));
            }
            const aykt = xk;
            for (let i = -xk; i <= aykt; i++) {
                result.push(new Vector2(-yk, i));
                result.push(new Vector2(yk, i));
            }
    
            xk += 1;
            if (pk < 0) pk += (xk << 2) + 6;
            else {
                yk -= 1;
                pk += ((xk - yk) << 2) + 10;
    
            }
    
        } while (xk <= yk);
    
        const xkm1 = xk - 1;
    
        for (let i = -yk; i <= yk; i++) {
            for (let j = -xk + 1; j <= xkm1; j++) {
                result.push(new Vector2(j, i));
            }
        }

        // Remove duplicates
        const uniquePoints = new Set<string>();
        for (let i = 0; i < result.length; i++) {
            const point = result[i];
            const key = `${point.x},${point.y}`;
            if (uniquePoints.has(key)) {
                result.splice(i, 1);
                i--;
            } else {
                uniquePoints.add(key);
            }
        }

        // Sort by distance
        result.sort((a, b) => {
            const aDistance = a.length();
            const bDistance = b.length();
            if (aDistance < bDistance) return -1;
            if (aDistance > bDistance) return 1;
            return 0;
        });

        return result;
    }

    private readonly _tempVector2 = new Vector2() as WritableVector2;

    private *updateChunkFromTo(from?: ReadonlyVector2, to?: ReadonlyVector2): CoroutineIterator {
        let startTime = performance.now();

        const loadCirclePoints = this._loadCirclePoints!;
        const unloadCirclePoints = this._unloadCirclePoints!;

        const unloadChunks = new Set<`${number}_${number}`>();
        const loadChunks = new Set<`${number}_${number}`>();
        
        if (from) {
            for (let i = 0; i < unloadCirclePoints.length; i++) {
                const point = unloadCirclePoints[i];
                const chunkKey = (point.x + from.x) + "_" + (point.y + from.y) as `${number}_${number}`;
                const loadedChunk = this._loadedChunks.get(chunkKey);
                if (loadedChunk) {
                    if (loadedChunk - 1 <= 0) {
                        this._loadedChunks.delete(chunkKey);
                        unloadChunks.add(chunkKey);
                    } else {
                        this._loadedChunks.set(chunkKey, loadedChunk - 1);
                    }
                }
            }
        }

        if (to) {
            for (let i = 0; i < loadCirclePoints.length; i++) {
                const point = loadCirclePoints[i];
                const chunkKey = (point.x + to.x) + "_" + (point.y + to.y) as `${number}_${number}`;
                const loadedChunk = this._loadedChunks.get(chunkKey);
                if (loadedChunk) {
                    this._loadedChunks.set(chunkKey, loadedChunk + 1);
                } else {
                    this._loadedChunks.set(chunkKey, 1);
                    if (unloadChunks.has(chunkKey)) {
                        unloadChunks.delete(chunkKey);
                    } else {
                        loadChunks.add(chunkKey);
                    }
                }
            }
        }

        for (const chunkKey of loadChunks) {
            const [x, y] = chunkKey.split("_").map(Number) as [number, number];
            this._chunkLoader!.loadChunk(this._tempVector2.set(x, y));
            const currentTime = performance.now();
            if (10 < currentTime - startTime) {
                startTime = currentTime;
                yield null;
            }
        }

        for (const chunkKey of unloadChunks) {
            const [x, y] = chunkKey.split("_").map(Number) as [number, number];
            this._chunkLoader!.unloadChunk(this._tempVector2.set(x, y));
            const currentTime = performance.now();
            if (10 < currentTime - startTime) {
                startTime = currentTime;
                yield null;
            }
        }
    }
    
    private readonly _tasks = new Map<number, { from?: Vector2, to?: Vector2 }>();
    private _taskIsRunning = false;

    private lazyUpdateChunkFromTo(playerId: number, from?: ReadonlyVector2, to?: ReadonlyVector2): void {
        const task = this._tasks.get(playerId);
        if (task) {
            task.to = to?.clone();
        } else {
            this._tasks.set(playerId, { from: from?.clone(), to: to?.clone() });
        }

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const worldGenerator = this;

        if (!this._taskIsRunning) {
            this.startCoroutine((function* (): CoroutineIterator {
                worldGenerator._taskIsRunning = true;
                while (worldGenerator._tasks.size > 0) {
                    const task = worldGenerator._tasks.values().next().value as { from?: Vector2, to?: Vector2 };
                    worldGenerator._tasks.delete(playerId);
                    yield* worldGenerator.updateChunkFromTo(task.from, task.to);
                }
                worldGenerator._taskIsRunning = false;
            })());
        }
    }

    private readonly _tempVector1 = new Vector2();

    public updatePlayerPosition(playerId: number, position: ReadonlyVector2): void {
        if(!this.enabled) return;

        const chunkLoader = this._chunkLoader!;
        const playerChunkPosition = chunkLoader.getChunkIndexFromPosition(position, this._tempVector1);
        const playerOldChunkPosition = this._playerChunkPositions.get(playerId) as WritableVector2|undefined;
        if (playerOldChunkPosition?.equals(playerChunkPosition)) return;

        this.lazyUpdateChunkFromTo(playerId, playerOldChunkPosition, playerChunkPosition);

        if (playerOldChunkPosition) {
            playerOldChunkPosition.copy(playerChunkPosition);
        } else {
            this._playerChunkPositions.set(playerId, playerChunkPosition.clone());
        }   
    }

    public removePlayer(playerId: number): void {
        const playerPosition = this._playerChunkPositions.get(playerId);
        if (playerPosition) {
            this.lazyUpdateChunkFromTo(playerId, this._chunkLoader!.getChunkIndexFromPosition(playerPosition, this._tempVector1), undefined);
            this._playerChunkPositions.delete(playerId);
        }
    }

    public get generator(): ProceduralMapGenerator {
        return this._chunkLoader!.generator;
    }

    public get chunkSize(): number {
        return this._chunkSize;
    }

    public set chunkSize(value: number) {
        if (this.initialized) {
            throw new Error("Cannot change chunk size after initialization");
        }

        this._chunkSize = value;
    }

    public get playerViewDistance(): number {
        return this._playerViewDistance;
    }

    public set playerViewDistance(value: number) {
        if (this.initialized) {
            throw new Error("Cannot change player view distance after initialization");
        }

        this._playerViewDistance = value;
    }
}
