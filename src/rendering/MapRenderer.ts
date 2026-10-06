import {
    MAP_HEIGHT,
    MAP_WIDTH,
} from '../config/mapConfig'

import {
    TerritoryManager,
} from '../map/TerritoryManager'

import {
    LODManager,
} from './LODManager'

import type {
    MapLOD,
} from './LODManager'


export type TerritoryOwnerResolver =
    (
        territoryId: number
    ) => number | null


export class MapRenderer {

    private mapContainer:
        HTMLElement

    private borderCanvas:
        HTMLCanvasElement

    private territoryManager:
        TerritoryManager


    private politicalBorderCanvas:
        HTMLCanvasElement

    private politicalBorderContext:
        CanvasRenderingContext2D


    private lodManager =
        new LODManager()

    private lod:
        MapLOD = 'political'


    private geographyLocked =
        false


    private ownerResolver:
        TerritoryOwnerResolver | null =
        null


    private refreshFrame:
        number | null =
        null


    constructor(
        mapContainer: HTMLElement,
        borderCanvas: HTMLCanvasElement,
        territoryManager: TerritoryManager
    ) {

        this.mapContainer =
            mapContainer

        this.borderCanvas =
            borderCanvas

        this.territoryManager =
            territoryManager

        this.politicalBorderCanvas =
            document.createElement(
                'canvas'
            )

        this.politicalBorderCanvas.width =
            MAP_WIDTH

        this.politicalBorderCanvas.height =
            MAP_HEIGHT

        this.politicalBorderCanvas.className =
            'political-border-canvas'

        const context =
            this.politicalBorderCanvas
                .getContext(
                    '2d'
                )

        if (
            context === null
        ) {

            throw new Error(
                'No se pudo crear el contexto del renderer político'
            )
        }

        this.politicalBorderContext =
            context

        this.mapContainer.appendChild(
            this.politicalBorderCanvas
        )

        this.applyLOD()
    }


    // --------------------------------------------------
    // OWNER RESOLVER
    // --------------------------------------------------

    public setTerritoryOwnerResolver(
        resolver:
            TerritoryOwnerResolver
    ) {

        this.ownerResolver =
            resolver

        this.requestRefresh()
    }


    // --------------------------------------------------
    // GEOGRAFÍA
    // --------------------------------------------------

    public setGeographyLocked(
        locked: boolean
    ) {

        if (
            this.geographyLocked ===
            locked
        ) {
            return
        }

        this.geographyLocked =
            locked

        this.applyLOD()

        this.requestRefresh()
    }


    // --------------------------------------------------
    // ZOOM
    // --------------------------------------------------

    public setZoom(
        zoom: number
    ) {

        const nextLOD =
            this.lodManager.resolve(
                zoom
            )

        if (
            nextLOD ===
            this.lod
        ) {
            return
        }

        this.lod =
            nextLOD

        this.applyLOD()

        this.requestRefresh()
    }


    // --------------------------------------------------
    // APLICAR LOD
    // --------------------------------------------------

    private applyLOD() {

        /*
         * Mientras editamos geografía no
         * ocultamos información.
         */
        if (
            !this.geographyLocked
        ) {

            this.borderCanvas.style.opacity =
                '1'

            this.politicalBorderCanvas
                .style
                .opacity =
                '0'

            return
        }

        this.politicalBorderCanvas
            .style
            .opacity =
            '1'

        if (
            this.lod ===
            'overview'
        ) {

            /*
             * Lejos:
             *
             * casi desaparecen las
             * subdivisiones internas.
             */
            this.borderCanvas.style.opacity =
                '0.28'

            return
        }

        if (
            this.lod ===
            'political'
        ) {

            this.borderCanvas.style.opacity =
                '0.46'

            return
        }

        /*
         * Detail.
         */

        this.borderCanvas.style.opacity =
            '0.78'
    }


    // --------------------------------------------------
    // REFRESH DIFERIDO
    // --------------------------------------------------

    public requestRefresh() {

        if (
            this.refreshFrame !==
            null
        ) {
            return
        }

        /*
         * Si durante el mismo frame se
         * recolorean 100 territorios,
         * seguimos haciendo UNA sola
         * reconstrucción.
         */
        this.refreshFrame =
            requestAnimationFrame(
                () => {

                    this.refreshFrame =
                        null


                    this.rebuildPoliticalBorders()
                }
            )
    }


    // --------------------------------------------------
    // RECONSTRUIR FRONTERAS POLÍTICAS
    // --------------------------------------------------

    private rebuildPoliticalBorders() {

        this.politicalBorderContext
            .clearRect(
                0,
                0,
                MAP_WIDTH,
                MAP_HEIGHT
            )

        if (
            !this.geographyLocked ||
            this.ownerResolver ===
                null
        ) {
            return
        }

        const borderContext =
            this.borderCanvas
                .getContext(
                    '2d',
                    {
                        willReadFrequently:
                            true,
                    }
                )

        if (
            borderContext ===
            null
        ) {
            return
        }

        const borderPixels =
            borderContext
                .getImageData(
                    0,
                    0,
                    MAP_WIDTH,
                    MAP_HEIGHT
                )
                .data

        const territoryRaster =
            this.territoryManager
                .getRasterView()

        const result =
            this.politicalBorderContext
                .createImageData(
                    MAP_WIDTH,
                    MAP_HEIGHT
                )

        const resultPixels =
            result.data

        /*
         * Cacheamos owner porque un mismo
         * territorio aparece en miles de
         * píxeles de frontera.
         */
        const ownerCache =
            new Map<
                number,
                number | null
            >()

        const getOwner =
            (
                territoryId: number
            ) => {

                const cached =
                    ownerCache.get(
                        territoryId
                    )

                if (
                    cached !==
                    undefined
                ) {
                    return cached
                }

                const owner =
                    this.ownerResolver!(
                        territoryId
                    )

                ownerCache.set(
                    territoryId,
                    owner
                )

                return owner
            }

        /*
         * Distancia alrededor de un píxel
         * de frontera donde buscamos los
         * territorios de ambos lados.
         *
         * Así no importa que el borderCanvas
         * ocupe varios píxeles de grosor.
         */
        const sampleRadius =
            4

        const dilation =
            this.getPoliticalBorderDilation()

        const setPixel =
            (
                x: number,
                y: number
            ) => {

                if (
                    x < 0 ||
                    y < 0 ||
                    x >= MAP_WIDTH ||
                    y >= MAP_HEIGHT
                ) {
                    return
                }

                const index =
                    (
                        y *
                        MAP_WIDTH +
                        x
                    ) *
                    4

                /*
                 * Negro azulado ligeramente
                 * suave para no quedar tan
                 * agresivo como el lápiz puro.
                 */
                resultPixels[
                    index
                ] = 38

                resultPixels[
                    index + 1
                ] = 42

                resultPixels[
                    index + 2
                ] = 48

                resultPixels[
                    index + 3
                ] = 205
            }

        const drawPoliticalPixel =
            (
                x: number,
                y: number
            ) => {

                for (
                    let dy =
                        -dilation;
                    dy <=
                        dilation;
                    dy++
                ) {

                    for (
                        let dx =
                            -dilation;
                        dx <=
                            dilation;
                        dx++
                    ) {

                        /*
                        * Kernel circular.
                        *
                        * Evita las esquinas cuadradas
                        * de una dilatación NxN.
                        */
                        if (
                            dx * dx +
                            dy * dy >
                            dilation *
                            dilation
                        ) {
                            continue
                        }

                        setPixel(
                            x + dx,
                            y + dy
                        )
                    }
                }
            }

        // --------------------------------
        // RECORRER BORDER CANVAS
        // --------------------------------

        for (
            let y = 0;
            y < MAP_HEIGHT;
            y++
        ) {

            for (
                let x = 0;
                x < MAP_WIDTH;
                x++
            ) {

                const pixelIndex =
                    y *
                    MAP_WIDTH +
                    x

                const alphaIndex =
                    pixelIndex *
                    4 +
                    3

                /*
                 * No es frontera.
                 */
                if (
                    borderPixels[
                        alphaIndex
                    ] <
                    32
                ) {
                    continue
                }

                const territories =
                    new Set<number>()

                /*
                 * Buscamos qué territorios
                 * existen alrededor de este
                 * segmento de frontera.
                 */
                const minY =
                    Math.max(
                        0,
                        y -
                        sampleRadius
                    )

                const maxY =
                    Math.min(
                        MAP_HEIGHT -
                        1,
                        y +
                        sampleRadius
                    )

                const minX =
                    Math.max(
                        0,
                        x -
                        sampleRadius
                    )

                const maxX =
                    Math.min(
                        MAP_WIDTH -
                        1,
                        x +
                        sampleRadius
                    )

                for (
                    let sampleY =
                        minY;
                    sampleY <=
                        maxY;
                    sampleY++
                ) {

                    for (
                        let sampleX =
                            minX;
                        sampleX <=
                            maxX;
                        sampleX++
                    ) {

                        const territoryId =
                            territoryRaster[
                                sampleY *
                                MAP_WIDTH +
                                sampleX
                            ]

                        if (
                            territoryId ===
                            0
                        ) {
                            continue
                        }

                        territories.add(
                            territoryId
                        )

                        /*
                         * Para decidir si es una
                         * frontera política nos
                         * alcanza con encontrar
                         * unos pocos territorios.
                         */
                        if (
                            territories.size >=
                            4
                        ) {
                            break
                        }
                    }

                    if (
                        territories.size >=
                        4
                    ) {
                        break
                    }
                }

                if (
                    territories.size ===
                    0
                ) {
                    continue
                }

                const territoryIds =
                    Array.from(
                        territories
                    )

                // --------------------------------
                // BORDE EXTERIOR
                // --------------------------------

                if (
                    territoryIds.length ===
                    1
                ) {

                    const owner =
                        getOwner(
                            territoryIds[0]
                        )

                    if (
                        owner !==
                        null
                    ) {

                        drawPoliticalPixel(
                            x,
                            y
                        )
                    }

                    continue
                }

                // --------------------------------
                // FRONTERA ENTRE TERRITORIOS
                // --------------------------------

                const owners =
                    new Set<
                        number | null
                    >()

                for (
                    const territoryId of
                    territoryIds
                ) {

                    owners.add(
                        getOwner(
                            territoryId
                        )
                    )
                }

                /*
                 * Si a ambos lados tenemos el
                 * mismo país:
                 *
                 * Francia | Francia
                 *
                 * no es frontera nacional.
                 *
                 * Si son distintos:
                 *
                 * Francia | España
                 *
                 * sí la resaltamos.
                 */
                if (
                    owners.size >
                    1
                ) {

                    drawPoliticalPixel(
                        x,
                        y
                    )
                }
            }
        }

        this.politicalBorderContext
            .putImageData(
                result,
                0,
                0
            )
    }


    // --------------------------------------------------
    // GROSOR SEGÚN LOD
    // --------------------------------------------------

    private getPoliticalBorderDilation():
        number {

        if (
            this.lod ===
            'overview'
        ) {
            return 1
        }

        if (
            this.lod ===
            'political'
        ) {
            return 1
        }

        return 0
    }
}