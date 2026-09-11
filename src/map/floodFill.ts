type FindClosedRegionOptions = {
    startX: number
    startY: number

    width: number
    height: number

    territoryIds: Uint32Array

    borderPixels: Uint8ClampedArray
}


function isBorderPixel(
    pixelIndex: number,
    borderPixels: Uint8ClampedArray
) {

    /*
    * ImageData usa 4 valores por píxel:
    *
    * R G B A
    *
    * Nos interesa Alpha.
    */

    const alphaIndex =
        pixelIndex * 4 + 3


    return (
        borderPixels[alphaIndex] > 10
    )
}


export function findClosedRegion(
    options: FindClosedRegionOptions
): Int32Array | null {

    const {
        startX,
        startY,
        width,
        height,
        territoryIds,
        borderPixels,
    } = options


    const totalPixels =
        width * height


    const startIndex =
        startY * width +
        startX


    /*
    * Si ya pertenece a un territorio,
    * no podemos crear otro encima.
    */

    if (
        territoryIds[startIndex] !== 0
    ) {
        return null
    }


    /*
    * Tampoco podemos comenzar encima
    * de una frontera.
    */

    if (
        isBorderPixel(
        startIndex,
        borderPixels
        )
    ) {
        return null
    }


    const queue =
        new Int32Array(
            totalPixels
        )


    const visited =
        new Uint8Array(
            totalPixels
        )


    let head = 0
    let tail = 0


    queue[tail++] =
        startIndex


    visited[startIndex] =
        1


    function addPixel(
        index: number
    ) {

        if (
            index < 0 ||
            index >= totalPixels
        ) {
            return
        }


        if (
            visited[index] !== 0
        ) {
            return
        }


        if (
            territoryIds[index] !== 0
        ) {
            return
        }


        if (
            isBorderPixel(
                index,
                borderPixels
            )
        ) {
            return
        }


        visited[index] =
            1


        queue[tail++] =
            index
    }


    while (
            head < tail
    ) {

        const index =
            queue[head++]


        const x =
            index % width


        const y =
            Math.floor(
                index / width
            )


        /*
        * Si alcanzamos el límite exterior,
        * la región no estaba cerrada.
        */

        if (
            x === 0 ||
            y === 0 ||
            x === width - 1 ||
            y === height - 1
        ) {

            return null
        }


        addPixel(
            index - 1
        )


        addPixel(
            index + 1
        )


        addPixel(
            index - width
        )


        addPixel(
            index + width
        )
    }


    return queue.slice(
        0,
        tail
    )
}