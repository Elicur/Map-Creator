import {
    MAP_WIDTH,
    MAP_HEIGHT,
} from '../config/mapConfig'

import type {
    EditorUI,
} from '../ui/createUI'

import {
    analyzeClosedRegions,
} from './BorderRegionAnalyzer'

import type {
    BorderRegionAnalysis,
} from './BorderRegionAnalyzer'

import type {
    Point,
} from '../types/editor'

export class ReferenceMapController {

    private readonly ui: EditorUI

    private readonly canvas: HTMLCanvasElement

    private readonly context: CanvasRenderingContext2D

    private imageDataUrl: string | null = null

    private opacity = 0.6

    private changeHandler:
        (() => void) | null =
        null

    private editingEnabled = true

    private borderDetectionPreview = false

    private borderThreshold = 160

    private territoryAnalysisPreview = false

    private territoryAnalysis: BorderRegionAnalysis | null = null

    private excludedTerritoryRegionIds = new Set<number>()

    constructor(
        ui: EditorUI
    ) {

        this.ui =
            ui

        this.canvas =
            ui.referenceCanvas

        const context =
            this.canvas.getContext(
                '2d'
            )

        if (
            context === null
        ) {
            throw new Error(
                'No se pudo obtener el contexto del mapa de referencia'
            )
        }

        this.context =
            context

        this.bindEvents()

        this.updateUI()
        this.applyOpacity()
    }


    private bindEvents() {

        this.ui.referenceMapButton
            .addEventListener(
                'click',
                this.handleReferenceMapClick
            )

        this.ui.referenceMapInput
            .addEventListener(
                'change',
                this.handleReferenceMapChange
            )

        this.ui.referenceOpacityInput
            .addEventListener(
                'input',
                this.handleOpacityInput
            )

        this.ui.removeReferenceMapButton
            .addEventListener(
                'click',
                this.handleRemoveClick
            )

        this.ui.detectReferenceBordersButton
            .addEventListener(
                'click',
                this.handleDetectBordersClick
            )

        this.ui.referenceThresholdInput
            .addEventListener(
                'input',
                this.handleThresholdInput
            )

        this.ui.applyReferenceBordersButton
            .addEventListener(
                'click',
                this.handleApplyBordersClick
            )

        this.ui
            .analyzeReferenceTerritoriesButton
            .addEventListener(
                'click',
                this.handleAnalyzeTerritoriesClick
            )

        this.canvas
            .addEventListener(
                'click',
                this.handleTerritoryAnalysisClick
            )

        this.ui.createDetectedTerritoriesButton
            .addEventListener(
                'click',
                this.handleCreateDetectedTerritoriesClick
            )
    }


    private handleApplyBordersClick =
        async () => {

            if (
                !this.borderDetectionPreview ||
                this.imageDataUrl ===
                    null ||
                this.applyBordersHandler ===
                    null
            ) {
                return
            }

            /*
            * El canvas contiene en este momento
            * solamente la máscara detectada.
            *
            * La opacidad es CSS, por lo que no
            * queda incorporada al PNG.
            */
            const borderImage =
                this.canvas.toDataURL(
                    'image/png'
                )

            const applied =
                await this.applyBordersHandler(
                    borderImage
                )

            if (
                !applied
            ) {
                return
            }

            /*
            * Volvemos a mostrar la referencia
            * original después de aplicar.
            */
            this.borderDetectionPreview =
                false

            this.updateUI()

            await this.loadImage(
                this.imageDataUrl
            )
        }


    private handleReferenceMapClick =
        () => {

            this.ui.referenceMapInput
                .click()
        }


    private handleReferenceMapChange =
        async () => {

            const file =
                this.ui.referenceMapInput
                    .files?.[0]

            if (
                file === undefined
            ) {
                return
            }

            try {

                if (
                    !this.isSupportedFile(
                        file
                    )
                ) {

                    this.ui.statusMessage
                        .textContent =
                        'Formato de imagen no soportado'

                    return
                }

                const dataUrl =
                    await this.readFileAsDataUrl(
                        file
                    )

                this.borderDetectionPreview = false

                await this.loadImage(
                    dataUrl
                )

                this.imageDataUrl =
                    dataUrl

                this.clearTerritoryAnalysisState()

                this.updateUI()

                this.changeHandler
                    ?.()

                this.ui.statusMessage
                    .textContent =
                    `Referencia "${file.name}" cargada`
            }

            catch (error) {

                console.error(
                    error
                )

                this.ui.statusMessage
                    .textContent =
                    'No se pudo cargar la imagen de referencia'
            }

            finally {

                /*
                 * Permite volver a seleccionar
                 * el mismo archivo posteriormente.
                 */
                this.ui.referenceMapInput.value =
                    ''
            }
        }


    private handleOpacityInput =
        () => {

            const percentage =
                Number(
                    this.ui
                        .referenceOpacityInput
                        .value
                )

            this.opacity =
                percentage / 100

            this.applyOpacity()
        }


    private handleRemoveClick =
        () => {

            if (
                this.imageDataUrl ===
                    null
            ) {
                return
            }

            this.clearInternal()

            this.changeHandler
                ?.()

            this.ui.statusMessage
                .textContent =
                'Imagen de referencia eliminada'
        }


    public clear() {

        this.context.clearRect(
            0,
            0,
            MAP_WIDTH,
            MAP_HEIGHT
        )

        this.imageDataUrl =
            null

        this.updateUI()
    }


    public hasReference():
        boolean {

        return (
            this.imageDataUrl !==
            null
        )
    }


    private async loadImage(
        dataUrl: string
    ) {

        const image =
            await this.createImage(
                dataUrl
            )

        this.context.clearRect(
            0,
            0,
            MAP_WIDTH,
            MAP_HEIGHT
        )

        /*
         * Conservamos la proporción original
         * de la imagen y la centramos.
         */
        const scale =
            Math.min(
                MAP_WIDTH /
                    image.naturalWidth,

                MAP_HEIGHT /
                    image.naturalHeight
            )

        const drawWidth =
            image.naturalWidth *
            scale

        const drawHeight =
            image.naturalHeight *
            scale

        const drawX =
            (
                MAP_WIDTH -
                drawWidth
            ) / 2

        const drawY =
            (
                MAP_HEIGHT -
                drawHeight
            ) / 2

        this.context.imageSmoothingEnabled =
            true

        this.context.drawImage(
            image,
            drawX,
            drawY,
            drawWidth,
            drawHeight
        )
    }


    private applyOpacity() {

        const percentage =
            Math.round(
                this.opacity *
                100
            )

        this.canvas.style.opacity =
            this.opacity.toString()

        this.ui.referenceOpacityInput.value =
            percentage.toString()

        this.ui.referenceOpacityValue
            .textContent =
            `${percentage}%`
    }


    private updateUI() {

        const hasReference =
            this.hasReference()

        const includedTerritoryRegions =
            this.territoryAnalysis ===
                null
                ? 0
                : (
                    this.territoryAnalysis
                        .regions
                        .length -
                    this.excludedTerritoryRegionIds
                        .size
                )

        this.ui.createDetectedTerritoriesButton
            .classList.toggle(
                'hidden',
                !this.territoryAnalysisPreview
            )

        this.ui.createDetectedTerritoriesButton.disabled =
            !this.editingEnabled ||
            !this.territoryAnalysisPreview ||
            includedTerritoryRegions === 0

        this.ui.referenceMapButton.disabled =
            !this.editingEnabled ||
            this.territoryAnalysisPreview

        this.ui.referenceOpacityInput.disabled =
            !this.editingEnabled ||
            !hasReference ||
            this.territoryAnalysisPreview

        this.ui.removeReferenceMapButton.disabled =
            !this.editingEnabled ||
            !hasReference ||
            this.territoryAnalysisPreview

        this.ui.detectReferenceBordersButton.disabled =
            !this.editingEnabled ||
            !hasReference ||
            this.territoryAnalysisPreview

        this.ui.detectReferenceBordersButton.textContent =
            this.borderDetectionPreview
                ? 'Cancelar detección'
                : 'Detectar fronteras'

        this.ui.referenceThresholdControl
            .classList.toggle(
                'hidden',
                !this.borderDetectionPreview
            )

        this.ui.applyReferenceBordersButton
            .classList.toggle(
                'hidden',
                !this.borderDetectionPreview
            )

        this.ui
            .analyzeReferenceTerritoriesButton
            .disabled =
                !this.editingEnabled ||
                this.borderDetectionPreview

        this.ui
            .analyzeReferenceTerritoriesButton
            .textContent =
                this.territoryAnalysisPreview
                    ? 'Cancelar análisis'
                    : 'Analizar territorios'
    }


    private isSupportedFile(
        file: File
    ): boolean {

        return (
            file.type ===
                'image/png' ||
            file.type ===
                'image/jpeg' ||
            file.type ===
                'image/webp'
        )
    }


    private readFileAsDataUrl(
        file: File
    ): Promise<string> {

        return new Promise(
            (
                resolve,
                reject
            ) => {

                const reader =
                    new FileReader()

                reader.onload =
                    () => {

                        if (
                            typeof reader.result !==
                            'string'
                        ) {

                            reject(
                                new Error(
                                    'No se pudo leer la imagen'
                                )
                            )

                            return
                        }

                        resolve(
                            reader.result
                        )
                    }

                reader.onerror =
                    () => {

                        reject(
                            reader.error ??
                            new Error(
                                'Error leyendo la imagen'
                            )
                        )
                    }

                reader.readAsDataURL(
                    file
                )
            }
        )
    }


    private createImage(
        source: string
    ): Promise<HTMLImageElement> {

        return new Promise(
            (
                resolve,
                reject
            ) => {

                const image =
                    new Image()

                image.onload =
                    () => {
                        resolve(
                            image
                        )
                    }

                image.onerror =
                    () => {

                        reject(
                            new Error(
                                'La imagen no pudo decodificarse'
                            )
                        )
                    }

                image.src =
                    source
            }
        )
    }


    public setChangeHandler(
        handler: () => void
    ) {

        this.changeHandler =
            handler
    }


    public exportProjectState():
        string | null {

        return this.imageDataUrl
    }


    public async importProjectState(
        imageDataUrl: string | null
    ) {

        this.clearTerritoryAnalysisState()

        this.borderDetectionPreview = false

        this.opacity =
            0.6

        this.applyOpacity()

        if (
            imageDataUrl ===
            null
        ) {

            this.clearInternal()

            return
        }

        await this.loadImage(
            imageDataUrl
        )

        this.imageDataUrl =
            imageDataUrl

        this.updateUI()
    }


    public reset() {

        this.clearTerritoryAnalysisState()

        this.opacity = 0.6

        this.applyOpacity()

        this.clearInternal()
    }


    private clearInternal() {

        this.context.clearRect(
            0,
            0,
            MAP_WIDTH,
            MAP_HEIGHT
        )

        this.imageDataUrl = null

        this.borderDetectionPreview = false

        this.clearTerritoryAnalysisState()

        this.updateUI()
    }


    public setEditingEnabled(
        enabled: boolean
    ) {

        this.editingEnabled =
            enabled

        this.updateUI()
    }


    // --------------------------------------------------
    // DETECCIÓN DE FRONTERAS
    // --------------------------------------------------
    private handleDetectBordersClick =
        () => {

            if (
                this.imageDataUrl ===
                null
            ) {
                return
            }

            if (
                this.borderDetectionPreview
            ) {

                this.borderDetectionPreview =
                    false

                this.updateUI()

                void this.loadImage(
                    this.imageDataUrl
                )

                return
            }

            this.borderDetectionPreview =
                true

            this.updateUI()

            void this.renderBorderDetectionPreview()
        }

    
    private handleThresholdInput =
        () => {

            this.borderThreshold =
                Number(
                    this.ui
                        .referenceThresholdInput
                        .value
                )

            this.ui.referenceThresholdValue
                .textContent =
                this.borderThreshold.toString()

            if (
                !this.borderDetectionPreview
            ) {
                return
            }

            void this.renderBorderDetectionPreview()
        }

    
    private async renderBorderDetectionPreview() {

        if (
            this.imageDataUrl ===
                null
        ) {
            return
        }

        const image =
            await this.createImage(
                this.imageDataUrl
            )

        const processingCanvas =
            document.createElement(
                'canvas'
            )

        processingCanvas.width =
            MAP_WIDTH

        processingCanvas.height =
            MAP_HEIGHT

        const processingContext =
            processingCanvas.getContext(
                '2d'
            )

        if (
            processingContext ===
            null
        ) {
            throw new Error(
                'No se pudo crear el contexto de procesamiento'
            )
        }

        const scale =
            Math.min(
                MAP_WIDTH /
                    image.naturalWidth,

                MAP_HEIGHT /
                    image.naturalHeight
            )

        const drawWidth =
            image.naturalWidth *
            scale

        const drawHeight =
            image.naturalHeight *
            scale

        const drawX =
            (
                MAP_WIDTH -
                drawWidth
            ) / 2

        const drawY =
            (
                MAP_HEIGHT -
                drawHeight
            ) / 2

        processingContext.drawImage(
            image,
            drawX,
            drawY,
            drawWidth,
            drawHeight
        )

        const imageData =
            processingContext.getImageData(
                0,
                0,
                MAP_WIDTH,
                MAP_HEIGHT
            )

        const pixels =
            imageData.data

        for (
            let i = 0;
            i < pixels.length;
            i += 4
        ) {

            const alpha =
                pixels[i + 3]

            if (
                alpha === 0
            ) {
                continue
            }

            const red =
                pixels[i]

            const green =
                pixels[i + 1]

            const blue =
                pixels[i + 2]

            /*
            * Luminancia perceptual.
            */
            const brightness =
                red * 0.299 +
                green * 0.587 +
                blue * 0.114

            const isBorder =
                brightness <=
                this.borderThreshold

            if (
                isBorder
            ) {

                pixels[i] =
                    0

                pixels[i + 1] =
                    0

                pixels[i + 2] =
                    0

                pixels[i + 3] =
                    255

                continue
            }

            /*
            * Lo que no parece frontera
            * queda transparente.
            */
            pixels[i] =
                0

            pixels[i + 1] =
                0

            pixels[i + 2] =
                0

            pixels[i + 3] =
                0
        }

        this.context.clearRect(
            0,
            0,
            MAP_WIDTH,
            MAP_HEIGHT
        )

        this.context.putImageData(
            imageData,
            0,
            0
        )
    }


    private applyBordersHandler:
        (
            (
                borderImage: string
            ) => Promise<boolean>
        ) | null =
        null

    
    public setApplyBordersHandler(
        handler:
            (
                borderImage: string
            ) => Promise<boolean>
    ) {

        this.applyBordersHandler =
            handler
    }


    // --------------------------------------------------
    // ANÁLISIS DE TERRITORIOS
    // --------------------------------------------------
    private handleAnalyzeTerritoriesClick =
        async () => {

            /*
            * Si ya estamos viendo el análisis,
            * el mismo botón lo cancela.
            */
            if (
                this.territoryAnalysisPreview
            ) {

                this.clearTerritoryAnalysisState()

                this.updateUI()

                await this.restoreReferenceAfterAnalysis()

                this.ui.statusMessage.textContent =
                    'Análisis de territorios cancelado'

                return
            }

            this.renderTerritoryAnalysis()
        }

    
    private async restoreReferenceAfterAnalysis() {

        this.context.clearRect(
            0,
            0,
            MAP_WIDTH,
            MAP_HEIGHT
        )

        this.applyOpacity()

        /*
        * Si había una referencia, volvemos
        * a mostrarla.
        *
        * Si no había ninguna, el canvas
        * simplemente queda vacío.
        */
        if (
            this.imageDataUrl !==
            null
        ) {

            await this.loadImage(
                this.imageDataUrl
            )
        }
    }

    
    private renderTerritoryAnalysis() {

        const borderContext =
            this.ui.borderCanvas
                .getContext(
                    '2d'
                )

        if (
            borderContext ===
            null
        ) {
            throw new Error(
                'No se pudo leer el canvas de fronteras'
            )
        }

        const borderImageData =
            borderContext.getImageData(
                0,
                0,
                MAP_WIDTH,
                MAP_HEIGHT
            )

        const analysis =
            analyzeClosedRegions(
                borderImageData.data,
                MAP_WIDTH,
                MAP_HEIGHT
            )

        if (
            analysis.regions.length ===
            0
        ) {

            this.ui.statusMessage.textContent =
                'No se detectaron regiones cerradas'

            return
        }

        this.territoryAnalysis =
            analysis

        this.excludedTerritoryRegionIds
            .clear()

        this.territoryAnalysisPreview =
            true

        this.canvas.classList.add(
            'territory-analysis-interactive'
        )

        this.renderTerritoryAnalysisPreview()

        this.updateUI()

        this.updateTerritoryAnalysisStatus()
    }


    private renderTerritoryAnalysisPreview() {

        if (
            this.territoryAnalysis ===
            null
        ) {
            return
        }

        const analysis =
            this.territoryAnalysis

        const validRegionIds =
            new Set(
                analysis.regions.map(
                    region =>
                        region.id
                )
            )

        const preview =
            this.context.createImageData(
                MAP_WIDTH,
                MAP_HEIGHT
            )

        const previewPixels =
            preview.data


        for (
            let pixelIndex = 0;
            pixelIndex <
                analysis.labels.length;
            pixelIndex++
        ) {

            const regionId =
                analysis.labels[
                    pixelIndex
                ]

            if (
                !validRegionIds.has(
                    regionId
                )
            ) {
                continue
            }

            const offset =
                pixelIndex *
                4

            /*
            * Una región excluida sigue
            * mostrándose, pero en gris tenue.
            *
            * De esta forma también podemos
            * volver a hacer clic sobre ella.
            */
            if (
                this.excludedTerritoryRegionIds
                    .has(
                        regionId
                    )
            ) {

                previewPixels[offset] =
                    80

                previewPixels[offset + 1] =
                    80

                previewPixels[offset + 2] =
                    80

                previewPixels[offset + 3] =
                    70

                continue
            }

            const color =
                this.getRegionPreviewColor(
                    regionId
                )

            previewPixels[offset] =
                color.r

            previewPixels[offset + 1] =
                color.g

            previewPixels[offset + 2] =
                color.b

            previewPixels[offset + 3] =
                160
        }


        this.context.clearRect(
            0,
            0,
            MAP_WIDTH,
            MAP_HEIGHT
        )

        this.canvas.style.opacity =
            '1'

        this.context.putImageData(
            preview,
            0,
            0
        )
    }


    private handleTerritoryAnalysisClick =
        (
            event: MouseEvent
        ) => {

            if (
                !this.territoryAnalysisPreview ||
                this.territoryAnalysis ===
                    null
            ) {
                return
            }

            event.preventDefault()

            event.stopPropagation()


            const rect =
                this.canvas
                    .getBoundingClientRect()

            if (
                rect.width <= 0 ||
                rect.height <= 0
            ) {
                return
            }


            /*
            * Convertimos coordenadas de pantalla
            * a coordenadas reales 1600x900.
            *
            * Esto funciona también con zoom.
            */
            const x =
                Math.floor(
                    (
                        event.clientX -
                        rect.left
                    ) *
                    (
                        MAP_WIDTH /
                        rect.width
                    )
                )

            const y =
                Math.floor(
                    (
                        event.clientY -
                        rect.top
                    ) *
                    (
                        MAP_HEIGHT /
                        rect.height
                    )
                )


            if (
                x < 0 ||
                y < 0 ||
                x >= MAP_WIDTH ||
                y >= MAP_HEIGHT
            ) {
                return
            }


            const pixelIndex =
                y *
                MAP_WIDTH +
                x

            const regionId =
                this.territoryAnalysis
                    .labels[
                        pixelIndex
                    ]


            if (
                regionId === 0
            ) {
                return
            }


            const isDetectedRegion =
                this.territoryAnalysis
                    .regions
                    .some(
                        region =>
                            region.id ===
                            regionId
                    )


            if (
                !isDetectedRegion
            ) {
                return
            }


            if (
                this.excludedTerritoryRegionIds
                    .has(
                        regionId
                    )
            ) {

                this.excludedTerritoryRegionIds
                    .delete(
                        regionId
                    )
            }

            else {

                this.excludedTerritoryRegionIds
                    .add(
                        regionId
                    )
            }


            this.renderTerritoryAnalysisPreview()

            this.updateUI()
            
            this.updateTerritoryAnalysisStatus()
        }

    
    private updateTerritoryAnalysisStatus() {

        if (
            this.territoryAnalysis ===
            null
        ) {
            return
        }

        const total =
            this.territoryAnalysis
                .regions
                .length

        const excluded =
            this.excludedTerritoryRegionIds
                .size

        const included =
            total -
            excluded


        if (
            excluded === 0
        ) {

            this.ui.statusMessage.textContent =
                `${included} territorios candidatos detectados`

            return
        }


        this.ui.statusMessage.textContent =
            `${included} territorios candidatos · ${excluded} excluidos`
    }    


    private getRegionPreviewColor(
        regionId: number
    ): {
        r: number
        g: number
        b: number
    } {

        const hue =
            (
                regionId *
                137.508
            ) % 360

        return this.hslToRgb(
            hue,
            70,
            55
        )
    }


    private clearTerritoryAnalysisState() {

        this.territoryAnalysisPreview = false

        this.territoryAnalysis =
            null

        this.excludedTerritoryRegionIds
            .clear()

        this.canvas.classList.remove(
            'territory-analysis-interactive'
        )
    }


    private hslToRgb(
        hue: number,
        saturation: number,
        lightness: number
    ): {
        r: number
        g: number
        b: number
    } {

        const s =
            saturation /
            100

        const l =
            lightness /
            100

        const chroma =
            (
                1 -
                Math.abs(
                    2 * l -
                    1
                )
            ) *
            s

        const hueSection =
            hue /
            60

        const x =
            chroma *
            (
                1 -
                Math.abs(
                    hueSection %
                    2 -
                    1
                )
            )

        let red =
            0

        let green =
            0

        let blue =
            0


        if (
            hueSection < 1
        ) {
            red = chroma
            green = x
        }
        else if (
            hueSection < 2
        ) {
            red = x
            green = chroma
        }
        else if (
            hueSection < 3
        ) {
            green = chroma
            blue = x
        }
        else if (
            hueSection < 4
        ) {
            green = x
            blue = chroma
        }
        else if (
            hueSection < 5
        ) {
            red = x
            blue = chroma
        }
        else {
            red = chroma
            blue = x
        }


        const match =
            l -
            chroma / 2


        return {
            r:
                Math.round(
                    (
                        red +
                        match
                    ) *
                    255
                ),

            g:
                Math.round(
                    (
                        green +
                        match
                    ) *
                    255
                ),

            b:
                Math.round(
                    (
                        blue +
                        match
                    ) *
                    255
                ),
        }
    }


    // --------------------------------------------------
    // Create Territories Handler
    // --------------------------------------------------
    private createTerritoriesHandler:
        (
            (
                seeds: Point[]
            ) => {
                created: number
                existing: number
                failed: number
            }
        ) | null =
        null


    public setCreateTerritoriesHandler(
        handler:
            (
                seeds: Point[]
            ) => {
                created: number
                existing: number
                failed: number
            }
    ) {

        this.createTerritoriesHandler =
            handler
    }


    // --------------------------------------------------
    // Create Detected Territories Click Handler
    // --------------------------------------------------    
    private handleCreateDetectedTerritoriesClick =
        async () => {

            if (
                !this.territoryAnalysisPreview ||
                this.territoryAnalysis ===
                    null ||
                this.createTerritoriesHandler ===
                    null
            ) {
                return
            }

            const seeds =
                this.getIncludedTerritorySeeds()

            if (
                seeds.length === 0
            ) {

                this.ui.statusMessage.textContent =
                    'No hay territorios candidatos seleccionados'

                return
            }

            const result =
                this.createTerritoriesHandler(
                    seeds
                )

            this.clearTerritoryAnalysisState()

            this.updateUI()

            await this.restoreReferenceAfterAnalysis()

            if (
                result.created === 0
            ) {

                if (
                    result.existing > 0 &&
                    result.failed === 0
                ) {

                    this.ui.statusMessage.textContent =
                        'Todos los territorios detectados ya existían'

                    return
                }

                this.ui.statusMessage.textContent =
                    'No se pudo crear ningún territorio'

                return
            }

            let message =
                `${result.created} territorios creados`

            if (
                result.existing > 0
            ) {

                message +=
                    ` · ${result.existing} ya existentes`
            }

            if (
                result.failed > 0
            ) {

                message +=
                    ` · ${result.failed} no creados`
            }

            this.ui.statusMessage.textContent =
                message
        }

    
    private getIncludedTerritorySeeds():
        Point[] {

        if (
            this.territoryAnalysis ===
            null
        ) {
            return []
        }

        const analysis =
            this.territoryAnalysis

        const includedRegionIds =
            new Set<number>()

        for (
            const region of
            analysis.regions
        ) {

            if (
                this.excludedTerritoryRegionIds
                    .has(
                        region.id
                    )
            ) {
                continue
            }

            includedRegionIds.add(
                region.id
            )
        }

        const seedPixels =
            new Map<
                number,
                number
            >()

        /*
        * Buscamos un píxel interior para
        * cada región candidata.
        */
        for (
            let pixelIndex = 0;
            pixelIndex <
                analysis.labels.length;
            pixelIndex++
        ) {

            const regionId =
                analysis.labels[
                    pixelIndex
                ]

            if (
                !includedRegionIds.has(
                    regionId
                ) ||
                seedPixels.has(
                    regionId
                )
            ) {
                continue
            }

            seedPixels.set(
                regionId,
                pixelIndex
            )
        }

        const seeds:
            Point[] = []

        /*
        * Conservamos el mismo orden en el que
        * el analizador descubrió las regiones.
        */
        for (
            const region of
            analysis.regions
        ) {

            if (
                this.excludedTerritoryRegionIds
                    .has(
                        region.id
                    )
            ) {
                continue
            }

            const pixelIndex =
                seedPixels.get(
                    region.id
                )

            if (
                pixelIndex ===
                undefined
            ) {
                continue
            }

            seeds.push({
                x:
                    pixelIndex %
                    MAP_WIDTH,

                y:
                    Math.floor(
                        pixelIndex /
                        MAP_WIDTH
                    ),
            })
        }

        return seeds
    }
}