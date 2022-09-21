import { Mulberry32 } from "./Mulberry32";

export abstract class BiomePreset {
    public abstract readonly tiles: { i: number, a: number }[];
    public abstract readonly minHeight: number;
    public abstract readonly minMoisture: number;
    public abstract readonly minHeat: number;

    public getTileSprite(mulberry: Mulberry32): { i: number, a: number } {
        const tiles = this.tiles;
        return tiles[Math.floor(mulberry.next() * tiles.length)];
    }

    public matchCondition(height: number, moisture: number, heat: number): boolean {
        return height >= this.minHeight && moisture >= this.minMoisture && heat >= this.minHeat;
    }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Desert = new class Desert extends BiomePreset {
    public readonly tiles = [
        { i: 0, a: 0 }
    ];
    public readonly minHeight = 0.2;
    public readonly minMoisture = 0;
    public readonly minHeat = 0.5;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Forest = new class Forest extends BiomePreset {
    public readonly tiles = [
        { i: 0, a: 0 }
    ];
    public readonly minHeight = 0.2;
    public readonly minMoisture = 0.4;
    public readonly minHeat = 0.4;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Grassland = new class Grassland extends BiomePreset {
    public readonly tiles = [
        { i: 0, a: 0 }
    ];
    public readonly minHeight = 0.2;
    public readonly minMoisture = 0.5;
    public readonly minHeat = 0.3;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Jungle = new class Jungle extends BiomePreset {
    public readonly tiles = [
        { i: 0, a: 0 }
    ];
    public readonly minHeight = 0.2;
    public readonly minMoisture = 0.5;
    public readonly minHeat = 0.62;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Mountains = new class Mountains extends BiomePreset {
    public readonly tiles = [
        { i: 0, a: 0 }
    ];
    public readonly minHeight = 0.2;
    public readonly minMoisture = 0;
    public readonly minHeat = 0;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Ocean = new class Ocean extends BiomePreset {
    public readonly tiles = [
        { i: 0, a: 0 }
    ];
    public readonly minHeight = 0;
    public readonly minMoisture = 0;
    public readonly minHeat = 0;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Tundra = new class Tundra extends BiomePreset {
    public readonly tiles = [
        { i: 0, a: 0 }
    ];
    public readonly minHeight = 0.2;
    public readonly minMoisture = 0;
    public readonly minHeat = 0;
};
