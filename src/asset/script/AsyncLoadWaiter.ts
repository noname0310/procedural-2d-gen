import { Component, ComponentConstructor } from "the-world-engine";

export class AsyncLoadWaiter<T extends Component> extends Component {
    public override readonly executionOrder = 1000;

    public loadComponent: ComponentConstructor<T>|null = null;
    public waitComponent: ComponentConstructor|null = null;

    private _loadComponent: T|null = null;
    private _waitComponent: Component|null = null;

    public load: (loadComponent: T, resolve: () => void) => void = (loadComponent, resolve) => {
        loadComponent;
        resolve();
    };

    public awake(): void {
        if (!this.loadComponent || !this.waitComponent) return;

        this._loadComponent = this.gameObject.getComponent(this.loadComponent);
        this._waitComponent = this.gameObject.getComponent(this.waitComponent);

        if (!this._loadComponent || !this._waitComponent) return;

        this._waitComponent.enabled = false;

        this.load(this._loadComponent, () => {
            this._waitComponent!.enabled = true;
        });
    }
}
