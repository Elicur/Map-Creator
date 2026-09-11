export class TerritoryControlManager {

    private territoryCountries =
        new Map<number, number>()


    // --------------------------------------------------
    // ASIGNAR
    // --------------------------------------------------

    public assign(
        territoryId: number,
        countryId: number | null
    ) {

        if (countryId === null) {

            this.territoryCountries.delete(
                territoryId
            )

            return
        }


        this.territoryCountries.set(
            territoryId,
            countryId
        )
    }


    // --------------------------------------------------
    // CONSULTAR
    // --------------------------------------------------

    public getCountryId(
        territoryId: number
    ): number | null {

        return (
            this.territoryCountries.get(
                territoryId
            )
            ?? null
        )
    }


    // --------------------------------------------------
    // RESET
    // --------------------------------------------------

    public reset() {

        this.territoryCountries.clear()
    }


    // --------------------------------------------------
    // TERRITORIOS DE UN PAÍS
    // --------------------------------------------------

    public getTerritoryIdsByCountryId(
        countryId: number
    ): number[] {

        const territoryIds: number[] = []


        for (
            const [
                territoryId,
                assignedCountryId,
            ] of this.territoryCountries
        ) {

            if (
                assignedCountryId ===
                countryId
            ) {

                territoryIds.push(
                    territoryId
                )
            }
        }


        return territoryIds
    }

    
    // --------------------------------------------------
    // OBTENER TODAS LAS ASIGNACIONES
    // --------------------------------------------------
    public getAllAssignments(): {
        territoryId: number
        countryId: number
    }[] {

        return Array.from(
            this.territoryCountries.entries()
        ).map(
            (
                [
                    territoryId,
                    countryId,
                ]
            ) => ({
                territoryId,
                countryId,
            })
        )
    }
}