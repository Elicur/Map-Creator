import type {
    HistoryCommand,
    Tool,
} from '../types/editor'

import type {
    EditorUI,
} from '../ui/createUI'

import {
    CountryManager,
} from '../map/CountryManager'

import {
    TerritoryManager,
} from '../map/TerritoryManager'

import {
    TerritoryControlManager,
} from '../map/TerritoryControlManager'

import {
    TerritoryPreviewController,
} from '../map/TerritoryPreviewController'

import {
    hexToRgb,
} from '../map/colors'

import {
    TimelineController,
} from '../timeline/TimelineController'

import type {
    TimelineState,
} from '../timeline/TimelineController'


export type PoliticsEditorBridge = {

    getCurrentTool:
        () => Tool

    setTool:
        (tool: Tool) => void

    getSelectedTerritoryId:
        () => number | null

    clearTerritorySelection:
        () => void

    commitHistory:
        (
            command: HistoryCommand
        ) => void

    getGeographyLocked:
        () => boolean
}


export class PoliticsController {

    private ui:
        EditorUI

    private countryManager:
        CountryManager

    private territoryManager:
        TerritoryManager

    private territoryControlManager:
        TerritoryControlManager

    private preview:
        TerritoryPreviewController

    private timelineController:
        TimelineController

    private editorBridge:
        PoliticsEditorBridge | null =
        null

    private selectedCountryId:
        number | null = null

    private pendingPreviewPosition:
        {
            x: number
            y: number
        } | null = null

    private previewTimer:
        number | null = null

    private started =
        false


    constructor(
        ui: EditorUI,
        countryManager: CountryManager,
        territoryManager: TerritoryManager,
        territoryControlManager:
            TerritoryControlManager,
        preview:
            TerritoryPreviewController,
        timelineController:
            TimelineController
    ) {

        this.ui =
            ui

        this.countryManager =
            countryManager

        this.territoryManager =
            territoryManager

        this.territoryControlManager =
            territoryControlManager

        this.preview =
            preview

        this.timelineController =
            timelineController


        /*
         * El estado histórico calculado por el
         * timeline se aplica a la capa política.
         */
        this.timelineController
            .setStateAppliedHandler(
                state => {

                    this.applyTimelineState(
                        state
                    )
                }
            )
    }


    // --------------------------------------------------
    // CONEXIÓN CON EL EDITOR
    // --------------------------------------------------

    public setEditorBridge(
        bridge: PoliticsEditorBridge
    ) {

        this.editorBridge =
            bridge
    }


    // --------------------------------------------------
    // LISTENERS
    // --------------------------------------------------

    public start() {

        if (
            this.started
        ) {
            return
        }


        this.started =
            true


        this.ui.countriesButton
            .addEventListener(
                'click',
                this.handleCountriesClick
            )


        this.ui.countryCloseButton
            .addEventListener(
                'click',
                this.handleCountryCloseClick
            )


        this.ui.createCountryButton
            .addEventListener(
                'click',
                this.handleCreateCountryClick
            )


        this.ui.territoryCountrySelect
            .addEventListener(
                'change',
                this.handleTerritoryCountryChange
            )


        this.ui.saveCountryButton
            .addEventListener(
                'click',
                this.handleSaveCountryClick
            )


        this.ui.assignCountryButton
            .addEventListener(
                'click',
                this.handleAssignCountryClick
            )


        this.ui.deleteCountryButton
            .addEventListener(
                'click',
                this.handleDeleteCountryClick
            )


        document.addEventListener(
            'pointerdown',
            this.handleDocumentPointerDown
        )
    }


    public stop() {

        if (
            !this.started
        ) {
            return
        }


        this.started =
            false


        this.ui.countriesButton
            .removeEventListener(
                'click',
                this.handleCountriesClick
            )


        this.ui.countryCloseButton
            .removeEventListener(
                'click',
                this.handleCountryCloseClick
            )


        this.ui.createCountryButton
            .removeEventListener(
                'click',
                this.handleCreateCountryClick
            )


        this.ui.territoryCountrySelect
            .removeEventListener(
                'change',
                this.handleTerritoryCountryChange
            )


        this.ui.saveCountryButton
            .removeEventListener(
                'click',
                this.handleSaveCountryClick
            )


        this.ui.assignCountryButton
            .removeEventListener(
                'click',
                this.handleAssignCountryClick
            )


        this.ui.deleteCountryButton
            .removeEventListener(
                'click',
                this.handleDeleteCountryClick
            )


        document.removeEventListener(
            'pointerdown',
            this.handleDocumentPointerDown
        )


        this.clearAssignmentPreview()
    }


    // --------------------------------------------------
    // PAÍS SELECCIONADO
    // --------------------------------------------------

    public getSelectedCountryName():
        string | null {

        if (
            this.selectedCountryId ===
            null
        ) {
            return null
        }


        const country =
            this.countryManager.getById(
                this.selectedCountryId
            )


        return country?.name ?? null
    }


    public resetSelection() {

        if (
            this.editorBridge
                ?.getCurrentTool() ===
            'assign-country'
        ) {

            this.editorBridge.setTool(
                'select'
            )
        }


        this.selectedCountryId =
            null


        this.clearAssignmentPreview()


        this.ui.countryPanel
            .classList.add(
                'hidden'
            )


        this.refreshUI()
    }


    // --------------------------------------------------
    // UI
    // --------------------------------------------------

    public refreshUI() {

        /*
         * El país pudo desaparecer por Undo.
         */
        if (
            this.selectedCountryId !== null &&
            this.countryManager.getById(
                this.selectedCountryId
            ) === null
        ) {

            this.selectedCountryId =
                null


            if (
                this.editorBridge
                    ?.getCurrentTool() ===
                'assign-country'
            ) {

                this.editorBridge.setTool(
                    'select'
                )
            }
        }


        this.ui.countryList
            .replaceChildren()


        const countries =
            this.countryManager.getAll()


        for (
            const country of
            countries
        ) {

            const item =
                document.createElement(
                    'button'
                )


            item.type =
                'button'


            item.className =
                'country-list-item'


            if (
                country.id ===
                this.selectedCountryId
            ) {

                item.classList.add(
                    'selected'
                )
            }


            const color =
                document.createElement(
                    'span'
                )


            color.className =
                'country-color'


            color.style.backgroundColor =
                country.color


            const name =
                document.createElement(
                    'span'
                )


            name.textContent =
                country.name


            item.append(
                color,
                name
            )


            item.addEventListener(
                'click',
                () => {

                    this.selectCountry(
                        country.id
                    )
                }
            )


            this.ui.countryList.append(
                item
            )
        }


        this.refreshTerritoryCountrySelect(
            this.editorBridge
                ?.getSelectedTerritoryId()
            ?? null
        )


        this.syncToolUI()
    }


    public refreshTerritoryCountrySelect(
        territoryId: number | null
    ) {

        const select =
            this.ui.territoryCountrySelect


        select.replaceChildren()


        const noCountry =
            document.createElement(
                'option'
            )


        noCountry.value =
            ''


        noCountry.textContent =
            'Sin país'


        select.append(
            noCountry
        )


        for (
            const country of
            this.countryManager.getAll()
        ) {

            const option =
                document.createElement(
                    'option'
                )


            option.value =
                country.id.toString()


            option.textContent =
                country.name


            select.append(
                option
            )
        }


        if (
            territoryId === null
        ) {

            select.value =
                ''

            return
        }


        const countryId =
            this.territoryControlManager
                .getCountryId(
                    territoryId
                )


        select.value =
            countryId === null
                ? ''
                : countryId.toString()
    }


    public syncToolUI() {

        this.showSelectedCountry()
    }


    private showSelectedCountry() {

        if (
            this.selectedCountryId ===
            null
        ) {

            this.ui.selectedCountryEditor
                .classList.add(
                    'hidden'
                )

            return
        }


        const country =
            this.countryManager.getById(
                this.selectedCountryId
            )


        if (
            country === null
        ) {

            this.selectedCountryId =
                null


            this.ui.selectedCountryEditor
                .classList.add(
                    'hidden'
                )

            return
        }


        this.ui.selectedCountryNameInput.value =
            country.name


        this.ui.selectedCountryColorInput.value =
            country.color


        this.ui.selectedCountryEditor
            .classList.remove(
                'hidden'
            )


        this.ui.assignCountryButton.textContent =
            this.editorBridge
                ?.getCurrentTool() ===
            'assign-country'
                ? 'Finalizar asignación'
                : 'Asignar territorios'
    }


    // --------------------------------------------------
    // ABRIR / CERRAR PANEL
    // --------------------------------------------------

    private handleCountriesClick =
        () => {

            const isOpen =
                !this.ui.countryPanel
                    .classList.contains(
                        'hidden'
                    )


            if (
                isOpen
            ) {

                this.closeCountryPanel()

                return
            }


            this.refreshUI()


            this.ui.countryPanel
                .classList.remove(
                    'hidden'
                )
        }


    private handleCountryCloseClick =
        () => {

            this.closeCountryPanel()
        }


    private closeCountryPanel() {

        if (
            this.editorBridge
                ?.getCurrentTool() ===
            'assign-country'
        ) {

            this.editorBridge.setTool(
                'select'
            )
        }


        this.selectedCountryId =
            null


        this.clearAssignmentPreview()


        this.ui.countryPanel
            .classList.add(
                'hidden'
            )


        this.refreshUI()
    }


    private handleDocumentPointerDown =
        (
            event: PointerEvent
        ) => {

            if (
                this.ui.countryPanel
                    .classList
                    .contains(
                        'hidden'
                    )
            ) {
                return
            }


            const target =
                event.target


            if (
                !(target instanceof Element)
            ) {
                return
            }


            if (
                this.ui.countryPanel.contains(
                    target
                )
            ) {
                return
            }


            /*
             * Cambiar herramientas no cierra
             * el panel.
             */
            if (
                target.closest(
                    '.toolbar'
                ) !== null
            ) {
                return
            }


            if (
                this.editorBridge
                    ?.getCurrentTool() !==
                'select'
            ) {
                return
            }


            this.closeCountryPanel()
        }


    public handleEscape():
        boolean {

        if (
            this.editorBridge
                ?.getCurrentTool() ===
            'assign-country'
        ) {

            this.closeCountryPanel()

            return true
        }


        if (
            !this.ui.countryPanel
                .classList
                .contains(
                    'hidden'
                )
        ) {

            this.closeCountryPanel()

            return true
        }


        return false
    }


    // --------------------------------------------------
    // CREAR PAÍS
    // --------------------------------------------------

    private handleCreateCountryClick =
        () => {

            const country =
                this.countryManager.create(
                    this.ui.countryNameInput.value,
                    this.ui.countryColorInput.value
                )


            if (
                country === null
            ) {

                this.ui.statusMessage.textContent =
                    'El país debe tener un nombre'

                return
            }


            this.editorBridge
                ?.commitHistory({
                    type:
                        'create-country',

                    countryId:
                        country.id,

                    name:
                        country.name,

                    color:
                        country.color,
                })


            this.selectedCountryId =
                country.id


            this.ui.countryNameInput.value =
                ''


            this.refreshUI()


            this.editorBridge?.setTool(
                'assign-country'
            )


            this.ui.statusMessage.textContent =
                `País "${country.name}" creado. Click en territorios para asignarlos.`
        }


    // --------------------------------------------------
    // SELECCIONAR PAÍS
    // --------------------------------------------------

    private selectCountry(
        countryId: number
    ) {

        const country =
            this.countryManager.getById(
                countryId
            )


        if (
            country === null
        ) {
            return
        }


        if (
            this.editorBridge
                ?.getCurrentTool() ===
            'assign-country'
        ) {

            this.editorBridge.setTool(
                'select'
            )
        }


        this.selectedCountryId =
            country.id


        this.refreshUI()


        this.ui.statusMessage.textContent =
            `País seleccionado: ${country.name}`
    }


    // --------------------------------------------------
    // ACTIVAR / FINALIZAR ASIGNACIÓN
    // --------------------------------------------------

    private handleAssignCountryClick =
        () => {

            if (
                this.selectedCountryId ===
                null
            ) {
                return
            }


            if (
                this.editorBridge
                    ?.getCurrentTool() ===
                'assign-country'
            ) {

                this.editorBridge.setTool(
                    'select'
                )


                this.syncToolUI()


                this.ui.statusMessage.textContent =
                    'Asignación de territorios finalizada'

                return
            }


            this.editorBridge
                ?.clearTerritorySelection()


            this.editorBridge?.setTool(
                'assign-country'
            )


            this.syncToolUI()
        }


    // --------------------------------------------------
    // CAMBIO DESDE SELECT DE TERRITORIO
    // --------------------------------------------------

    private handleTerritoryCountryChange =
        () => {

            const territoryId =
                this.editorBridge
                    ?.getSelectedTerritoryId()
                ?? null


            if (
                territoryId === null
            ) {
                return
            }


            const territory =
                this.territoryManager.getById(
                    territoryId
                )


            if (
                territory === null
            ) {
                return
            }


            const value =
                this.ui
                    .territoryCountrySelect
                    .value


            const countryId =
                value === ''
                    ? null
                    : Number(value)


            const changed =
                this.setTerritoryCountry(
                    territory.id,
                    countryId
                )


            if (
                !changed
            ) {
                return
            }


            if (
                countryId === null
            ) {

                this.ui.statusMessage.textContent =
                    this.timelineController
                        .isInitialized
                        ? `${territory.name} queda sin país en el año ${this.timelineController.year}`
                        : `${territory.name} quedó sin país`

                return
            }


            const country =
                this.countryManager.getById(
                    countryId
                )


            if (
                country === null
            ) {
                return
            }


            this.ui.statusMessage.textContent =
                this.timelineController
                    .isInitialized
                    ? `${territory.name} pasa a "${country.name}" en el año ${this.timelineController.year}`
                    : `${territory.name} asignado a "${country.name}"`
        }


    // --------------------------------------------------
    // ASIGNAR CON CLICK EN EL MAPA
    // --------------------------------------------------

    public assignSelectedCountryAt(
        x: number,
        y: number
    ) {

        this.clearAssignmentPreview()


        if (
            this.selectedCountryId ===
            null
        ) {
            return
        }


        const country =
            this.countryManager.getById(
                this.selectedCountryId
            )


        if (
            country === null
        ) {
            return
        }


        const territory =
            this.territoryManager.getAt(
                x,
                y
            )


        if (
            territory === null
        ) {

            this.ui.statusMessage.textContent =
                'No hay ningún territorio aquí'

            return
        }


        const changed =
            this.setTerritoryCountry(
                territory.id,
                country.id
            )


        if (
            !changed
        ) {

            this.ui.statusMessage.textContent =
                `${territory.name} ya pertenece a "${country.name}"`

            return
        }


        this.ui.statusMessage.textContent =
            this.timelineController
                .isInitialized
                ? `${territory.name} pasa a "${country.name}" en el año ${this.timelineController.year}`
                : `${territory.name} asignado a "${country.name}"`
    }


    // --------------------------------------------------
    // CAMBIAR CONTROL POLÍTICO
    // --------------------------------------------------

    private setTerritoryCountry(
        territoryId: number,
        countryId: number | null
    ): boolean {

        const territory =
            this.territoryManager.getById(
                territoryId
            )


        if (
            territory === null
        ) {
            return false
        }


        // --------------------------------
        // ESTADO INICIAL
        // --------------------------------

        if (
            !this.timelineController
                .isInitialized
        ) {

            const currentCountryId =
                this.territoryControlManager
                    .getCountryId(
                        territoryId
                    )


            if (
                currentCountryId ===
                countryId
            ) {
                return false
            }


            this.territoryControlManager.assign(
                territoryId,
                countryId
            )


            this.applyTerritoryCountryColor(
                territoryId,
                countryId
            )


            this.editorBridge
                ?.commitHistory({
                    type:
                        'assign-territory-country',

                    territoryId,

                    countryId,
                })


            return true
        }


        // --------------------------------
        // GEOGRAFÍA REABIERTA
        // --------------------------------

        if (
            !(
                this.editorBridge
                    ?.getGeographyLocked()
                ?? false
            )
        ) {

            this.ui.statusMessage.textContent =
                'Finalizá la geografía para modificar el control histórico'

            return false
        }


        return this.timelineController
            .changeTerritoryOwner(
                territoryId,
                countryId
            )
    }


    // --------------------------------------------------
    // GUARDAR PAÍS
    // --------------------------------------------------

    private handleSaveCountryClick =
        () => {

            if (
                this.selectedCountryId ===
                null
            ) {
                return
            }


            const country =
                this.countryManager.getById(
                    this.selectedCountryId
                )


            if (
                country === null
            ) {
                return
            }


            const newName =
                this.ui
                    .selectedCountryNameInput
                    .value
                    .trim()


            const newColor =
                this.ui
                    .selectedCountryColorInput
                    .value


            if (
                newName.length === 0
            ) {

                this.ui.statusMessage.textContent =
                    'El país debe tener un nombre'

                return
            }


            if (
                newName === country.name &&
                newColor === country.color
            ) {
                return
            }


            const updated =
                this.countryManager.update(
                    country.id,
                    newName,
                    newColor
                )


            if (
                updated === null
            ) {
                return
            }


            this.recolorCountryTerritories(
                updated.id
            )


            this.editorBridge
                ?.commitHistory({
                    type:
                        'update-country',

                    countryId:
                        updated.id,

                    name:
                        updated.name,

                    color:
                        updated.color,
                })


            this.refreshUI()


            this.ui.statusMessage.textContent =
                `País "${updated.name}" actualizado`
        }


    // --------------------------------------------------
    // ELIMINAR PAÍS
    // --------------------------------------------------

    private handleDeleteCountryClick =
        () => {

            if (
                this.selectedCountryId ===
                null
            ) {
                return
            }


            const country =
                this.countryManager.getById(
                    this.selectedCountryId
                )


            if (
                country === null
            ) {
                return
            }


            const territoryIds =
                this.territoryControlManager
                    .getTerritoryIdsByCountryId(
                        country.id
                    )


            for (
                const territoryId of
                territoryIds
            ) {

                this.territoryControlManager.assign(
                    territoryId,
                    null
                )


                this.territoryManager
                    .setNeutralColor(
                        territoryId
                    )
            }


            if (
                this.editorBridge
                    ?.getCurrentTool() ===
                'assign-country'
            ) {

                this.editorBridge.setTool(
                    'select'
                )
            }


            this.countryManager.delete(
                country.id
            )


            this.editorBridge
                ?.commitHistory({
                    type:
                        'delete-country',

                    countryId:
                        country.id,
                })


            const deletedName =
                country.name


            this.selectedCountryId =
                null


            this.refreshUI()


            this.ui.statusMessage.textContent =
                `País "${deletedName}" eliminado`
        }


    // --------------------------------------------------
    // COLORES
    // --------------------------------------------------

    public applyTerritoryCountryColor(
        territoryId: number,
        countryId: number | null
    ) {

        if (
            countryId === null
        ) {

            this.territoryManager
                .setNeutralColor(
                    territoryId
                )

            return
        }


        const country =
            this.countryManager.getById(
                countryId
            )


        if (
            country === null
        ) {
            return
        }


        const color =
            hexToRgb(
                country.color
            )


        if (
            color === null
        ) {
            return
        }


        this.territoryManager.setColor(
            territoryId,
            color
        )
    }


    public recolorCountryTerritories(
        countryId: number
    ) {

        const territoryIds =
            this.territoryControlManager
                .getTerritoryIdsByCountryId(
                    countryId
                )


        for (
            const territoryId of
            territoryIds
        ) {

            this.applyTerritoryCountryColor(
                territoryId,
                countryId
            )
        }
    }


    // --------------------------------------------------
    // APLICAR ESTADO DEL TIMELINE
    // --------------------------------------------------

    private applyTimelineState(
        state: TimelineState
    ) {

        this.territoryControlManager.reset()


        for (
            const territory of
            this.territoryManager.getAll()
        ) {

            const countryId =
                state.get(
                    territory.id
                )
                ?? null


            this.territoryControlManager.assign(
                territory.id,
                countryId
            )


            this.applyTerritoryCountryColor(
                territory.id,
                countryId
            )
        }


        this.refreshUI()
    }


    // --------------------------------------------------
    // PREVIEW DE ASIGNACIÓN
    // --------------------------------------------------

    public scheduleAssignmentPreview(
        x: number,
        y: number
    ) {

        this.pendingPreviewPosition = {
            x,
            y,
        }


        if (
            this.previewTimer !== null
        ) {
            return
        }


        this.previewTimer =
            window.setTimeout(
                () => {

                    this.previewTimer =
                        null


                    const position =
                        this.pendingPreviewPosition


                    this.pendingPreviewPosition =
                        null


                    if (
                        position === null ||
                        this.editorBridge
                            ?.getCurrentTool() !==
                            'assign-country' ||
                        this.selectedCountryId ===
                            null
                    ) {

                        this.preview.clear()

                        return
                    }


                    this.updateAssignmentPreview(
                        position.x,
                        position.y
                    )
                },
                50
            )
    }


    private updateAssignmentPreview(
        x: number,
        y: number
    ) {

        if (
            this.selectedCountryId ===
            null
        ) {

            this.preview.clear()

            return
        }


        const country =
            this.countryManager.getById(
                this.selectedCountryId
            )


        if (
            country === null
        ) {

            this.preview.clear()

            return
        }


        const territory =
            this.territoryManager.getAt(
                x,
                y
            )


        if (
            territory === null
        ) {

            this.preview.clear()

            return
        }


        const pixels =
            this.territoryManager
                .getRegionPixels(
                    territory.id
                )


        if (
            pixels === null
        ) {

            this.preview.clear()

            return
        }


        const color =
            hexToRgb(
                country.color
            )


        if (
            color === null
        ) {

            this.preview.clear()

            return
        }


        this.preview.showRegion(
            pixels,
            color,
            120
        )
    }


    public clearAssignmentPreview() {

        if (
            this.previewTimer !== null
        ) {

            window.clearTimeout(
                this.previewTimer
            )


            this.previewTimer =
                null
        }


        this.pendingPreviewPosition =
            null


        this.preview.clear()
    }
}