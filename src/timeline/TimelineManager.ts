import type {
    TimelineDate,
    TimelineEvent,
    TimelineTerritoryControl,
    TerritoryLineage,
    TerritoryOwnerChangedEvent,
} from './timelineTypes'


export class TimelineManager {

    private initialDate: TimelineDate = {
        year: 0,
        month: 1,
    }

    private currentDate: TimelineDate = {
        year: 0,
        month: 1,
    }

    private initialTerritoryControl =
        new Map<number, number | null>()

    private events:
        TimelineEvent[] = []

    private territoryLineages =
        new Map<number, TerritoryLineage>()

    private nextEventId = 1


    // --------------------------------------------------
    // AÑO INICIAL
    // --------------------------------------------------

    public get startYear(): number {

        return this.initialDate.year
    }


    // --------------------------------------------------
    // FECHA ACTUAL
    // --------------------------------------------------
    public get date(): TimelineDate {

        return {
            ...this.currentDate,
        }
    }

    // --------------------------------------------------
    // AÑO ACTUAL
    // --------------------------------------------------

    public get year(): number {

        return this.currentDate.year
    }


    // --------------------------------------------------
    // MES ACTUAL
    // --------------------------------------------------

    public get month(): number {

        return this.currentDate.month
    }


    // --------------------------------------------------
    // CAMBIAR AÑO ACTUAL
    // --------------------------------------------------

    public setYear(
        year: number
    ) {

        if (
            !Number.isInteger(
                year
            )
        ) {

            throw new Error(
                'El año debe ser un número entero'
            )
        }

        this.setDate({
            year,
            month:
                this.currentDate.month,
        })
    }


    // --------------------------------------------------
    // SETEAR FECHA
    // --------------------------------------------------
    public setDate(
        date: TimelineDate
    ) {

        this.validateDate(
            date
        )

        this.currentDate = {
            ...date,
        }
    }

    // --------------------------------------------------
    // ESTABLECER ESTADO POLÍTICO INICIAL
    // --------------------------------------------------

    public setInitialState(
        date: TimelineDate,
        territoryControl:
            TimelineTerritoryControl[]
    ) {

        this.validateDate(
            date
        )

        this.initialDate = {
            ...date,
        }

        this.currentDate = {
            ...date,
        }

        this.initialTerritoryControl.clear()

        for (
            const control of
            territoryControl
        ) {

            if (
                !Number.isInteger(
                    control.territoryId
                ) ||
                control.territoryId <= 0
            ) {

                throw new Error(
                    'ID de territorio inválido'
                )
            }

            if (
                control.countryId !== null &&
                (
                    !Number.isInteger(
                        control.countryId
                    ) ||
                    control.countryId <= 0
                )
            ) {

                throw new Error(
                    'ID de país inválido'
                )
            }

            this.initialTerritoryControl.set(
                control.territoryId,
                control.countryId
            )
        }

        /*
         * Un nuevo estado inicial representa
         * una nueva historia.
         */
        this.events = []

        this.territoryLineages.clear()

        this.nextEventId = 1
    }


    // --------------------------------------------------
    // AGREGAR CAMBIO DE PROPIETARIO
    // --------------------------------------------------

    public addTerritoryOwnerChangedEvent(
        date: TimelineDate,
        territoryId: number,
        countryId: number | null
    ): TerritoryOwnerChangedEvent {

        this.validateDate(
            date
        )

        if (
            !Number.isInteger(
                territoryId
            ) ||
            territoryId <= 0
        ) {

            throw new Error(
                'ID de territorio inválido'
            )
        }

        if (
            countryId !== null &&
            (
                !Number.isInteger(
                    countryId
                ) ||
                countryId <= 0
            )
        ) {

            throw new Error(
                'ID de país inválido'
            )
        }

        const event:
            TerritoryOwnerChangedEvent = {

            id:
                this.nextEventId++,

            type:
                'territory-owner-changed',

            date: {
                ...date,
            },

            territoryId,

            countryId,
        }

        this.events.push(
            event
        )

        return {
            ...event,

            date: {
                ...event.date,
            },
        }
    }


    // --------------------------------------------------
    // ELIMINAR EVENTO
    // --------------------------------------------------

    public deleteEvent(
        eventId: number
    ): boolean {

        const index =
            this.events.findIndex(
                event =>
                    event.id ===
                    eventId
            )

        if (
            index === -1
        ) {
            return false
        }

        this.events.splice(
            index,
            1
        )

        return true
    }


    // --------------------------------------------------
    // ESTADO POLÍTICO EN UN AÑO
    // --------------------------------------------------

    public getStateAt(
        date: TimelineDate
    ): Map<number, number | null> {

        this.validateDate(
            date
        )

        const territoryIds =
            new Set<number>()

        /*
        * Territorios que existían en
        * el estado inicial.
        */
        for (
            const territoryId of
            this.initialTerritoryControl.keys()
        ) {

            territoryIds.add(
                territoryId
            )
        }

        /*
        * Territorios mencionados por eventos.
        */
        for (
            const event of
            this.events
        ) {

            territoryIds.add(
                event.territoryId
            )
        }

        /*
        * Territorios creados mediante
        * divisiones y sus padres.
        */
        for (
            const lineage of
            this.territoryLineages.values()
        ) {

            territoryIds.add(
                lineage.territoryId
            )

            territoryIds.add(
                lineage.parentTerritoryId
            )
        }

        const state =
            new Map<number, number | null>()

        for (
            const territoryId of
            territoryIds
        ) {

            const countryId =
                this.resolveTerritoryOwnerAt(
                    territoryId,
                    date,
                    new Set<number>()
                )

            state.set(
                territoryId,
                countryId
            )
        }

        return state
    }


    // --------------------------------------------------
    // PROPIETARIO DE TERRITORIO EN UN AÑO
    // --------------------------------------------------

    public getTerritoryOwnerAt(
        territoryId: number,
        date: TimelineDate
    ): number | null {

        this.validateDate(
            date
        )

        return this.resolveTerritoryOwnerAt(
            territoryId,
            date,
            new Set<number>()
        )
    }


    // --------------------------------------------------
    // RESOLVER PROPIETARIO DE TERRITORIO
    // --------------------------------------------------
    private resolveTerritoryOwnerAt(
        territoryId: number,
        date: TimelineDate,
        visitedTerritoryIds: Set<number>
    ): number | null {

        if (
            visitedTerritoryIds.has(
                territoryId
            )
        ) {

            throw new Error(
                'Se detectó un ciclo en el linaje territorial'
            )
        }

        const visited =
            new Set(
                visitedTerritoryIds
            )

        visited.add(
            territoryId
        )

        const lineage =
            this.territoryLineages.get(
                territoryId
            )

        // --------------------------------
        // TERRITORIO CON PADRE
        // --------------------------------

        if (
            lineage !== undefined
        ) {

            const comparedWithSplit =
                this.compareDates(
                    date,
                    lineage.splitDate
                )

            /*
            * Antes de la división, la región
            * que hoy conocemos como este
            * territorio sigue exactamente
            * la historia de su padre.
            */
            if (
                comparedWithSplit < 0
            ) {

                return this.resolveTerritoryOwnerAt(
                    lineage.parentTerritoryId,
                    date,
                    visited
                )
            }

            /*
            * Desde la fecha de división
            * buscamos eventos propios del hijo.
            *
            * Un evento en la misma fecha
            * de la división también es válido.
            */
            const ownEvent =
                this.findLatestTerritoryOwnerEvent(
                    territoryId,
                    date,
                    lineage.splitDate
                )

            if (
                ownEvent !== null
            ) {

                return ownEvent.countryId
            }

            /*
            * Si todavía no tuvo ningún evento
            * propio, conserva el propietario
            * que tenía el padre exactamente
            * al dividirse.
            */
            return this.resolveTerritoryOwnerAt(
                lineage.parentTerritoryId,
                lineage.splitDate,
                visited
            )
        }

        // --------------------------------
        // TERRITORIO SIN PADRE
        // --------------------------------

        const latestEvent =
            this.findLatestTerritoryOwnerEvent(
                territoryId,
                date,
                null
            )

        if (
            latestEvent !== null
        ) {

            return latestEvent.countryId
        }

        return (
            this.initialTerritoryControl.get(
                territoryId
            )
            ?? null
        )
    }


    // --------------------------------------------------
    // BUSCAR ÚLTIMO EVENTO DE PROPIETARIO DE TERRITORIO
    // --------------------------------------------------
    private findLatestTerritoryOwnerEvent(
        territoryId: number,
        upToDate: TimelineDate,
        fromDate: TimelineDate | null
    ): TerritoryOwnerChangedEvent | null {

        let latest:
            TerritoryOwnerChangedEvent | null =
            null

        for (
            const event of
            this.events
        ) {

            if (
                event.type !==
                'territory-owner-changed'
            ) {
                continue
            }

            if (
                event.territoryId !==
                territoryId
            ) {
                continue
            }

            /*
            * Evento posterior a la fecha
            * que estamos consultando.
            */
            if (
                this.compareDates(
                    event.date,
                    upToDate
                ) > 0
            ) {
                continue
            }

            /*
            * En un territorio hijo ignoramos
            * cualquier evento anterior a su
            * fecha de nacimiento.
            */
            if (
                fromDate !== null &&
                this.compareDates(
                    event.date,
                    fromDate
                ) < 0
            ) {
                continue
            }

            if (
                latest === null
            ) {

                latest =
                    event

                continue
            }

            const dateDifference =
                this.compareDates(
                    event.date,
                    latest.date
                )

            if (
                dateDifference > 0 ||
                (
                    dateDifference === 0 &&
                    event.id >
                    latest.id
                )
            ) {

                latest =
                    event
            }
        }

        return latest
    }

    // --------------------------------------------------
    // EVENTOS
    // --------------------------------------------------

    public getEvents():
        TimelineEvent[] {

        return this.events.map(
            event => ({
                ...event,

                date: {
                    ...event.date,
                },
            })
        )
    }


    // --------------------------------------------------
    // EVENTOS DE UN AÑO
    // --------------------------------------------------

    public getEventsAt(
        date: TimelineDate
    ): TimelineEvent[] {

        return this.events
            .filter(
                event =>
                    this.compareDates(
                        event.date,
                        date
                    ) === 0
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    a.id -
                    b.id
            )
            .map(
                event => ({
                    ...event,

                    date: {
                        ...event.date,
                    },
                })
            )
    }


    // --------------------------------------------------
    // RESET
    // --------------------------------------------------

    public reset() {

        this.initialDate = {
            year: 0,
            month: 1,
        }

        this.currentDate = {
            year: 0,
            month: 1,
        }

        this.initialTerritoryControl.clear()

        this.events = []

        this.territoryLineages.clear()

        this.nextEventId = 1
    }


    // --------------------------------------------------
    // VALIDACIÓN DE FECHA
    // --------------------------------------------------
    private validateDate(
        date: TimelineDate
    ) {

        if (
            !Number.isInteger(
                date.year
            )
        ) {

            throw new Error(
                'El año debe ser un número entero'
            )
        }

        if (
            !Number.isInteger(
                date.month
            ) ||
            date.month < 1 ||
            date.month > 12
        ) {

            throw new Error(
                'El mes debe estar entre 1 y 12'
            )
        }
    }


    // --------------------------------------------------
    // COMPARACIÓN DE FECHAS
    // --------------------------------------------------
    private compareDates(
        a: TimelineDate,
        b: TimelineDate
    ): number {

        if (
            a.year !==
            b.year
        ) {

            return (
                a.year -
                b.year
            )
        }

        return (
            a.month -
            b.month
        )
    }


    // --------------------------------------------------
    // REGISTRAR LINAGE DE TERRITORIO
    // --------------------------------------------------
    public registerTerritorySplit(
        territoryId: number,
        parentTerritoryId: number,
        splitDate: TimelineDate
    ) {

        if (
            !Number.isInteger(
                territoryId
            ) ||
            territoryId <= 0
        ) {

            throw new Error(
                'ID de territorio hijo inválido'
            )
        }

        if (
            !Number.isInteger(
                parentTerritoryId
            ) ||
            parentTerritoryId <= 0
        ) {

            throw new Error(
                'ID de territorio padre inválido'
            )
        }

        if (
            territoryId ===
            parentTerritoryId
        ) {

            throw new Error(
                'Un territorio no puede ser su propio padre'
            )
        }

        this.validateDate(
            splitDate
        )

        /*
        * Si ya existe exactamente este linaje,
        * no hacemos nada.
        *
        * Esto nos ayuda a que la operación sea
        * idempotente.
        */
        const existing =
            this.territoryLineages.get(
                territoryId
            )

        if (
            existing !== undefined
        ) {

            const sameParent =
                existing.parentTerritoryId ===
                parentTerritoryId

            const sameDate =
                this.compareDates(
                    existing.splitDate,
                    splitDate
                ) === 0

            if (
                sameParent &&
                sameDate
            ) {
                return
            }

            throw new Error(
                `El territorio ${territoryId} ya tiene otro linaje`
            )
        }

        /*
        * Protección contra ciclos:
        *
        * T1 → T2 → T3 → T1
        */
        let ancestorId =
            parentTerritoryId

        while (true) {

            if (
                ancestorId ===
                territoryId
            ) {

                throw new Error(
                    'El linaje territorial generaría un ciclo'
                )
            }

            const ancestor =
                this.territoryLineages.get(
                    ancestorId
                )

            if (
                ancestor === undefined
            ) {
                break
            }

            ancestorId =
                ancestor.parentTerritoryId
        }

        this.territoryLineages.set(
            territoryId,
            {
                territoryId,

                parentTerritoryId,

                splitDate: {
                    ...splitDate,
                },
            }
        )
    }


    // --------------------------------------------------
    // OBTENER LINAGE DE TERRITORIOS
    // --------------------------------------------------
    public getTerritoryLineages():
        TerritoryLineage[] {

        return Array
            .from(
                this.territoryLineages.values()
            )
            .map(
                lineage => ({
                    ...lineage,

                    splitDate: {
                        ...lineage.splitDate,
                    },
                })
            )
    }


    // --------------------------------------------------
    // ELIMINAR LINAGE DE TERRITORIO
    // --------------------------------------------------
    public removeTerritoryLineage(
        territoryId: number
    ): boolean {

        return this.territoryLineages.delete(
            territoryId
        )
    }
}