import {
    AsyncImageLoader,
    Bootstrapper as BaseBootstrapper, 
    Camera,
    Component,
    CssSpriteRenderer,
    CssTilemapChunkRenderer,
    GameObject,
    PlayerGridMovementController,
    PrefabRef,
    SceneBuilder,
    TileAtlasItem,
    TrackCameraController
} from "the-world-engine";
import { Vector2, Vector3 } from "three/src/Three";

import { AsyncLoadWaiter } from "./script/AsyncLoadWaiter";
import { WorldGenerator } from "./script/WorldGenerator";
import SampleTiles from "./texture/sample_tiles.png";

export class Bootstrapper extends BaseBootstrapper {
    public run(): SceneBuilder {
        const instantiater = this.instantiater;

        const worldGenerator = new PrefabRef<WorldGenerator>();
        const player = new PrefabRef<GameObject>();

        return this.sceneBuilder
            .withChild(instantiater.buildGameObject("camera")
                .withComponent(Camera, c => {
                    c.viewSize = 15 * 10;
                })
                .withComponent(TrackCameraController, c => {
                    c.setTrackTarget(player.ref!);
                }))

            .withChild(instantiater.buildGameObject("map", new Vector3())
                .withComponent(CssTilemapChunkRenderer, c => {
                    c.chunkSize = 15;
                })
                .withComponent(WorldGenerator, c => {
                    c.playerViewDistance = 5;
                })
                .withComponent(AsyncLoadWaiter<CssTilemapChunkRenderer>, c => {
                    c.loadComponent = CssTilemapChunkRenderer;
                    c.waitComponent = WorldGenerator;

                    c.load = (renderer, resolve): void => {
                        AsyncImageLoader.loadImageFromPath(SampleTiles).then(image => {
                            if (!c.exists) return;
    
                            renderer.imageSources = [ new TileAtlasItem(image, 13, 9) ];
                            resolve();
                        });
                    };
                })
                .getComponent(WorldGenerator, worldGenerator))

            .withChild(instantiater.buildGameObject("test-player", new Vector3(0, 0, 1))
                .withComponent(CssSpriteRenderer, c => {
                    c.imageWidth = 1;
                    c.imageHeight = 1;
                })
                .withComponent(PlayerGridMovementController, c => {
                    c.gridCenter = new Vector2(0, 0);
                    c.speed = 80;
                })
                .withComponent(class ChunkLoadTest extends Component {
                    public worldGenerator: WorldGenerator|null = null;

                    private readonly _tempVector2 = new Vector2();

                    public start(): void {
                        setTimeout(() => {
                            this.worldGenerator?.updatePlayerPosition(231, new Vector2(0, 0));
                            setTimeout(() => {
                                this.worldGenerator?.removePlayer(231);
                            }, 1000);
                        }, 1000);
                    }

                    public update(): void {
                        const position = this.gameObject.transform.position;
                        const positionVector2 = this._tempVector2.set(position.x, position.y);
                        this.worldGenerator?.updatePlayerPosition(this.instanceId, positionVector2);
                    }
                }, c => {
                    c.worldGenerator = worldGenerator.ref!;
                })
                .getGameObject(player))
        ;
    }
}
