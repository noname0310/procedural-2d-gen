import {
    AsyncImageLoader,
    Bootstrapper as BaseBootstrapper, 
    Camera,
    CssTilemapChunkRenderer,
    SceneBuilder,
    TileAtlasItem
} from "the-world-engine";
import { Vector3 } from "three/src/Three";

import { AsyncLoadWaiter } from "./script/AsyncLoadWaiter";
import { Desert, Forest, Grassland, Jungle, Mountains, Ocean, Tundra } from "./script/BiomePreset";
import { Wave } from "./script/NoiseGenerator";
import { ProceduralMapGenerator } from "./script/ProceduralMapGenerator";
import SampleTiles from "./texture/sample_tiles.png";

export class Bootstrapper extends BaseBootstrapper {
    public run(): SceneBuilder {
        const instantiater = this.instantiater;

        return this.sceneBuilder
            .withChild(instantiater.buildGameObject("camera")
                .withComponent(Camera, c => {
                    c.viewSize = 50;
                }))

            .withChild(instantiater.buildGameObject("map", new Vector3(-50 + 0.5, -50 + 0.5, 0))
                .withComponent(CssTilemapChunkRenderer, c => {
                    c.chunkSize = 15;
                })
                .withComponent(ProceduralMapGenerator, c => {
                    c.biomes = [
                        Tundra,
                        Forest,
                        Jungle,
                        Desert, 
                        Mountains,
                        Ocean,
                        Grassland
                    ];

                    c.width = 100;
                    c.height = 100;
                    c.scale = 1;

                    c.heightWaves = [
                        new Wave(56, 0.05, 1),
                        new Wave(199.36, 0.1, 0.5)
                    ];

                    c.moistureWaves = [
                        new Wave(621, 0.03, 1)
                    ];

                    c.heatWaves = [
                        new Wave(318.6, 0.04, 1),
                        new Wave(329.7, 0.02, 0.5)
                    ];
                })
                .withComponent(AsyncLoadWaiter<CssTilemapChunkRenderer>, c => {
                    c.loadComponent = CssTilemapChunkRenderer;
                    c.waitComponent = ProceduralMapGenerator;

                    c.load = (renderer, resolve): void => {
                        AsyncImageLoader.loadImageFromPath(SampleTiles).then(image => {
                            if (!c.exists) return;
    
                            renderer.imageSources = [ new TileAtlasItem(image, 13, 9) ];
                            renderer.drawTile(0, 0, 0, 0);

                            resolve();
                        });
                    };
                }))
        ;
    }
}
