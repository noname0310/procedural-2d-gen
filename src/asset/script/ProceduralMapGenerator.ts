import { Component, CssTilemapChunkRenderer } from "the-world-engine";
import { Vector2 } from "three/src/Three";

import { BiomePreset } from "./BiomePreset";
import { Mulberry32 } from "./Mulberry32";
import { NoiseGenerator, Wave } from "./NoiseGenerator";

export class BiomeTempData {
    public biome: BiomePreset;
    public constructor(preset: BiomePreset) {
        this.biome = preset;
    }

    public getDiffValue(height: number, moisture: number, heat: number): number {
        const biome = this.biome;
        return (height - biome.minHeight) + (moisture - biome.minMoisture) + (heat - biome.minHeat);
    }
}

export class ProceduralMapGenerator extends Component {
    public override readonly requiredComponents = [CssTilemapChunkRenderer];

    public tilemap: CssTilemapChunkRenderer | null = null;

    public biomes: BiomePreset[] = [];

    public width = 0;
    public height = 0;
    public scale = 1.0;
    public offset = new Vector2(0, 0);

    public heightWaves: Wave[] = [];
    public heightMap: number[][] = [];

    public moistureWaves: Wave[] = [];
    public moistureMap: number[][] = [];

    public heatWaves: Wave[] = [];
    public heatMap: number[][] = [];

    private readonly _mulberry = new Mulberry32(0);

    public awake(): void {
        this.tilemap = this.gameObject.getComponent(CssTilemapChunkRenderer)!;
    }

    public start(): void {
        this.generateMap();
    }

    private generateMap(): void {
        this.heightMap = NoiseGenerator.generate(this.width, this.height, this.scale, this.heightWaves, this.offset);
        this.moistureMap = NoiseGenerator.generate(this.width, this.height, this.scale, this.moistureWaves, this.offset);
        this.heatMap = NoiseGenerator.generate(this.width, this.height, this.scale, this.heatWaves, this.offset);

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const height = this.heightMap[x][y];
                const moisture = this.moistureMap[x][y];
                const heat = this.heatMap[x][y];

                const tile = this.getBiome(height, moisture, heat).getTileSprite(this._mulberry);
                this.tilemap!.drawTile(x, y, tile.i, tile.a);
            }
        }
    }

    private getBiome(height: number, moisture: number, heat: number): BiomePreset {
        const biomeTemp: BiomeTempData[] = [];
        const biomes = this.biomes;
        for (let i = 0; i < biomes.length; ++i) {
            const biome = biomes[i];
            if (biome.matchCondition(height, moisture, heat)) {
                biomeTemp.push(new BiomeTempData(biome));
            }
        }

        let curVal = 0.0;
        let biomeToReturn: BiomePreset | null = null;
        for (let i = 0; i < biomeTemp.length; ++i) {
            const biome = biomeTemp[i];
            if (biomeToReturn == null) {
                biomeToReturn = biome.biome;
                curVal = biome.getDiffValue(height, moisture, heat);
            } else {
                if (biome.getDiffValue(height, moisture, heat) < curVal) {
                    biomeToReturn = biome.biome;
                    curVal = biome.getDiffValue(height, moisture, heat);
                }
            }
        }

        if (biomeToReturn == null) {
            biomeToReturn = biomes[0];
        }
        return biomeToReturn;
    }
}
