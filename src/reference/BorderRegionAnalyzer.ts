export type DetectedClosedRegion = {
    id: number
    area: number
}


export type BorderRegionAnalysis = {
    width: number
    height: number

    labels: Int32Array

    regions:
        DetectedClosedRegion[]
}


export function analyzeClosedRegions(
    borderPixels: Uint8ClampedArray,
    width: number,
    height: number,
    minimumArea = 20
): BorderRegionAnalysis {

    const pixelCount =
        width *
        height

    const labels =
        new Int32Array(
            pixelCount
        )

    /*
     * Cola reutilizable para todos los
     * flood fills.
     */
    const queue =
        new Int32Array(
            pixelCount
        )

    const regions:
        DetectedClosedRegion[] = []

    let nextComponentId =
        1


    const isBorder =
        (
            pixelIndex: number
        ) => {

            const alpha =
                borderPixels[
                    pixelIndex * 4 + 3
                ]

            return (
                alpha > 0
            )
        }


    for (
        let startIndex = 0;
        startIndex < pixelCount;
        startIndex++
    ) {

        if (
            labels[startIndex] !==
                0 ||
            isBorder(
                startIndex
            )
        ) {
            continue
        }

        const componentId =
            nextComponentId++

        let queueStart =
            0

        let queueEnd =
            0

        let area =
            0

        let touchesMapEdge =
            false

        queue[queueEnd++] =
            startIndex

        labels[startIndex] =
            componentId


        while (
            queueStart <
            queueEnd
        ) {

            const index =
                queue[queueStart++]

            const x =
                index %
                width

            const y =
                Math.floor(
                    index /
                    width
                )

            area++

            if (
                x === 0 ||
                y === 0 ||
                x === width - 1 ||
                y === height - 1
            ) {
                touchesMapEdge =
                    true
            }


            /*
             * Izquierda
             */
            if (
                x > 0
            ) {

                visitNeighbor(
                    index - 1
                )
            }


            /*
             * Derecha
             */
            if (
                x <
                width - 1
            ) {

                visitNeighbor(
                    index + 1
                )
            }


            /*
             * Arriba
             */
            if (
                y > 0
            ) {

                visitNeighbor(
                    index - width
                )
            }


            /*
             * Abajo
             */
            if (
                y <
                height - 1
            ) {

                visitNeighbor(
                    index + width
                )
            }
        }


        if (
            !touchesMapEdge &&
            area >= minimumArea
        ) {

            regions.push({
                id:
                    componentId,

                area,
            })
        }


        function visitNeighbor(
            neighborIndex: number
        ) {

            if (
                labels[neighborIndex] !==
                0
            ) {
                return
            }

            if (
                isBorder(
                    neighborIndex
                )
            ) {
                return
            }

            labels[neighborIndex] =
                componentId

            queue[queueEnd++] =
                neighborIndex
        }
    }


    return {
        width,
        height,
        labels,
        regions,
    }
}