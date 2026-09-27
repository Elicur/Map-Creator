import type {
    TimelineDate,
    TimelineEvent,
    TimelineTerritoryControl,
    TerritoryOwnerChangedEvent,
    TerritorySplitEvent,
} from './timelineTypes'


type TimelinePosition = {
    date: TimelineDate
    eventId: number
}


export class TimelineManager {

    private initialDate:
        TimelineDate = {
            year: 0,
            month: 1,
        }

    private currentDate:
        TimelineDate = {
            year: 0,
            month: 1,
        }

    private initialTerritoryControl =
        new Map<
            number,
            number | null
        >()

    private events:
        TimelineEvent[] = []

    private nextEventId =
        1


    // --------------------------------------------------
    // FECHA
    // --------------------------------------------------

    public get startYear():
        number {

        return this.initialDate.year
    }


    public get year():
        number {

        return this.currentDate.year
    }


    public get month():
        number {

        return this.currentDate.month
    }


    public get date():
        TimelineDate {

        return {
            year:
                this.currentDate.year,

            month:
                this.currentDate.month,
        }
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
                'El año del timeline debe ser entero'
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
                'El mes del timeline debe estar entre 1 y 12'
            )
        }
    }


    // --------------------------------------------------
    // COMPARAR FECHAS
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
    // COMPARAR POSICIONES
    // --------------------------------------------------

    private comparePositions(
        a: TimelinePosition,
        b: TimelinePosition
    ): number {

        const dateCompare =
            this.compareDates(
                a.date,
                b.date
            )

        if (
            dateCompare !== 0
        ) {
            return dateCompare
        }

        return (
            a.eventId -
            b.eventId
        )
    }


    private getEventPosition(
        event: TimelineEvent
    ): TimelinePosition {

        return {
            date:
                event.date,

            eventId:
                event.id,
        }
    }


    // --------------------------------------------------
    // FECHA ACTUAL
    // --------------------------------------------------

    public setDate(
        date: TimelineDate
    ) {

        this.validateDate(
            date
        )

        this.currentDate = {
            year:
                date.year,

            month:
                date.month,
        }
    }

    public setYear(
        year: number
    ) {

        this.setDate({
            year,

            month:
                this.currentDate.month,
        })
    }


    // --------------------------------------------------
    // ESTADO INICIAL
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
            year:
                date.year,

            month:
                date.month,
        }

        this.currentDate = {
            year:
                date.year,

            month:
                date.month,
        }

        this.initialTerritoryControl
            .clear()


        for (
            const item of
            territoryControl
        ) {

            this.initialTerritoryControl
                .set(
                    item.territoryId,
                    item.countryId
                )
        }

        this.events = []

        this.nextEventId =
            1
    }


    // --------------------------------------------------
    // EVENTO: CAMBIO DE PROPIETARIO
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
            territoryId <= 0
        ) {

            throw new Error(
                'El territorio del evento debe ser válido'
            )
        }

        const event:
            TerritoryOwnerChangedEvent = {

            id:
                this.nextEventId++,

            type:
                'territory-owner-changed',

            date: {
                year:
                    date.year,

                month:
                    date.month,
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
    // EVENTO: DIVISIÓN DE TERRITORIO
    // --------------------------------------------------

    public addTerritorySplitEvent(
        date: TimelineDate,
        parentTerritoryId: number,
        newTerritoryId: number
    ): TerritorySplitEvent {

        this.validateDate(
            date
        )


        if (
            parentTerritoryId <= 0 ||
            newTerritoryId <= 0
        ) {

            throw new Error(
                'Los territorios de la división deben ser válidos'
            )
        }

        if (
            parentTerritoryId ===
            newTerritoryId
        ) {

            throw new Error(
                'Un territorio no puede dividirse desde sí mismo'
            )
        }

        /*
         * Un territorio nuevo solo puede
         * tener un origen histórico.
         */
        if (
            this.getSplitEventForChild(
                newTerritoryId
            ) !== null
        ) {

            throw new Error(
                `El territorio ${newTerritoryId} ya tiene un evento de división`
            )
        }

        /*
         * Prevenir ciclos:
         *
         * T1 -> T2
         * T2 -> T3
         * T3 -> T1   ❌
         */
        let currentTerritoryId =
            parentTerritoryId


        const visited =
            new Set<number>()


        while (
            currentTerritoryId > 0
        ) {

            if (
                currentTerritoryId ===
                newTerritoryId
            ) {

                throw new Error(
                    'La división generaría un ciclo de territorios'
                )
            }

            if (
                visited.has(
                    currentTerritoryId
                )
            ) {

                throw new Error(
                    'Se detectó un ciclo en el linaje territorial'
                )
            }

            visited.add(
                currentTerritoryId
            )

            const parentSplit =
                this.getSplitEventForChild(
                    currentTerritoryId
                )

            if (
                parentSplit === null
            ) {
                break
            }

            currentTerritoryId =
                parentSplit.parentTerritoryId
        }

        const event:
            TerritorySplitEvent = {

            id:
                this.nextEventId++,

            type:
                'territory-split',

            date: {
                year:
                    date.year,

                month:
                    date.month,
            },

            parentTerritoryId,

            newTerritoryId,
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
    // BUSCAR DIVISIÓN DE UN TERRITORIO
    // --------------------------------------------------

    private getSplitEventForChild(
        territoryId: number
    ): TerritorySplitEvent | null {

        for (
            const event of
            this.events
        ) {

            if (
                event.type ===
                    'territory-split' &&
                event.newTerritoryId ===
                    territoryId
            ) {

                return event
            }
        }

        return null
    }


    // --------------------------------------------------
    // ÚLTIMO CAMBIO DE PROPIETARIO
    // --------------------------------------------------

    private findLatestOwnerEvent(
        territoryId: number,
        position: TimelinePosition,
        afterPosition:
            TimelinePosition | null
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

            const eventPosition =
                this.getEventPosition(
                    event
                )

            /*
             * El evento ocurre después
             * del instante solicitado.
             */
            if (
                this.comparePositions(
                    eventPosition,
                    position
                ) > 0
            ) {
                continue
            }

            /*
             * Para territorios hijos,
             * ignoramos eventos anteriores
             * o iguales a su división.
             */
            if (
                afterPosition !== null &&
                this.comparePositions(
                    eventPosition,
                    afterPosition
                ) <= 0
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

            if (
                this.comparePositions(
                    eventPosition,
                    this.getEventPosition(
                        latest
                    )
                ) > 0
            ) {

                latest =
                    event
            }
        }

        return latest
    }


    // --------------------------------------------------
    // RESOLVER PROPIETARIO
    // --------------------------------------------------

    private resolveTerritoryOwnerAtPosition(
        territoryId: number,
        position: TimelinePosition,
        resolving:
            Set<number>
    ): number | null {

        if (
            resolving.has(
                territoryId
            )
        ) {

            throw new Error(
                'Se detectó un ciclo resolviendo el timeline'
            )
        }

        resolving.add(
            territoryId
        )

        const splitEvent =
            this.getSplitEventForChild(
                territoryId
            )

        // --------------------------------
        // TERRITORIO CON PADRE
        // --------------------------------

        if (
            splitEvent !== null
        ) {

            const splitPosition =
                this.getEventPosition(
                    splitEvent
                )

            /*
             * Antes de la división, como por
             * ahora la geometría es estática,
             * el territorio hijo visualmente
             * existe y sigue al padre.
             */
            if (
                this.comparePositions(
                    position,
                    splitPosition
                ) < 0
            ) {

                const owner =
                    this.resolveTerritoryOwnerAtPosition(
                        splitEvent.parentTerritoryId,
                        position,
                        resolving
                    )

                resolving.delete(
                    territoryId
                )

                return owner
            }

            /*
             * En el instante de división,
             * hereda exactamente el estado
             * que tenía el padre justo antes
             * del evento.
             *
             * Los IDs determinan el orden de
             * eventos dentro de la misma fecha.
             */
            const beforeSplit:
                TimelinePosition = {

                date:
                    splitEvent.date,

                eventId:
                    splitEvent.id - 1,
            }

            const inheritedOwner =
                this.resolveTerritoryOwnerAtPosition(
                    splitEvent.parentTerritoryId,
                    beforeSplit,
                    resolving
                )

            /*
             * Después de dividirse, solamente
             * sus propios eventos posteriores
             * pueden modificarlo.
             */
            const ownEvent =
                this.findLatestOwnerEvent(
                    territoryId,
                    position,
                    splitPosition
                )

            resolving.delete(
                territoryId
            )

            if (
                ownEvent !== null
            ) {
                return ownEvent.countryId
            }

            return inheritedOwner
        }

        // --------------------------------
        // TERRITORIO RAÍZ
        // --------------------------------

        const ownEvent =
            this.findLatestOwnerEvent(
                territoryId,
                position,
                null
            )

        resolving.delete(
            territoryId
        )

        if (
            ownEvent !== null
        ) {
            return ownEvent.countryId
        }

        return (
            this.initialTerritoryControl
                .get(
                    territoryId
                )
            ?? null
        )
    }


    // --------------------------------------------------
    // PROPIETARIO EN FECHA
    // --------------------------------------------------

    public getTerritoryOwnerAt(
        territoryId: number,
        date: TimelineDate
    ): number | null {

        this.validateDate(
            date
        )

        /*
         * Infinity significa:
         *
         * aplicar TODOS los eventos
         * de esa fecha.
         */
        return this.resolveTerritoryOwnerAtPosition(
            territoryId,
            {
                date,

                eventId:
                    Number.POSITIVE_INFINITY,
            },
            new Set<number>()
        )
    }


    // --------------------------------------------------
    // ESTADO COMPLETO EN FECHA
    // --------------------------------------------------

    public getStateAt(
        date: TimelineDate
    ): Map<number, number | null> {

        this.validateDate(
            date
        )

        const territoryIds =
            new Set<number>()

        for (
            const territoryId of
            this.initialTerritoryControl.keys()
        ) {

            territoryIds.add(
                territoryId
            )
        }

        /*
         * También incluimos territorios
         * mencionados por eventos.
         */
        for (
            const event of
            this.events
        ) {

            if (
                event.type ===
                'territory-owner-changed'
            ) {

                territoryIds.add(
                    event.territoryId
                )

                continue
            }

            territoryIds.add(
                event.parentTerritoryId
            )

            territoryIds.add(
                event.newTerritoryId
            )
        }

        const state =
            new Map<
                number,
                number | null
            >()

        for (
            const territoryId of
            territoryIds
        ) {

            state.set(
                territoryId,
                this.getTerritoryOwnerAt(
                    territoryId,
                    date
                )
            )
        }


        return state
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
            index < 0
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
    // EVENTOS
    // --------------------------------------------------

    public getEvents():
        TimelineEvent[] {

        return this.events
            .slice()
            .sort(
                (
                    a,
                    b
                ) => {

                    const dateCompare =
                        this.compareDates(
                            a.date,
                            b.date
                        )

                    if (
                        dateCompare !== 0
                    ) {
                        return dateCompare
                    }

                    return (
                        a.id -
                        b.id
                    )
                }
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

    public getEventsAt(
        date: TimelineDate
    ): TimelineEvent[] {

        this.validateDate(
            date
        )

        return this.getEvents()
            .filter(
                event =>
                    this.compareDates(
                        event.date,
                        date
                    ) === 0
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

        this.initialTerritoryControl
            .clear()

        this.events = []

        this.nextEventId =
            1
    }


    // --------------------------------------------------
    // RESTAURAR EVENTOS DE DIVISIÓN
    // --------------------------------------------------

    public restoreTerritorySplitEvents(
        events: TerritorySplitEvent[]
    ) {

        if (
            events.length === 0
        ) {
            return
        }

        /*
        * IDs de todos los eventos que
        * actualmente existen.
        */
        const existingEventIds =
            new Set(
                this.events.map(
                    event =>
                        event.id
                )
            )

        /*
        * Construimos el conjunto completo
        * de divisiones:
        *
        * existentes + restauradas.
        *
        * Lo usamos para validar que no haya
        * hijos duplicados ni ciclos.
        */
        const candidateSplits:
            TerritorySplitEvent[] =
            this.events
                .filter(
                    (
                        event
                    ): event is TerritorySplitEvent =>
                        event.type ===
                        'territory-split'
                )
                .map(
                    event => ({
                        ...event,

                        date: {
                            ...event.date,
                        },
                    })
                )

        for (
            const event of
            events
        ) {

            this.validateDate(
                event.date
            )

            if (
                event.parentTerritoryId <= 0 ||
                event.newTerritoryId <= 0
            ) {

                throw new Error(
                    'Los territorios de una división restaurada deben ser válidos'
                )
            }

            if (
                event.parentTerritoryId ===
                event.newTerritoryId
            ) {

                throw new Error(
                    'Un territorio no puede ser su propio padre'
                )
            }

            if (
                existingEventIds.has(
                    event.id
                )
            ) {

                throw new Error(
                    `Ya existe un evento con ID ${event.id}`
                )
            }

            existingEventIds.add(
                event.id
            )

            candidateSplits.push({
                ...event,

                date: {
                    ...event.date,
                },
            })
        }

        // --------------------------------
        // UN SOLO PADRE POR HIJO
        // --------------------------------

        const splitByChild =
            new Map<
                number,
                TerritorySplitEvent
            >()

        for (
            const event of
            candidateSplits
        ) {

            if (
                splitByChild.has(
                    event.newTerritoryId
                )
            ) {

                throw new Error(
                    `El territorio ${event.newTerritoryId} tiene más de un evento de división`
                )
            }

            splitByChild.set(
                event.newTerritoryId,
                event
            )
        }

        // --------------------------------
        // DETECTAR CICLOS
        // --------------------------------

        for (
            const event of
            candidateSplits
        ) {

            const visited =
                new Set<number>()

            let currentTerritoryId =
                event.newTerritoryId

            while (
                true
            ) {

                if (
                    visited.has(
                        currentTerritoryId
                    )
                ) {

                    throw new Error(
                        'La restauración generaría un ciclo territorial'
                    )
                }

                visited.add(
                    currentTerritoryId
                )

                const split =
                    splitByChild.get(
                        currentTerritoryId
                    )

                if (
                    split === undefined
                ) {
                    break
                }

                currentTerritoryId =
                    split.parentTerritoryId
            }
        }

        // --------------------------------
        // RESTAURAR
        // --------------------------------

        for (
            const event of
            events
        ) {

            this.events.push({
                ...event,

                date: {
                    ...event.date,
                },
            })

            /*
            * nextEventId nunca retrocede.
            */
            this.nextEventId =
                Math.max(
                    this.nextEventId,
                    event.id + 1
                )
        }
    }


    // --------------------------------------------------
    // RESTAURAR EVENTO DE CAMBIO DE PROPIETARIO
    // --------------------------------------------------
    public restoreTerritoryOwnerChangedEvent(
        event: TerritoryOwnerChangedEvent
    ) {

        if (
            this.events.some(
                existing =>
                    existing.id ===
                    event.id
            )
        ) {

            throw new Error(
                `Ya existe un evento con ID ${event.id}`
            )
        }

        this.events.push({
            ...event,

            date: {
                ...event.date,
            },
        })

        this.nextEventId =
            Math.max(
                this.nextEventId,
                event.id + 1
            )
    }
}