import {
    MAP_WIDTH,
    MAP_HEIGHT,
} from '../config/mapConfig'

import type {
    EditorUI,
} from '../ui/createUI'


export class ReferenceMapController {

    private readonly ui:
        EditorUI

    private readonly canvas:
        HTMLCanvasElement

    private readonly context:
        CanvasRenderingContext2D

    private imageDataUrl:
        string | null = null

    private opacity =
        0.6

    private changeHandler:
        (() => void) | null =
        null

    private editingEnabled =
        true

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

        this.imageDataUrl =
            null

        this.updateUI()
    }


    public setEditingEnabled(
        enabled: boolean
    ) {

        this.editingEnabled =
            enabled

        this.updateUI()
    }
}