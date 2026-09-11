import {
    MAP_WIDTH,
    MAP_HEIGHT,
    MIN_ZOOM,
    MAX_ZOOM,
} from '../config/mapConfig'


export class CameraController {

    private workspace: HTMLElement
    private mapContainer: HTMLElement
    private zoomValue: HTMLElement

    private zoom = 1

    private cameraX = 0
    private cameraY = 0

    private panning = false

    private panStartPointerX = 0
    private panStartPointerY = 0

    private panStartCameraX = 0
    private panStartCameraY = 0


    constructor(
        workspace: HTMLElement,
        mapContainer: HTMLElement,
        zoomValue: HTMLElement
    ) {
        this.workspace = workspace
        this.mapContainer = mapContainer
        this.zoomValue = zoomValue
    }


    // --------------------------------------------------
    // ESTADO
    // --------------------------------------------------

    public get isPanning(): boolean {
        return this.panning
    }


  // --------------------------------------------------
  // APLICAR CÁMARA
  // --------------------------------------------------

    private applyCamera() {

        this.mapContainer.style.transform =
            `translate(${this.cameraX}px, ${this.cameraY}px) scale(${this.zoom})`

        this.zoomValue.textContent =
            `${Math.round(this.zoom * 100)}%`
    }


    // --------------------------------------------------
    // CENTRAR
    // --------------------------------------------------

    public centerView() {

        const rect =
            this.workspace.getBoundingClientRect()

        this.cameraX =
            (rect.width - MAP_WIDTH * this.zoom) / 2

        this.cameraY =
            (rect.height - MAP_HEIGHT * this.zoom) / 2

        this.applyCamera()
    }


    public resetView() {

        this.zoom = 1

        this.centerView()
    }


    // --------------------------------------------------
    // COORDENADAS
    // --------------------------------------------------

    public getWorkspacePosition(
        event: PointerEvent | WheelEvent
    ) {

        const rect =
            this.workspace.getBoundingClientRect()

        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        }
    }


    public getMapPosition(
        event: PointerEvent
    ) {

        const pointer =
            this.getWorkspacePosition(event)

        return {
            x:
                (pointer.x - this.cameraX)
                / this.zoom,

            y:
                (pointer.y - this.cameraY)
                / this.zoom,
        }
    }


    public isInsideMap(
        x: number,
        y: number
    ): boolean {

        return (
            x >= 0 &&
            y >= 0 &&
            x < MAP_WIDTH &&
            y < MAP_HEIGHT
        )
    }


    // --------------------------------------------------
    // PAN
    // --------------------------------------------------

    public startPan(
        event: PointerEvent
    ) {

        const pointer =
            this.getWorkspacePosition(event)

        this.panning = true

        this.panStartPointerX =
            pointer.x

        this.panStartPointerY =
            pointer.y

        this.panStartCameraX =
            this.cameraX

        this.panStartCameraY =
            this.cameraY
    }


    public updatePan(
        event: PointerEvent
    ) {

        if (!this.panning) {
            return
        }


        const pointer =
            this.getWorkspacePosition(event)


        const deltaX =
            pointer.x -
            this.panStartPointerX


        const deltaY =
            pointer.y -
            this.panStartPointerY


        this.cameraX =
            this.panStartCameraX +
            deltaX


        this.cameraY =
            this.panStartCameraY +
            deltaY


        this.applyCamera()
    }


    public stopPan() {
        this.panning = false
    }


    // --------------------------------------------------
    // ZOOM
    // --------------------------------------------------

    public handleWheel(
        event: WheelEvent
    ) {

        event.preventDefault()


        const pointer =
            this.getWorkspacePosition(event)


        /*
        * Punto real del mapa que está
        * actualmente debajo del cursor.
        */
        const mapX =
            (pointer.x - this.cameraX)
            / this.zoom

        const mapY =
            (pointer.y - this.cameraY)
            / this.zoom


        const zoomFactor =
            event.deltaY < 0
                ? 1.1
                : 1 / 1.1


        const newZoom =
            Math.min(
                MAX_ZOOM,

                Math.max(
                    MIN_ZOOM,
                    this.zoom * zoomFactor
                )
            )


        /*
        * Reposicionamos la cámara para que
        * mapX / mapY sigan exactamente debajo
        * del cursor después del zoom.
        */
        this.cameraX =
            pointer.x -
            mapX * newZoom

        this.cameraY =
            pointer.y -
            mapY * newZoom


        this.zoom =
            newZoom


        this.applyCamera()
    }
}