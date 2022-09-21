import {
    AsyncImageLoader,
    Bootstrapper as BaseBootstrapper, 
    Camera,
    CssTilemapChunkRenderer,
    SceneBuilder,
    TileAtlasItem
} from "the-world-engine";

import SampleTiles from "./texture/sample_tiles.png";

export class Bootstrapper extends BaseBootstrapper {
    public run(): SceneBuilder {
        const instantiater = this.instantiater;

        return this.sceneBuilder
            .withChild(instantiater.buildGameObject("camera")
                .withComponent(Camera))

            .withChild(instantiater.buildGameObject("map")
                .withComponent(CssTilemapChunkRenderer, c => {
                    c.chunkSize = 15;

                    AsyncImageLoader.loadImageFromPath(SampleTiles).then(image => {
                        if (!c.exists) return;
                        
                        c.imageSources = [ new TileAtlasItem(image, 13, 9) ];
                        c.drawTile(0, 0, 0, 0);
                    });
                }))
        ;
    }
}
