import { Game } from "the-world-engine";

import { Bootstrapper } from "./asset/Bootstrapper";

const game = new Game(document.body);
game.inputHandler.startHandleEvents();
game.run(Bootstrapper);
