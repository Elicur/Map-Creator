import type {
    EditorUI,
} from '../ui/createUI'

import {
    TimelineManager,
} from './TimelineManager'

import {
    TerritoryManager,
} from '../map/TerritoryManager'

import {
    TerritoryControlManager,
} from '../map/TerritoryControlManager'

import type {
    TimelineDate,
} from './timelineTypes'


export type TimelineState =
    Map<number, number | null>


type TimelineStateAppliedHandler =
    (
        state: TimelineState
    ) => void


export class TimelineController {

    private ui:
        EditorUI

    private timelineManager:
        TimelineManager

    private territoryManager:
        TerritoryManager

    private territoryControlManager:
        TerritoryControlManager

    private stateAppliedHandler:
        TimelineStateAppliedHandler | null =
        null

    private started =
        false

    private initialized =
        false


    constructor(
        ui: EditorUI,
        timelineManager: TimelineManager,
        territoryManager: TerritoryManager,
        territoryControlManager:
            TerritoryControlManager
    ) {

        this.ui =
            ui

        this.timelineManager =
            timelineManager

        this.territoryManager =
            territoryManager

        this.territoryControlManager =
            territoryControlManager
    }


    // --------------------------------------------------
    // ESTADO
    // --------------------------------------------------

    public get isInitialized():
        boolean {

        return this.initialized
    }


    public get year():
        number {

        return this.timelineManager.year
    }


    public get month():
        number {

        return this.timelineManager.month
    }


    public get date():
        TimelineDate {

        return this.timelineManager.date
    }


    // --------------------------------------------------
    // CALLBACK AL EDITOR
    // --------------------------------------------------

    public setStateAppliedHandler(
        handler:
            TimelineStateAppliedHandler
    ) {

        this.stateAppliedHandler =
            handler
    }


    // --------------------------------------------------
    // INICIAR LISTENERS
    // --------------------------------------------------

    public start() {

        if (
            this.started
        ) {
            return
        }


        this.started =
            true


        this.ui.timelinePreviousButton
            .addEventListener(
                'click',
                this.handlePreviousClick
            )


        this.ui.timelineNextButton
            .addEventListener(
                'click',
                this.handleNextClick
            )


        this.ui.timelineYearInput
            .addEventListener(
                'change',
                this.handleYearChange
            )
    }


    // --------------------------------------------------
    // DETENER LISTENERS
    // --------------------------------------------------

    public stop() {

        if (
            !this.started
        ) {
            return
        }


        this.started =
            false


        this.ui.timelinePreviousButton
            .removeEventListener(
                'click',
                this.handlePreviousClick
            )


        this.ui.timelineNextButton
            .removeEventListener(
                'click',
                this.handleNextClick
            )


        this.ui.timelineYearInput
            .removeEventListener(
                'change',
                this.handleYearChange
            )
    }


    // --------------------------------------------------
    // INICIALIZAR TIMELINE
    // --------------------------------------------------

    public initializeIfNeeded() {

        if (
            this.initialized
        ) {
            return
        }


        const initialControl =
            this.territoryManager
                .getAll()
                .map(
                    territory => ({
                        territoryId:
                            territory.id,

                        countryId:
                            this.territoryControlManager
                                .getCountryId(
                                    territory.id
                                ),
                    })
                )


        this.timelineManager.setInitialState(
            {
                year: 0,
                month: 1,
            },
            initialControl
        )


        this.initialized =
            true


        this.ui.timelineYearInput.value =
            '0'
    }


    // --------------------------------------------------
    // RESET
    // --------------------------------------------------

    public reset() {

        this.timelineManager.reset()

        this.initialized =
            false

        this.ui.timelineYearInput.value =
            '0'
    }


    // --------------------------------------------------
    // VISIBILIDAD
    // --------------------------------------------------

    public setVisible(
        visible: boolean
    ) {

        this.ui.timelineBar.classList.toggle(
            'hidden',
            !visible
        )
    }


    // --------------------------------------------------
    // APLICAR FECHA ACTUAL
    // --------------------------------------------------

    public applyCurrentDate() {

        if (
            !this.initialized
        ) {
            return
        }


        const state =
            this.timelineManager.getStateAt(
                this.timelineManager.date
            )


        this.stateAppliedHandler?.(
            state
        )
    }


    // --------------------------------------------------
    // CAMBIAR PROPIETARIO
    // --------------------------------------------------

    public changeTerritoryOwner(
        territoryId: number,
        countryId: number | null
    ): boolean {

        if (
            !this.initialized
        ) {
            return false
        }


        const currentCountryId =
            this.timelineManager
                .getTerritoryOwnerAt(
                    territoryId,
                    this.timelineManager.date
                )


        if (
            currentCountryId ===
            countryId
        ) {
            return false
        }


        this.timelineManager
            .addTerritoryOwnerChangedEvent(
                this.timelineManager.date,
                territoryId,
                countryId
            )


        this.applyCurrentDate()


        return true
    }


    // --------------------------------------------------
    // CONSULTAR PROPIETARIO ACTUAL
    // --------------------------------------------------

    public getTerritoryOwnerAtCurrentDate(
        territoryId: number
    ): number | null {

        if (
            !this.initialized
        ) {

            return this.territoryControlManager
                .getCountryId(
                    territoryId
                )
        }


        return this.timelineManager
            .getTerritoryOwnerAt(
                territoryId,
                this.timelineManager.date
            )
    }


    // --------------------------------------------------
    // REGISTRAR DIVISIÓN
    // --------------------------------------------------

    public registerTerritorySplit(
        territoryId: number,
        parentTerritoryId: number
    ) {

        if (
            !this.initialized
        ) {
            return
        }


        this.timelineManager
            .registerTerritorySplit(
                territoryId,
                parentTerritoryId,
                this.timelineManager.date
            )
    }


    // --------------------------------------------------
    // AÑO ANTERIOR
    // --------------------------------------------------

    private handlePreviousClick =
        () => {

            const year =
                this.timelineManager.year -
                1


            this.timelineManager.setYear(
                year
            )


            this.ui.timelineYearInput.value =
                year.toString()


            this.applyCurrentDate()


            this.ui.statusMessage.textContent =
                `Año ${year}`
        }


    // --------------------------------------------------
    // AÑO SIGUIENTE
    // --------------------------------------------------

    private handleNextClick =
        () => {

            const year =
                this.timelineManager.year +
                1


            this.timelineManager.setYear(
                year
            )


            this.ui.timelineYearInput.value =
                year.toString()


            this.applyCurrentDate()


            this.ui.statusMessage.textContent =
                `Año ${year}`
        }


    // --------------------------------------------------
    // CAMBIAR AÑO MANUALMENTE
    // --------------------------------------------------

    private handleYearChange =
        () => {

            const year =
                Number(
                    this.ui.timelineYearInput.value
                )


            if (
                !Number.isInteger(
                    year
                )
            ) {

                this.ui.timelineYearInput.value =
                    this.timelineManager.year
                        .toString()

                return
            }


            this.timelineManager.setYear(
                year
            )


            this.applyCurrentDate()


            this.ui.statusMessage.textContent =
                `Año ${year}`
        }
}