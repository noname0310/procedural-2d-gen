import { Component, CssTilemapChunkRenderer, ReadonlyVector2, WritableVector2 } from "the-world-engine";
import { Vector2 } from "three/src/Three";

import { ChunkLoader } from "./ChunkLoader";
import { ProceduralMapGenerator } from "./ProceduralMapGenerator";

export class WorldGenerator extends Component {
    public override readonly requiredComponents = [CssTilemapChunkRenderer];

    private _chunkLoader: ChunkLoader|null = null;
    private _chunkSize = 15;
    private _playerViewDistance = 3;

    private _circlePoints: ReadonlyVector2[]|null = null;
    private readonly _playerPositions = new Map<number, Vector2>();
    private readonly _loadedChunks = new Map<`${number}_${number}`, number>();

    public awake(): void {
        const renderer = this.gameObject.getComponent(CssTilemapChunkRenderer)!;
        this._chunkLoader = new ChunkLoader(renderer, this._chunkSize);

        this._circlePoints = this.computeCirclePoints(this._playerViewDistance);
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

        return result;
    }

    private readonly _tempVector3 = new Vector2() as WritableVector2;

    private updateChunkFromTo(from?: ReadonlyVector2, to?: ReadonlyVector2): void {
        const circlePoints = this._circlePoints!;
        
        if (from) {
            for (let i = 0; i < circlePoints.length; i++) {
                const point = circlePoints[i];
                const chunkKey = (point.x + from.x) + "_" + (point.y + from.y) as `${number}_${number}`;
                const loadedChunk = this._loadedChunks.get(chunkKey);
                if (loadedChunk) {
                    if (loadedChunk - 1 <= 0) {
                        this._loadedChunks.delete(chunkKey);
                        this._chunkLoader!.unloadChunk(this._tempVector3.copy(point).add(from));
                    } else {
                        this._loadedChunks.set(chunkKey, loadedChunk - 1);
                    }
                }
            }
        }

        if (to) {
            for (let i = 0; i < circlePoints.length; i++) {
                const point = circlePoints[i];
                const chunkKey = (point.x + to.x) + "_" + (point.y + to.y) as `${number}_${number}`;
                const loadedChunk = this._loadedChunks.get(chunkKey);
                if (loadedChunk) {
                    this._loadedChunks.set(chunkKey, loadedChunk + 1);
                } else {
                    this._loadedChunks.set(chunkKey, 1);
                    this._chunkLoader!.loadChunk(this._tempVector3.copy(point).add(to));
                }
            }
        }
    }

    private readonly _tempVector1 = new Vector2();
    private readonly _tempVector2 = new Vector2();

    public updatePlayerPosition(playerId: number, position: ReadonlyVector2): void {
        if(!this.enabled) return;

        const playerPosition = this._playerPositions.get(playerId) as WritableVector2|undefined;
        if (playerPosition?.equals(position)) return;

        const chunkLoader = this._chunkLoader!;
        const oldCenterChunkIndex = playerPosition ? this._chunkLoader!.getChunkIndexFromPosition(playerPosition, this._tempVector1) : undefined;
        const centerChunkIndex = chunkLoader.getChunkIndexFromPosition(position, this._tempVector2);

        this.updateChunkFromTo(oldCenterChunkIndex, centerChunkIndex);

        if (playerPosition) {
            playerPosition.copy(position);
        } else {
            this._playerPositions.set(playerId, position.clone());
        }   
    }

    public removePlayer(playerId: number): void {
        const playerPosition = this._playerPositions.get(playerId);
        if (playerPosition) {
            this.updateChunkFromTo(this._chunkLoader!.getChunkIndexFromPosition(playerPosition, this._tempVector1), undefined);
            this._playerPositions.delete(playerId);
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
