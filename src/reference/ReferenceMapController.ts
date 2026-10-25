import {
    MAP_WIDTH,
    MAP_HEIGHT,
} from '../config/mapConfig'

import type {
    EditorUI,
} from '../ui/createUI'


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

        this.ui.referenceMapButton.disabled =
            !this.editingEnabled

        this.ui.referenceOpacityInput.disabled =
            !this.editingEnabled ||
            !hasReference

        this.ui.removeReferenceMapButton.disabled =
            !this.editingEnabled ||
            !hasReference

        this.ui.detectReferenceBordersButton.disabled =
            !this.editingEnabled ||
            !hasReference

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

        this.opacity =
            0.6

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
}