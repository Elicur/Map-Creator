import {
    TerritoryManager,
} from '../map/TerritoryManager'

import {
    CartographicRenderer,
} from './CartographicRenderer'

import type {
    TerritoryOwnerResolver,
} from './CartographicRenderer'


export class MapRenderer {

    private borderCanvas:
        HTMLCanvasElement

    private territoryCanvas:
        HTMLCanvasElement


    private cartographicRenderer:
        CartographicRenderer


    private geographyLocked =
        false


    private refreshFrame:
        number | null =
        null

    private zoomRefreshTimer:
        number | null =
        null


    constructor(
        mapContainer: HTMLElement,
        borderCanvas: HTMLCanvasElement,
        territoryCanvas: HTMLCanvasElement,
        territoryManager: TerritoryManager
    ) {

        this.borderCanvas =
            borderCanvas

        this.territoryCanvas =
            territoryCanvas


        this.cartographicRenderer =
            new CartographicRenderer(
                mapContainer,
                borderCanvas,
                territoryCanvas,
                territoryManager
            )


        /*
         * La geografía arranca editable.
         *
         * Forzamos explícitamente el estado
         * visual inicial de todas las capas.
         */
        this.applyVisibilityState()
    }


    // --------------------------------------------------
    // OWNER RESOLVER
    // --------------------------------------------------

    public setTerritoryOwnerResolver(
        resolver:
            TerritoryOwnerResolver
    ) {

        this.cartographicRenderer
            .setTerritoryOwnerResolver(
                resolver
            )


        this.requestRefresh()
    }


    // --------------------------------------------------
    // GEOGRAFÍA
    // --------------------------------------------------

    public setGeographyLocked(
        locked: boolean
    ) {

        if (
            this.zoomRefreshTimer !==
            null
        ) {

            window.clearTimeout(
                this.zoomRefreshTimer
            )

            this.zoomRefreshTimer =
                null
        }

        this.geographyLocked =
            locked

        /*
        * Cada cambio de modo invalida
        * cualquier cache geográfico anterior.
        *
        * Es barato: solamente ponemos
        * la referencia en null.
        */
        this.cartographicRenderer
            .invalidateGeometryCache()

        this.applyVisibilityState()

        if (
            locked
        ) {

            this.requestRefresh()
        }
    }


    // --------------------------------------------------
    // VISIBILIDAD DE CAPAS
    // --------------------------------------------------

    private applyVisibilityState() {

        // --------------------------------
        // MAPA FINAL / GEOGRAFÍA BLOQUEADA
        // --------------------------------

        if (
            this.geographyLocked
        ) {

            /*
             * Los canvas originales siguen
             * existiendo y conservan todos
             * sus datos.
             *
             * Solamente los ocultamos
             * visualmente.
             */
            this.territoryCanvas
                .style
                .opacity =
                '0'


            this.borderCanvas
                .style
                .opacity =
                '0'


            this.cartographicRenderer
                .setVisible(
                    true
                )


            return
        }


        // --------------------------------
        // GEOGRAFÍA EDITABLE
        // --------------------------------

        /*
         * Mientras editamos volvemos a
         * mostrar las capas reales del mapa.
         */
        this.territoryCanvas
            .style
            .opacity =
            '1'


        this.borderCanvas
            .style
            .opacity =
            '1'


        this.cartographicRenderer
            .setVisible(
                false
            )
    }


    // --------------------------------------------------
    // ZOOM
    // --------------------------------------------------

    public setZoom(
        zoom: number
    ) {

        const borderProfileChanged =
            this.cartographicRenderer
                .setZoom(
                    zoom
                )

        if (
            !borderProfileChanged
        ) {
            return
        }

        /*
        * Guardamos igualmente los nuevos
        * grosores dentro del renderer,
        * pero mientras editamos geografía
        * no necesitamos renderizar nada.
        */
        if (
            !this.geographyLocked
        ) {
            return
        }

        this.scheduleZoomRefresh()
    }


    // --------------------------------------------------
    // REFRESH DESPUÉS DEL ZOOM
    // --------------------------------------------------

    private scheduleZoomRefresh() {

        if (
            this.zoomRefreshTimer !==
            null
        ) {

            window.clearTimeout(
                this.zoomRefreshTimer
            )
        }

        /*
        * Mientras el usuario hace zoom dejamos que
        * CameraController escale el mapa existente.
        *
        * Cuando el zoom se estabiliza, reconstruimos
        * una sola vez los grosores cartográficos.
        */
        this.zoomRefreshTimer =
            window.setTimeout(
                () => {

                    this.zoomRefreshTimer =
                        null

                    this.requestRefresh()
                },
                120
            )
    }


    // --------------------------------------------------
    // REFRESH
    // --------------------------------------------------

    public requestRefresh() {

        /*
         * Mientras editamos geografía no
         * necesitamos reconstruir la vista
         * cartográfica porque está oculta.
         */
        if (
            !this.geographyLocked
        ) {
            return
        }


        /*
         * Si ya hay un refresh programado
         * para este frame, no hacemos otro.
         */
        if (
            this.refreshFrame !==
            null
        ) {
            return
        }


        this.refreshFrame =
            requestAnimationFrame(
                () => {

                    this.refreshFrame =
                        null


                    this.cartographicRenderer
                        .render()
                }
            )
    }
}