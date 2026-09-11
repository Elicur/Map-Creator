import type {
    RGBColor,
} from '../types/editor'

export class TerritoryPreviewController {

    private context: CanvasRenderingContext2D
    private imageData: ImageData


    constructor(
        canvas: HTMLCanvasElement
    ) {

        const context =
            canvas.getContext('2d')


        if (context === null) {
            throw new Error(
                `No se pudo obtener el contexto 2D de #${canvas.id}`
            )
        }


        this.context = context

        this.imageData =
            context.createImageData(
                canvas.width,
                canvas.height
            )
    }


    // --------------------------------------------------
    // MOSTRAR REGIÓN
    // --------------------------------------------------

    public showRegion(
        pixels: Int32Array,
        color: RGBColor,
        alpha = 100
    ) {

        const data =
            this.imageData.data


        data.fill(0)


        for (
            let i = 0;
            i < pixels.length;
            i++
        ) {

            const imageIndex =
                pixels[i] * 4


            data[
                imageIndex
            ] = color.r

            data[
                imageIndex + 1
            ] = color.g

            data[
                imageIndex + 2
            ] = color.b

            data[
                imageIndex + 3
            ] = alpha
        }


        this.context.putImageData(
            this.imageData,
            0,
            0
        )
    }


    // --------------------------------------------------
    // LIMPIAR
    // --------------------------------------------------

    public clear() {

        this.imageData.data.fill(
            0
        )


        this.context.putImageData(
            this.imageData,
            0,
            0
        )
    }
}