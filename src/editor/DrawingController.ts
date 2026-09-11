import type {
    DrawingTool,
    Point,
    StrokeCommand,
} from '../types/editor'


export class DrawingController {

    private canvas: HTMLCanvasElement
    private context: CanvasRenderingContext2D

    private drawing = false

    private lastX = 0
    private lastY = 0

    private currentStroke: StrokeCommand | null = null

    private pixelCache: Uint8ClampedArray | null = null
    private pixelsDirty = true

    constructor(
        canvas: HTMLCanvasElement
    ) {

        this.canvas = canvas

        const context =
        canvas.getContext('2d')


        if (context === null) {
            throw new Error(
                `No se pudo obtener el contexto 2D de #${canvas.id}`
            )
        }


        this.context = context
    }


    // --------------------------------------------------
    // ESTADO
    // --------------------------------------------------

    public get isDrawing(): boolean {
        return this.drawing
    }


    // --------------------------------------------------
    // COMENZAR TRAZO
    // --------------------------------------------------

    public startStroke(
        x: number,
        y: number,
        tool: DrawingTool,
        brushSize: number
    ) {

        this.drawing = true

        this.lastX = x
        this.lastY = y


        this.currentStroke = {
        type: 'stroke',

        tool,

        brushSize,

        points: [
            {
                x,
                y,
            },
        ],
    }


        /*
        * Esto permite que un solo click
        * también deje un punto.
        */
        this.drawPoint(
            x,
            y,
            tool,
            brushSize
        )
    }


    // --------------------------------------------------
    // CONTINUAR TRAZO
    // --------------------------------------------------

    public continueStroke(
        x: number,
        y: number
    ) {

        if (
        !this.drawing ||
        this.currentStroke === null
        ) {
        return
        }


        const previousPoint: Point = {
            x: this.lastX,
            y: this.lastY,
        }


        const newPoint: Point = {
            x,
            y,
        }


        this.drawSegment(
            previousPoint,
            newPoint,
            this.currentStroke.tool,
            this.currentStroke.brushSize
        )


        this.currentStroke.points.push(
            newPoint
        )


        this.lastX = x
        this.lastY = y
    }


    // --------------------------------------------------
    // TERMINAR TRAZO
    // --------------------------------------------------

    public endStroke(): StrokeCommand | null {

        if (
            !this.drawing ||
            this.currentStroke === null
        ) {

            this.drawing = false
            this.currentStroke = null

            return null
        }


        const completedStroke =
            this.currentStroke


        this.drawing = false
        this.currentStroke = null


        return completedStroke
    }


    // --------------------------------------------------
    // CANCELAR TRAZO
    // --------------------------------------------------

    public cancelStroke() {

        this.drawing = false

        this.currentStroke = null
    }


    // --------------------------------------------------
    // LIMPIAR FRONTERAS
    // --------------------------------------------------

    public clear() {

        this.context.clearRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        )

        this.markPixelsDirty()
    }


    // --------------------------------------------------
    // RECONSTRUIR UN TRAZO
    // --------------------------------------------------

    public renderStroke(
        command: StrokeCommand
    ) {

        if (
            command.points.length === 0
        ) {
            return
        }


        if (
            command.points.length === 1
        ) {

            const point =
                command.points[0]


            this.drawPoint(
                point.x,
                point.y,
                command.tool,
                command.brushSize
            )

            return
        }


        for (
            let i = 1;
            i < command.points.length;
            i++
        ) {

            this.drawSegment(
                command.points[i - 1],
                command.points[i],
                command.tool,
                command.brushSize
            )
        }
    }


    // --------------------------------------------------
    // OBTENER PÍXELES DE LAS FRONTERAS
    // --------------------------------------------------

    public getPixels(): Uint8ClampedArray {

        if (
            this.pixelCache !== null &&
            !this.pixelsDirty
        ) {
            return this.pixelCache
        }

        this.pixelCache =
            this.context.getImageData(
                0,
                0,
                this.canvas.width,
                this.canvas.height
            ).data

        this.pixelsDirty = false

        return this.pixelCache
    }

    private markPixelsDirty() {

        this.pixelsDirty = true
    }

    // --------------------------------------------------
    // CONFIGURAR MODO DE DIBUJO
    // --------------------------------------------------

    private configureDrawingMode(
        tool: DrawingTool
    ) {

        if (tool === 'pencil') {

            this.context.globalCompositeOperation =
                'source-over'


            this.context.strokeStyle =
                '#000000'


            this.context.fillStyle =
                '#000000'
        }

        else {

            /*
            * Borramos realmente píxeles
            * de la capa transparente.
            */
            this.context.globalCompositeOperation =
                'destination-out'
        }
    }


    // --------------------------------------------------
    // DIBUJAR PUNTO
    // --------------------------------------------------

    private drawPoint(
        x: number,
        y: number,
        tool: DrawingTool,
        brushSize: number
    ) {

        this.configureDrawingMode(
            tool
        )

        this.context.beginPath()

        this.context.arc(
            x,
            y,
            brushSize / 2,
            0,
            Math.PI * 2
        )

        this.context.fill()
        this.markPixelsDirty()
    }


    // --------------------------------------------------
    // DIBUJAR SEGMENTO
    // --------------------------------------------------

    private drawSegment(
        from: Point,
        to: Point,
        tool: DrawingTool,
        brushSize: number
    ) {

        this.configureDrawingMode(
            tool
        )

        this.context.beginPath()

        this.context.moveTo(
            from.x,
            from.y
        )

        this.context.lineTo(
            to.x,
            to.y
        )

        this.context.lineWidth =
            brushSize

        this.context.lineCap =
            'round'

        this.context.lineJoin =
            'round'

        this.context.stroke()
        this.markPixelsDirty()
    }


    // --------------------------------------------------
    // EXPORTAR FRONTERAS
    // --------------------------------------------------

    public exportImage(): string {

        return this.canvas.toDataURL(
            'image/png'
        )
    }


    // --------------------------------------------------
    // IMPORTAR FRONTERAS
    // --------------------------------------------------

    public async importImage(
        dataUrl: string
    ): Promise<void> {

        const image =
            new Image()


        await new Promise<void>(
            (
                resolve,
                reject
            ) => {

                image.onload =
                    () => resolve()


                image.onerror =
                    () => {

                        reject(
                            new Error(
                                'No se pudo cargar la imagen de fronteras'
                            )
                        )
                    }


                image.src =
                    dataUrl
            }
        )


        this.context.save()


        /*
        * Es importante porque el último
        * modo utilizado podría haber sido
        * destination-out por el borrador.
        */
        this.context.globalCompositeOperation =
            'source-over'


        this.context.clearRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        )


        this.context.drawImage(
            image,
            0,
            0,
            this.canvas.width,
            this.canvas.height
        )


        this.context.restore()


        this.markPixelsDirty()
    }
}