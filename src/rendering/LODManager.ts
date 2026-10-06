export type MapLOD =
    | 'overview'
    | 'political'
    | 'detail'


export class LODManager {

    private currentLevel:
        MapLOD = 'political'


    public get current():
        MapLOD {

        return this.currentLevel
    }

    public resolve(
        zoom: number
    ): MapLOD {

        /*
         * Usamos histéresis.
         *
         * Eso evita:
         *
         * 0.79 → overview
         * 0.80 → political
         * 0.79 → overview
         *
         * mientras el zoom está animándose.
         */

        if (
            this.currentLevel ===
            'overview'
        ) {

            if (
                zoom > 0.82
            ) {

                this.currentLevel =
                    'political'
            }

            return this.currentLevel
        }

        if (
            this.currentLevel ===
            'political'
        ) {

            if (
                zoom < 0.72
            ) {

                this.currentLevel =
                    'overview'
            }
            else if (
                zoom > 1.70
            ) {

                this.currentLevel =
                    'detail'
            }

            return this.currentLevel
        }

        /*
         * DETAIL
         */

        if (
            zoom < 1.55
        ) {

            this.currentLevel =
                'political'
        }

        return this.currentLevel
    }
}