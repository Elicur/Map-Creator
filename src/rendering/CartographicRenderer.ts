import {
    MAP_HEIGHT,
    MAP_WIDTH,
} from '../config/mapConfig'

import {
    TerritoryManager,
} from '../map/TerritoryManager'


export type TerritoryOwnerResolver =
    (
        territoryId: number
    ) => number | null


export class CartographicRenderer {

    private borderCanvas:
        HTMLCanvasElement

    private territoryCanvas:
        HTMLCanvasElement

    private territoryManager:
        TerritoryManager


    private canvas:
        HTMLCanvasElement

    private context:
        CanvasRenderingContext2D


    private ownerResolver:
        TerritoryOwnerResolver | null =
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

        this.territoryManager =
            territoryManager


        this.canvas =
            document.createElement(
                'canvas'
            )


        this.canvas.width =
            MAP_WIDTH

        this.canvas.height =
            MAP_HEIGHT


        this.canvas.className =
            'cartographic-canvas'


        const context =
            this.canvas.getContext(
                '2d'
            )


        if (
            context === null
        ) {

            throw new Error(
                'No se pudo crear el contexto cartográfico'
            )
        }


        this.context =
            context


        /*
         * El canvas final no debe aplicar
         * suavizado al copiar imágenes.
         */
        this.context.imageSmoothingEnabled =
            false


        mapContainer.appendChild(
            this.canvas
        )
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
    }


    // --------------------------------------------------
    // VISIBILIDAD
    // --------------------------------------------------

    public setVisible(
        visible: boolean
    ) {

        this.canvas.style.display =
            visible
                ? 'block'
                : 'none'
    }


    // --------------------------------------------------
    // RENDER
    // --------------------------------------------------

    public render() {

        const ownerResolver =
            this.ownerResolver


        if (
            ownerResolver ===
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


        const territoryContext =
            this.territoryCanvas
                .getContext(
                    '2d',
                    {
                        willReadFrequently:
                            true,
                    }
                )


        if (
            borderContext ===
                null ||
            territoryContext ===
                null
        ) {
            return
        }


        const borderImage =
            borderContext.getImageData(
                0,
                0,
                MAP_WIDTH,
                MAP_HEIGHT
            )


        const territoryImage =
            territoryContext.getImageData(
                0,
                0,
                MAP_WIDTH,
                MAP_HEIGHT
            )


        const territoryRaster =
            this.territoryManager
                .getRasterView()


        /*
         * Raster exclusivamente visual.
         *
         * Copiamos el lógico pero después
         * rellenamos sobre él los píxeles
         * ocupados por borderCanvas.
         */
        const displayRaster =
            this.buildDisplayRaster(
                territoryRaster,
                borderImage.data
            )

        this.smoothDisplayRaster(
            displayRaster,
            territoryRaster,
            2
        )

        /*
         * Partimos de los colores que ya
         * muestra TerritoryManager.
         */
        const output =
            this.context.createImageData(
                MAP_WIDTH,
                MAP_HEIGHT
            )


        output.data.set(
            territoryImage.data
        )


        /*
         * Averiguamos el color actual de
         * cada territorio.
         *
         * Esto respeta directamente los
         * colores políticos y el timeline.
         */
        const territoryColors =
            this.collectTerritoryColors(
                territoryRaster,
                territoryImage.data
            )


        /*
         * El borderCanvas original generaba
         * huecos negros/translúcidos entre
         * los rellenos.
         *
         * Acá llenamos esos huecos hasta
         * convertir todo en regiones que
         * realmente se tocan.
         */
        this.fillBorderGaps(
            territoryRaster,
            displayRaster,
            territoryColors,
            output.data
        )


        /*
         * Ahora que los territorios visuales
         * se tocan podemos generar las
         * fronteras desde cero.
         */
        const borderLevels =
            this.buildBorderLevels(
                displayRaster,
                ownerResolver
            )


        this.applyBorders(
            borderLevels,
            output.data
        )


        this.context.putImageData(
            output,
            0,
            0
        )
    }


    // --------------------------------------------------
    // SUAVIZAR RASTER VISUAL
    // --------------------------------------------------

    private smoothDisplayRaster(
        displayRaster: Uint32Array,
        territoryRaster: Uint32Array,
        passes: number
    ) {

        for (
            let pass = 0;
            pass < passes;
            pass++
        ) {

            const source =
                displayRaster.slice()

            for (
                let y = 1;
                y < MAP_HEIGHT - 1;
                y++
            ) {

                for (
                    let x = 1;
                    x < MAP_WIDTH - 1;
                    x++
                ) {

                    const index =
                        y * MAP_WIDTH + x

                    /*
                    * Nunca tocamos los píxeles
                    * lógicos reales del territorio.
                    *
                    * Solamente limpiamos la zona
                    * que originalmente era borde.
                    */
                    if (
                        territoryRaster[
                            index
                        ] !== 0
                    ) {
                        continue
                    }

                    const counts =
                        new Map<
                            number,
                            number
                        >()

                    let bestTerritoryId =
                        0

                    let bestCount =
                        0

                    for (
                        let dy = -1;
                        dy <= 1;
                        dy++
                    ) {

                        for (
                            let dx = -1;
                            dx <= 1;
                            dx++
                        ) {

                            if (
                                dx === 0 &&
                                dy === 0
                            ) {
                                continue
                            }

                            const neighborIndex =
                                (y + dy) *
                                MAP_WIDTH +
                                (x + dx)

                            const neighborId =
                                source[
                                    neighborIndex
                                ]

                            if (
                                neighborId === 0
                            ) {
                                continue
                            }

                            const nextCount =
                                (
                                    counts.get(
                                        neighborId
                                    ) ?? 0
                                ) + 1

                            counts.set(
                                neighborId,
                                nextCount
                            )

                            if (
                                nextCount >
                                    bestCount ||
                                (
                                    nextCount ===
                                        bestCount &&
                                    (
                                        bestTerritoryId === 0 ||
                                        neighborId <
                                            bestTerritoryId
                                    )
                                )
                            ) {

                                bestCount =
                                    nextCount

                                bestTerritoryId =
                                    neighborId
                            }
                        }
                    }

                    if (
                        bestTerritoryId !== 0
                    ) {

                        displayRaster[
                            index
                        ] =
                            bestTerritoryId
                    }
                }
            }
        }
    }

    // --------------------------------------------------
    // CREAR RASTER VISUAL SIN HUECOS
    // --------------------------------------------------

    private buildDisplayRaster(
        territoryRaster:
            Uint32Array,
        borderPixels:
            Uint8ClampedArray
    ): Uint32Array {

        const total =
            MAP_WIDTH *
            MAP_HEIGHT


        const displayRaster =
            territoryRaster.slice()


        /*
         * Distancia dentro de una línea
         * dibujada.
         *
         * -1 = todavía sin visitar.
         */
        const distances =
            new Int32Array(
                total
            )


        distances.fill(
            -1
        )


        /*
         * Cola preasignada para evitar
         * millones de objetos/arrays.
         */
        const queue =
            new Int32Array(
                total
            )


        let queueStart =
            0

        let queueEnd =
            0


        const isBorderPixel =
            (
                index: number
            ) => {

                return (
                    borderPixels[
                        index *
                        4 +
                        3
                    ] >
                    16
                )
            }


        // --------------------------------
        // SEMILLAS
        // --------------------------------

        /*
         * Buscamos píxeles de borderCanvas
         * que estén tocando directamente
         * algún territorio.
         *
         * Esos serán los puntos iniciales
         * para propagar los IDs hacia el
         * interior del trazo.
         */
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

                const index =
                    y *
                    MAP_WIDTH +
                    x


                if (
                    territoryRaster[
                        index
                    ] !== 0 ||
                    !isBorderPixel(
                        index
                    )
                ) {
                    continue
                }


                let territoryId =
                    0


                for (
                    let dy = -1;
                    dy <= 1;
                    dy++
                ) {

                    for (
                        let dx = -1;
                        dx <= 1;
                        dx++
                    ) {

                        if (
                            dx === 0 &&
                            dy === 0
                        ) {
                            continue
                        }


                        const nx =
                            x + dx

                        const ny =
                            y + dy


                        if (
                            nx < 0 ||
                            ny < 0 ||
                            nx >= MAP_WIDTH ||
                            ny >= MAP_HEIGHT
                        ) {
                            continue
                        }


                        const neighborId =
                            territoryRaster[
                                ny *
                                MAP_WIDTH +
                                nx
                            ]


                        if (
                            neighborId ===
                            0
                        ) {
                            continue
                        }


                        /*
                         * Empates deterministas.
                         */
                        if (
                            territoryId === 0 ||
                            neighborId <
                                territoryId
                        ) {

                            territoryId =
                                neighborId
                        }
                    }
                }


                if (
                    territoryId ===
                    0
                ) {
                    continue
                }


                displayRaster[
                    index
                ] =
                    territoryId


                distances[
                    index
                ] =
                    1


                queue[
                    queueEnd++
                ] =
                    index
            }
        }


        // --------------------------------
        // PROPAGACIÓN
        // --------------------------------

        /*
         * Expandimos cada territorio SOLO
         * por los píxeles que pertenecen
         * al borderCanvas.
         *
         * No modificamos espacios libres.
         */
        while (
            queueStart <
            queueEnd
        ) {

            const index =
                queue[
                    queueStart++
                ]


            const x =
                index %
                MAP_WIDTH

            const y =
                Math.floor(
                    index /
                    MAP_WIDTH
                )


            const territoryId =
                displayRaster[
                    index
                ]


            const currentDistance =
                distances[
                    index
                ]


            for (
                let dy = -1;
                dy <= 1;
                dy++
            ) {

                for (
                    let dx = -1;
                    dx <= 1;
                    dx++
                ) {

                    if (
                        dx === 0 &&
                        dy === 0
                    ) {
                        continue
                    }


                    const nx =
                        x + dx

                    const ny =
                        y + dy


                    if (
                        nx < 0 ||
                        ny < 0 ||
                        nx >= MAP_WIDTH ||
                        ny >= MAP_HEIGHT
                    ) {
                        continue
                    }


                    const neighborIndex =
                        ny *
                        MAP_WIDTH +
                        nx


                    /*
                     * Nunca pisamos los píxeles
                     * lógicos de territorios.
                     */
                    if (
                        territoryRaster[
                            neighborIndex
                        ] !==
                        0
                    ) {
                        continue
                    }


                    /*
                     * Tampoco propagamos fuera
                     * de las líneas geográficas.
                     */
                    if (
                        !isBorderPixel(
                            neighborIndex
                        )
                    ) {
                        continue
                    }


                    const nextDistance =
                        currentDistance +
                        1


                    const knownDistance =
                        distances[
                            neighborIndex
                        ]


                    if (
                        knownDistance ===
                        -1
                    ) {

                        distances[
                            neighborIndex
                        ] =
                            nextDistance


                        displayRaster[
                            neighborIndex
                        ] =
                            territoryId


                        queue[
                            queueEnd++
                        ] =
                            neighborIndex


                        continue
                    }


                    /*
                     * Si dos territorios llegan
                     * a la misma distancia,
                     * usamos el ID menor.
                     *
                     * Esto hace que el resultado
                     * sea determinista.
                     */
                    if (
                        knownDistance ===
                            nextDistance &&
                        territoryId <
                            displayRaster[
                                neighborIndex
                            ]
                    ) {

                        displayRaster[
                            neighborIndex
                        ] =
                            territoryId
                    }
                }
            }
        }


        return displayRaster
    }


    // --------------------------------------------------
    // COLORES DE TERRITORIO
    // --------------------------------------------------

    private collectTerritoryColors(
        territoryRaster:
            Uint32Array,
        pixels:
            Uint8ClampedArray
    ) {

        const colors =
            new Map<
                number,
                [
                    number,
                    number,
                    number,
                    number
                ]
            >()


        for (
            let index = 0;
            index <
                territoryRaster.length;
            index++
        ) {

            const territoryId =
                territoryRaster[
                    index
                ]


            if (
                territoryId === 0 ||
                colors.has(
                    territoryId
                )
            ) {
                continue
            }


            const pixelIndex =
                index *
                4


            colors.set(
                territoryId,
                [
                    pixels[
                        pixelIndex
                    ],

                    pixels[
                        pixelIndex + 1
                    ],

                    pixels[
                        pixelIndex + 2
                    ],

                    pixels[
                        pixelIndex + 3
                    ],
                ]
            )
        }


        return colors
    }


    // --------------------------------------------------
    // RELLENAR HUECOS DEL BORDER CANVAS
    // --------------------------------------------------

    private fillBorderGaps(
        territoryRaster:
            Uint32Array,
        displayRaster:
            Uint32Array,
        colors:
            Map<
                number,
                [
                    number,
                    number,
                    number,
                    number
                ]
            >,
        pixels:
            Uint8ClampedArray
    ) {

        for (
            let index = 0;
            index <
                displayRaster.length;
            index++
        ) {

            /*
             * Solo rellenamos lo que antes
             * era hueco.
             */
            if (
                territoryRaster[
                    index
                ] !== 0
            ) {
                continue
            }


            const territoryId =
                displayRaster[
                    index
                ]


            if (
                territoryId ===
                0
            ) {
                continue
            }


            const color =
                colors.get(
                    territoryId
                )


            if (
                color ===
                undefined
            ) {
                continue
            }


            const pixelIndex =
                index *
                4


            pixels[
                pixelIndex
            ] =
                color[0]

            pixels[
                pixelIndex + 1
            ] =
                color[1]

            pixels[
                pixelIndex + 2
            ] =
                color[2]

            pixels[
                pixelIndex + 3
            ] =
                255
        }
    }


    // --------------------------------------------------
    // CLASIFICAR BORDES
    // --------------------------------------------------

    private buildBorderLevels(
        raster:
            Uint32Array,
        ownerResolver:
            TerritoryOwnerResolver
    ): Uint8Array {

        /*
         * 0 = sin borde
         * 1 = mismo país
         * 2 = países diferentes
         * 3 = borde exterior
         */
        const levels =
            new Uint8Array(
                MAP_WIDTH *
                MAP_HEIGHT
            )


        const ownerCache =
            new Map<
                number,
                number | null
            >()


        const getOwner =
            (
                territoryId: number
            ) => {

                if (
                    ownerCache.has(
                        territoryId
                    )
                ) {

                    return ownerCache.get(
                        territoryId
                    )!
                }


                const owner =
                    ownerResolver(
                        territoryId
                    )


                ownerCache.set(
                    territoryId,
                    owner
                )


                return owner
            }


        const getBorderLevel =
            (
                a: number,
                b: number
            ): number => {

                if (
                    a === b
                ) {
                    return 0
                }


                /*
                 * Territorio / vacío.
                 */
                if (
                    a === 0 ||
                    b === 0
                ) {
                    return 3
                }


                /*
                 * Dos territorios.
                 */
                return (
                    getOwner(
                        a
                    ) ===
                    getOwner(
                        b
                    )
                )
                    ? 1
                    : 2
            }


        const raiseLevel =
            (
                x: number,
                y: number,
                level: number
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
                    y *
                    MAP_WIDTH +
                    x


                levels[
                    index
                ] =
                    Math.max(
                        levels[
                            index
                        ],
                        level
                    )
            }


        const drawVerticalBorder =
            (
                x: number,
                y: number,
                level: number
            ) => {

                if (
                    level === 1
                ) {

                    /*
                     * 1 px
                     */
                    raiseLevel(
                        x,
                        y,
                        1
                    )

                    return
                }


                if (
                    level === 2
                ) {

                    /*
                     * 2 px
                     */
                    raiseLevel(
                        x,
                        y,
                        2
                    )

                    raiseLevel(
                        x + 1,
                        y,
                        2
                    )

                    return
                }


                /*
                 * 3 px
                 */
                raiseLevel(
                    x - 1,
                    y,
                    3
                )

                raiseLevel(
                    x,
                    y,
                    3
                )

                raiseLevel(
                    x + 1,
                    y,
                    3
                )
            }


        const drawHorizontalBorder =
            (
                x: number,
                y: number,
                level: number
            ) => {

                if (
                    level === 1
                ) {

                    raiseLevel(
                        x,
                        y,
                        1
                    )

                    return
                }


                if (
                    level === 2
                ) {

                    raiseLevel(
                        x,
                        y,
                        2
                    )

                    raiseLevel(
                        x,
                        y + 1,
                        2
                    )

                    return
                }


                raiseLevel(
                    x,
                    y - 1,
                    3
                )

                raiseLevel(
                    x,
                    y,
                    3
                )

                raiseLevel(
                    x,
                    y + 1,
                    3
                )
            }


        // --------------------------------
        // COMPARAR PIXELES VECINOS
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

                const index =
                    y *
                    MAP_WIDTH +
                    x


                const territoryId =
                    raster[
                        index
                    ]


                // ------------------------
                // VECINO DERECHO
                // ------------------------

                if (
                    x <
                    MAP_WIDTH - 1
                ) {

                    const rightId =
                        raster[
                            index + 1
                        ]


                    const level =
                        getBorderLevel(
                            territoryId,
                            rightId
                        )


                    if (
                        level > 0
                    ) {

                        drawVerticalBorder(
                            x,
                            y,
                            level
                        )
                    }
                }


                // ------------------------
                // VECINO INFERIOR
                // ------------------------

                if (
                    y <
                    MAP_HEIGHT - 1
                ) {

                    const bottomId =
                        raster[
                            index +
                            MAP_WIDTH
                        ]


                    const level =
                        getBorderLevel(
                            territoryId,
                            bottomId
                        )


                    if (
                        level > 0
                    ) {

                        drawHorizontalBorder(
                            x,
                            y,
                            level
                        )
                    }
                }
            }
        }


        return levels
    }


    // --------------------------------------------------
    // PINTAR BORDES
    // --------------------------------------------------

    private applyBorders(
        levels:
            Uint8Array,
        pixels:
            Uint8ClampedArray
    ) {

        for (
            let index = 0;
            index <
                levels.length;
            index++
        ) {

            if (
                levels[
                    index
                ] ===
                0
            ) {
                continue
            }


            const pixelIndex =
                index *
                4


            /*
             * Casi negro.
             *
             * Más adelante esto será parte
             * de un MapStyle.
             */
            pixels[
                pixelIndex
            ] =
                20

            pixels[
                pixelIndex + 1
            ] =
                22

            pixels[
                pixelIndex + 2
            ] =
                24

            pixels[
                pixelIndex + 3
            ] =
                255
        }
    }
}