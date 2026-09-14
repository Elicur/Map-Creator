import type {
    TimelineDate,
    TimelineEvent,
    TimelineTerritoryControl,
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

    private nextEventId = 1


    // --------------------------------------------------
    // AÑO INICIAL
    // --------------------------------------------------

    public get startYear(): number {

        return this.initialDate.year
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

        const state =
            new Map(
                this.initialTerritoryControl
            )

        const orderedEvents =
            [...this.events]
                .sort(
                    (
                        a,
                        b
                    ) => {

                        const dateDifference =
                            this.compareDates(
                                a.date,
                                b.date
                            )

                        if (
                            dateDifference !== 0
                        ) {
                            return dateDifference
                        }

                        return (
                            a.id -
                            b.id
                        )
                    }
                )

        for (
            const event of
            orderedEvents
        ) {

            if (
                this.compareDates(
                    event.date,
                    date
                ) > 0
            ) {
                break
            }

            switch (
                event.type
            ) {

                case 'territory-owner-changed':

                    state.set(
                        event.territoryId,
                        event.countryId
                    )

                    break
            }
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

        return (
            this.getStateAt(
                date
            ).get(
                territoryId
            )
            ?? null
        )
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
}