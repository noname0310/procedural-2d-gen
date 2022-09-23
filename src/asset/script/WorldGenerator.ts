import { Component, CoroutineIterator, CssTilemapChunkRenderer, ReadonlyVector2, WritableVector2 } from "the-world-engine";
import { Vector2 } from "three/src/Three";

import { ChunkLoader } from "./ChunkLoader";
import { ProceduralMapGenerator } from "./ProceduralMapGenerator";

class UserChunkData {
    public readonly loadedChunks = new Set<`${number}_${number}`>;
    public readonly loadChunkQueue = new Set<`${number}_${number}`>;
    public readonly unloadChunkQueue = new Set<`${number}_${number}`>;
}

export class WorldGenerator extends Component {
    public override readonly requiredComponents = [CssTilemapChunkRenderer];

    private _chunkLoader: ChunkLoader|null = null;
    private _chunkSize = 15;
    private _playerViewDistance = 3;

    private _loadCirclePoints: ReadonlyVector2[]|null = null;
    private readonly _playerChunkPositions = new Map<number, Vector2>();
    private readonly _userChunks = new Map<number, UserChunkData>();
    private readonly _loadedChunks = new Map<`${number}_${number}`, number>();
    private _unloadChunkQueueMaxValue = 0;

    public awake(): void {
        const renderer = this.gameObject.getComponent(CssTilemapChunkRenderer)!;
        this._chunkLoader = new ChunkLoader(renderer, this._chunkSize);

        this._loadCirclePoints = this.computeCirclePoints(this._playerViewDistance);
        this._unloadChunkQueueMaxValue = this._loadCirclePoints.length * 0.5;
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

    private updateChunkEnqueue(playerId: number, chunkIndex?: ReadonlyVector2): void {
        const loadCirclePoints = this._loadCirclePoints!;

        let userChunkData = this._userChunks.get(playerId);
        if (userChunkData === undefined) {
            userChunkData = new UserChunkData();
            this._userChunks.set(playerId, userChunkData);
        }

        const loadChunkQueue = userChunkData.loadChunkQueue;
        const unloadChunkQueue = userChunkData.unloadChunkQueue;
        loadChunkQueue.clear();
        unloadChunkQueue.clear();

        for (const chunkKey of userChunkData.loadedChunks) {
            unloadChunkQueue.add(chunkKey);
        }

        if (chunkIndex) {
            for (let i = 0; i < loadCirclePoints.length; i++) {
                const point = loadCirclePoints[i];
                const chunkKey = (point.x + chunkIndex.x) + "_" + (point.y + chunkIndex.y) as `${number}_${number}`;

                if (unloadChunkQueue.has(chunkKey)) {
                    unloadChunkQueue.delete(chunkKey);
                } else {
                    loadChunkQueue.add(chunkKey);
                }
            }
        }
    }

    private readonly _tempVector2 = new Vector2() as WritableVector2;

    private *processUpdateChunk(playerId: number): CoroutineIterator {
        const userChunkData = this._userChunks.get(playerId);
        if (userChunkData === undefined) return;

        const loadChunkQueue = userChunkData.loadChunkQueue;
        const unloadChunkQueue = userChunkData.unloadChunkQueue;
        const loadedChunks = userChunkData.loadedChunks;

        let startTime = performance.now();

        while (0 < loadChunkQueue.size || 0 < unloadChunkQueue.size) {
            if (this._unloadChunkQueueMaxValue < unloadChunkQueue.size || loadChunkQueue.size <= 0) {
                //unloadChunk
                const unloadChunk = unloadChunkQueue.keys().next().value as `${number}_${number}`;
                unloadChunkQueue.delete(unloadChunk);
                loadedChunks.delete(unloadChunk);

                const loadedChunkRefs = this._loadedChunks.get(unloadChunk);
                if (loadedChunkRefs !== undefined) {
                    if (loadedChunkRefs - 1 <= 0) {
                        this._loadedChunks.delete(unloadChunk);

                        const parsedUnloadChunk = unloadChunk.split("_").map(Number) as [number, number];
                        this._chunkLoader!.unloadChunk(this._tempVector2.set(parsedUnloadChunk[0], parsedUnloadChunk[1]));
                    } else {
                        this._loadedChunks.set(unloadChunk, loadedChunkRefs - 1);
                    }
                }
            } else {
                //loadChunk
                const loadChunk = loadChunkQueue.keys().next().value as `${number}_${number}`;
                loadChunkQueue.delete(loadChunk);
                loadedChunks.add(loadChunk);

                const loadedChunkRefs = this._loadedChunks.get(loadChunk);
                if (loadedChunkRefs === undefined) {
                    this._loadedChunks.set(loadChunk, 1);

                    const parsedLoadChunk = loadChunk.split("_").map(Number) as [number, number];
                    this._chunkLoader!.loadChunk(this._tempVector2.set(parsedLoadChunk[0], parsedLoadChunk[1]));
                } else {
                    this._loadedChunks.set(loadChunk, loadedChunkRefs + 1);
                }
            }

            const currentTime = performance.now();
            if (10 < currentTime - startTime) {
                startTime = currentTime;
                yield null;
            }
        }
    }
    
    private readonly _taskQueue = new Set<number>();
    private readonly _runningTasks = new Set<number>();

    private lazyUpdateChunk(playerId: number, chunkIndex?: ReadonlyVector2): void {
        this.updateChunkEnqueue(playerId, chunkIndex);

        if (this._runningTasks.has(playerId)) return;
        this._taskQueue.add(playerId);

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const worldGenerator = this;

        if (this._runningTasks.size < 4) {
            this.startCoroutine((function* (): CoroutineIterator {
                worldGenerator._runningTasks.add(playerId);
                yield* worldGenerator.processUpdateChunk(playerId);
                worldGenerator._runningTasks.delete(playerId);
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

        this.lazyUpdateChunk(playerId, playerChunkPosition);

        if (playerOldChunkPosition) {
            playerOldChunkPosition.copy(playerChunkPosition);
        } else {
            this._playerChunkPositions.set(playerId, playerChunkPosition.clone());
        }   
    }

    public removePlayer(playerId: number): void {
        const playerPosition = this._playerChunkPositions.get(playerId);
        if (playerPosition) {
            this.lazyUpdateChunk(playerId, undefined);
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
