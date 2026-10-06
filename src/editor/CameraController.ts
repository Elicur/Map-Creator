import {
    MAP_HEIGHT,
    MAP_WIDTH,
    MAX_ZOOM,
    MIN_ZOOM,
} from '../config/mapConfig'


export class CameraController {

    private workspace:
        HTMLElement

    private mapContainer:
        HTMLElement

    private zoomValue:
        HTMLElement

    private viewChangedHandler:
        (
            (
                zoom: number
            ) => void
        ) |
        null =
        null

    // --------------------------------------------------
    // VISTA ACTUAL
    // --------------------------------------------------

    private zoom =
        1

    private cameraX =
        0

    private cameraY =
        0


    // --------------------------------------------------
    // DESTINO DE LA ANIMACIÓN
    // --------------------------------------------------

    private targetZoom =
        1

    private targetCameraX =
        0

    private targetCameraY =
        0


    // --------------------------------------------------
    // ANIMACIÓN
    // --------------------------------------------------

    private animationFrame:
        number | null = null

    private lastAnimationTime =
        0


    // Cuanto menor, más rápido llega al destino.
    private readonly zoomSmoothTime =
        70


    // --------------------------------------------------
    // PAN
    // --------------------------------------------------

    private panning =
        false

    private panStartPointerX =
        0

    private panStartPointerY =
        0

    private panStartCameraX =
        0

    private panStartCameraY =
        0


    constructor(
        workspace: HTMLElement,
        mapContainer: HTMLElement,
        zoomValue: HTMLElement
    ) {

        this.workspace =
            workspace

        this.mapContainer =
            mapContainer

        this.zoomValue =
            zoomValue


        /*
         * Primera vista:
         *
         * mostramos el mapa completo sin
         * una animación inicial innecesaria.
         */
        this.resetViewImmediate()
    }


    // --------------------------------------------------
    // ESTADO
    // --------------------------------------------------

    public get isPanning():
        boolean {

        return this.panning
    }


    public get currentZoom():
        number {

        return this.zoom
    }


    // --------------------------------------------------
    // WORKSPACE POSITION
    // --------------------------------------------------

    private getWorkspacePosition(
        event:
            PointerEvent |
            WheelEvent
    ) {

        const rect =
            this.workspace
                .getBoundingClientRect()


        return {
            x:
                event.clientX -
                rect.left,

            y:
                event.clientY -
                rect.top,
        }
    }


    // --------------------------------------------------
    // MAP POSITION
    // --------------------------------------------------

    public getMapPosition(
        event: PointerEvent
    ) {

        const pointer =
            this.getWorkspacePosition(
                event
            )

        return {
            x:
                (
                    pointer.x -
                    this.cameraX
                ) /
                this.zoom,

            y:
                (
                    pointer.y -
                    this.cameraY
                ) /
                this.zoom,
        }
    }


    // --------------------------------------------------
    // MAP BOUNDS
    // --------------------------------------------------

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
    // PAN START
    // --------------------------------------------------

    public startPan(
        event: PointerEvent
    ) {

        /*
         * Si el mapa todavía estaba
         * acercándose/alejándose,
         * detenemos esa animación.
         *
         * El usuario toma control directo.
         */
        this.cancelAnimation()

        this.targetZoom =
            this.zoom

        this.targetCameraX =
            this.cameraX

        this.targetCameraY =
            this.cameraY

        const pointer =
            this.getWorkspacePosition(
                event
            )

        this.panning =
            true

        this.panStartPointerX =
            pointer.x

        this.panStartPointerY =
            pointer.y

        this.panStartCameraX =
            this.cameraX

        this.panStartCameraY =
            this.cameraY
    }


    // --------------------------------------------------
    // PAN UPDATE
    // --------------------------------------------------

    public updatePan(
        event: PointerEvent
    ) {

        if (
            !this.panning
        ) {
            return
        }

        const pointer =
            this.getWorkspacePosition(
                event
            )

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

        this.targetCameraX =
            this.cameraX

        this.targetCameraY =
            this.cameraY

        this.applyCamera()
    }


    // --------------------------------------------------
    // PAN STOP
    // --------------------------------------------------

    public stopPan() {

        this.panning =
            false
    }


    // --------------------------------------------------
    // ZOOM
    // --------------------------------------------------

    public handleWheel(
        event: WheelEvent
    ) {

        event.preventDefault()

        if (
            this.panning
        ) {
            return
        }

        const pointer =
            this.getWorkspacePosition(
                event
            )

        /*
         * Coordenada REAL del mapa que
         * está debajo del cursor ahora.
         *
         * Este punto va a permanecer debajo
         * del cursor durante toda la
         * animación.
         */
        const mapX =
            (
                pointer.x -
                this.cameraX
            ) /
            this.zoom

        const mapY =
            (
                pointer.y -
                this.cameraY
            ) /
            this.zoom

        let wheelDelta =
            event.deltaY


        /*
        * Normalizar unidades del WheelEvent.
        *
        * 0 = pixels
        * 1 = lines
        * 2 = pages
        */
        if (
            event.deltaMode ===
            WheelEvent.DOM_DELTA_LINE
        ) {

            wheelDelta *=
                16
        }
        else if (
            event.deltaMode ===
            WheelEvent.DOM_DELTA_PAGE
        ) {

            wheelDelta *=
                this.workspace.clientHeight
        }


        wheelDelta =
            Math.max(
                -150,
                Math.min(
                    150,
                    wheelDelta
                )
            )


        /*
        * Un touchpad normalmente genera
        * deltas mucho más pequeños que
        * una rueda de mouse.
        *
        * Le damos mayor sensibilidad
        * solamente a esos eventos pequeños.
        */
        const isFineScroll =
            event.deltaMode ===
                WheelEvent.DOM_DELTA_PIXEL &&
            Math.abs(
                event.deltaY
            ) < 40


        const sensitivity =
            isFineScroll
                ? 0.006
                : 0.0018


        const zoomFactor =
            Math.exp(
                -wheelDelta *
                sensitivity
            )

        const newTargetZoom =
            Math.max(
                MIN_ZOOM,
                Math.min(
                    MAX_ZOOM,
                    this.targetZoom *
                    zoomFactor
                )
            )

        if (
            newTargetZoom ===
            this.targetZoom
        ) {
            return
        }

        this.targetZoom =
            newTargetZoom

        /*
         * Queremos que:
         *
         * pointer = camera + map * zoom
         *
         * por lo tanto:
         *
         * camera = pointer - map * zoom
         */
        this.targetCameraX =
            pointer.x -
            mapX *
            this.targetZoom

        this.targetCameraY =
            pointer.y -
            mapY *
            this.targetZoom

        this.startAnimation()
    }


    // --------------------------------------------------
    // CENTRAR VISTA INMEDIATAMENTE
    // --------------------------------------------------

    public centerView() {

        this.cancelAnimation()

        this.resetViewImmediate()
    }

    // --------------------------------------------------
    // RESET VIEW
    // --------------------------------------------------

    public resetView() {

        const zoom =
            this.calculateFitZoom()

        const camera =
            this.calculateCenteredCamera(
                zoom
            )

        this.targetZoom =
            zoom

        this.targetCameraX =
            camera.x

        this.targetCameraY =
            camera.y

        this.startAnimation()
    }


    // --------------------------------------------------
    // RESET INMEDIATO
    // --------------------------------------------------

    private resetViewImmediate() {

        const zoom =
            this.calculateFitZoom()

        const camera =
            this.calculateCenteredCamera(
                zoom
            )

        this.zoom =
            zoom

        this.cameraX =
            camera.x

        this.cameraY =
            camera.y

        this.targetZoom =
            zoom

        this.targetCameraX =
            camera.x

        this.targetCameraY =
            camera.y

        this.applyCamera()
    }


    // --------------------------------------------------
    // FIT ZOOM
    // --------------------------------------------------

    private calculateFitZoom():
        number {

        const rect =
            this.workspace
                .getBoundingClientRect()

        if (
            rect.width <= 0 ||
            rect.height <= 0
        ) {
            return 1
        }

        /*
         * Dejamos un pequeño margen para
         * que el mapa no toque los bordes
         * del workspace.
         */
        const padding =
            32

        const availableWidth =
            Math.max(
                1,
                rect.width -
                padding * 2
            )

        const availableHeight =
            Math.max(
                1,
                rect.height -
                padding * 2
            )

        const fitZoom =
            Math.min(
                availableWidth /
                    MAP_WIDTH,

                availableHeight /
                    MAP_HEIGHT
            )

        /*
         * No ampliamos automáticamente
         * por encima de 100%.
         */
        return Math.max(
            MIN_ZOOM,
            Math.min(
                1,
                fitZoom
            )
        )
    }


    // --------------------------------------------------
    // CENTRAR
    // --------------------------------------------------

    private calculateCenteredCamera(
        zoom: number
    ) {

        const rect =
            this.workspace
                .getBoundingClientRect()

        return {
            x:
                (
                    rect.width -
                    MAP_WIDTH *
                    zoom
                ) /
                2,

            y:
                (
                    rect.height -
                    MAP_HEIGHT *
                    zoom
                ) /
                2,
        }
    }


    // --------------------------------------------------
    // ANIMATION START
    // --------------------------------------------------

    private startAnimation() {

        if (
            this.animationFrame !==
            null
        ) {
            return
        }

        this.lastAnimationTime =
            performance.now()

        this.animationFrame =
            requestAnimationFrame(
                this.animate
            )
    }


    // --------------------------------------------------
    // ANIMATE
    // --------------------------------------------------

    private animate =
        (
            timestamp: number
        ) => {

            const deltaTime =
                Math.min(
                    32,
                    Math.max(
                        0,
                        timestamp -
                        this.lastAnimationTime
                    )
                )

            this.lastAnimationTime =
                timestamp

            /*
             * Interpolación independiente
             * del framerate.
             */
            const alpha =
                1 -
                Math.exp(
                    -deltaTime /
                    this.zoomSmoothTime
                )

            this.zoom +=
                (
                    this.targetZoom -
                    this.zoom
                ) *
                alpha

            this.cameraX +=
                (
                    this.targetCameraX -
                    this.cameraX
                ) *
                alpha

            this.cameraY +=
                (
                    this.targetCameraY -
                    this.cameraY
                ) *
                alpha

            this.applyCamera()

            const zoomFinished =
                Math.abs(
                    this.targetZoom -
                    this.zoom
                ) <
                0.0001

            const xFinished =
                Math.abs(
                    this.targetCameraX -
                    this.cameraX
                ) <
                0.05

            const yFinished =
                Math.abs(
                    this.targetCameraY -
                    this.cameraY
                ) <
                0.05

            if (
                zoomFinished &&
                xFinished &&
                yFinished
            ) {

                this.zoom =
                    this.targetZoom

                this.cameraX =
                    this.targetCameraX

                this.cameraY =
                    this.targetCameraY

                this.applyCamera()

                this.animationFrame =
                    null

                return
            }

            this.animationFrame =
                requestAnimationFrame(
                    this.animate
                )
        }


    // --------------------------------------------------
    // CANCELAR ANIMACIÓN
    // --------------------------------------------------

    private cancelAnimation() {

        if (
            this.animationFrame ===
            null
        ) {
            return
        }

        cancelAnimationFrame(
            this.animationFrame
        )

        this.animationFrame =
            null
    }


    // --------------------------------------------------
    // APLICAR CÁMARA
    // --------------------------------------------------

    private applyCamera() {

        /*
         * translate3d fuerza normalmente
         * la composición de esta transformación
         * fuera del layout principal.
         */
        this.mapContainer.style.transform =
            `translate3d(${this.cameraX}px, ${this.cameraY}px, 0) scale(${this.zoom})`

        this.zoomValue.textContent =
            `${Math.round(
                this.zoom *
                100
            )}%`

        this.viewChangedHandler?.(
            this.zoom
        )
    }


    // --------------------------------------------------
    // VIEW CHANGED
    // --------------------------------------------------

    public setViewChangedHandler(
        handler:
            (
                zoom: number
            ) => void
    ) {

        this.viewChangedHandler =
            handler

        handler(
            this.zoom
        )
    }
}