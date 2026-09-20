import type {
    HistoryCommand,
    StrokeCommand,
    Tool,
} from '../types/editor'

import type {
    EditorUI,
} from '../ui/createUI'

import {
    DrawingController,
} from './DrawingController'

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
    TERRITORY_CREATION_PREVIEW_COLOR,
} from '../map/colors'

import {
    TimelineController,
} from '../timeline/TimelineController'


export type GeographyEditorBridge = {

    getCurrentTool:
        () => Tool

    setTool:
        (tool: Tool) => void

    commitHistory:
        (
            command: HistoryCommand
        ) => void

    updateProjectDirtyState:
        () => void

    refreshPoliticsUI:
        () => void

    refreshTerritoryCountrySelect:
        (
            territoryId: number | null
        ) => void

    redrawHistory:
        () => Promise<void>

    applyTerritoryCountryColor:
        (
            territoryId: number,
            countryId: number | null
        ) => void
}


export class GeographyController {

    private ui: EditorUI

    private drawing: DrawingController

    private territoryManager: TerritoryManager

    private territoryControlManager: TerritoryControlManager

    private preview: TerritoryPreviewController

    private timelineController: TimelineController

    private editorBridge:
        GeographyEditorBridge | null =
        null

    private selectedTerritoryIdValue: number | null = null

    private geographyLocked = false

    private pendingPreviewPosition:
        {
            x: number
            y: number
        } | null = null

    private previewTimer: number | null = null

    private started = false

    private splittingTerritoryId: number | null = null

    constructor(
        ui: EditorUI,
        drawing: DrawingController,
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

        this.drawing =
            drawing

        this.territoryManager =
            territoryManager

        this.territoryControlManager =
            territoryControlManager

        this.preview =
            preview

        this.timelineController =
            timelineController
    }


    // --------------------------------------------------
    // BRIDGE
    // --------------------------------------------------

    public setEditorBridge(
        bridge: GeographyEditorBridge
    ) {

        this.editorBridge =
            bridge
    }


    // --------------------------------------------------
    // ESTADO
    // --------------------------------------------------

    public get isLocked():
        boolean {

        return this.geographyLocked
    }


    public get selectedTerritoryId():
        number | null {

        return this.selectedTerritoryIdValue
    }


    public setLockedState(
        locked: boolean
    ) {

        this.geographyLocked =
            locked


        if (
            locked
        ) {

            this.timelineController
                .initializeIfNeeded()
        }


        this.updateLockUI()
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


        this.ui.clearButton
            .addEventListener(
                'click',
                this.handleClearClick
            )


        this.ui.geographyLockButton
            .addEventListener(
                'click',
                this.handleGeographyLockClick
            )


        this.ui.territorySaveButton
            .addEventListener(
                'click',
                this.handleTerritorySaveClick
            )


        this.ui.territoryDeleteButton
            .addEventListener(
                'click',
                this.handleDeleteTerritoryClick
            )


        this.ui.territoryCloseButton
            .addEventListener(
                'click',
                this.handleTerritoryCloseClick
            )


        this.ui.territoryNameInput
            .addEventListener(
                'keydown',
                this.handleTerritoryNameKeyDown
            )

        this.ui.territoryDivideButton
            .addEventListener(
                'click',
                this.handleDivideTerritoryClick
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


        this.ui.clearButton
            .removeEventListener(
                'click',
                this.handleClearClick
            )


        this.ui.geographyLockButton
            .removeEventListener(
                'click',
                this.handleGeographyLockClick
            )


        this.ui.territorySaveButton
            .removeEventListener(
                'click',
                this.handleTerritorySaveClick
            )


        this.ui.territoryDeleteButton
            .removeEventListener(
                'click',
                this.handleDeleteTerritoryClick
            )


        this.ui.territoryCloseButton
            .removeEventListener(
                'click',
                this.handleTerritoryCloseClick
            )


        this.ui.territoryNameInput
            .removeEventListener(
                'keydown',
                this.handleTerritoryNameKeyDown
            )

        this.ui.territoryDivideButton
            .removeEventListener(
                'click',
                this.handleDivideTerritoryClick
            )

        this.clearTerritoryPreview()
    }


    // --------------------------------------------------
    // CREAR TERRITORIO
    // --------------------------------------------------

    public createTerritory(
        x: number,
        y: number
    ) {

        this.clearTerritoryPreview()


        const result =
            this.territoryManager.createAt(
                x,
                y,
                this.drawing.getPixels()
            )


        if (
            result.status ===
            'created'
        ) {

            this.editorBridge
                ?.commitHistory({
                    type:
                        'create-territory',

                    territoryId:
                        result.territory.id,

                    seedX:
                        result.seedX,

                    seedY:
                        result.seedY,
                })


            this.ui.statusMessage.textContent =
                `Territorio #${result.territory.id} creado`

            return
        }


        if (
            result.status ===
            'existing'
        ) {

            this.ui.statusMessage.textContent =
                `${result.territory.name} (#${result.territory.id})`

            return
        }


        if (
            result.status ===
            'not-closed'
        ) {

            this.ui.statusMessage.textContent =
                '⚠ La región no está cerrada'

            return
        }


        this.ui.statusMessage.textContent =
            'No se pudo crear el territorio'
    }


    // --------------------------------------------------
    // SELECCIONAR TERRITORIO
    // --------------------------------------------------

    public selectTerritory(
        x: number,
        y: number
    ) {

        const territory =
            this.territoryManager.getAt(
                x,
                y
            )


        if (
            territory === null
        ) {

            this.clearTerritorySelection()


            this.ui.statusMessage.textContent =
                'No hay ningún territorio aquí'

            return
        }

        this.selectedTerritoryIdValue =
            territory.id

        this.showSelectedTerritory()

        this.ui.statusMessage.textContent =
            `${territory.name} (#${territory.id})`
    }


    // --------------------------------------------------
    // MOSTRAR SELECCIÓN
    // --------------------------------------------------

    public refreshTerritorySelection() {

        if (
            this.selectedTerritoryId ===
            null
        ) {
            return
        }


        const territory =
            this.territoryManager.getById(
                this.selectedTerritoryId
            )


        if (
            territory === null
        ) {

            this.clearTerritorySelection()

            return
        }


        this.showSelectedTerritory()
    }


    private showSelectedTerritory() {

        if (
            this.selectedTerritoryId ===
            null
        ) {

            this.clearTerritorySelection()

            return
        }


        const territory =
            this.territoryManager.getById(
                this.selectedTerritoryId
            )


        if (
            territory === null
        ) {

            this.clearTerritorySelection()

            return
        }


        this.ui.territoryIdValue.textContent =
            territory.id.toString()


        this.ui.territoryNameInput.value =
            territory.name


        this.ui.territoryPanel
            .classList.remove(
                'hidden'
            )


        this.editorBridge
            ?.refreshTerritoryCountrySelect(
                territory.id
            )
    }


    public clearTerritorySelection() {

        this.selectedTerritoryIdValue =
            null


        this.ui.territoryPanel
            .classList.add(
                'hidden'
            )


        this.ui.territoryIdValue.textContent =
            '-'


        this.ui.territoryNameInput.value =
            ''


        this.editorBridge
            ?.refreshTerritoryCountrySelect(
                null
            )
    }


    // --------------------------------------------------
    // RENOMBRAR
    // --------------------------------------------------

    private saveTerritoryName() {

        if (
            this.selectedTerritoryId ===
            null
        ) {
            return
        }


        const territory =
            this.territoryManager.getById(
                this.selectedTerritoryId
            )


        if (
            territory === null
        ) {

            this.clearTerritorySelection()

            return
        }


        const newName =
            this.ui
                .territoryNameInput
                .value
                .trim()


        if (
            newName.length === 0
        ) {

            this.ui.statusMessage.textContent =
                'El territorio debe tener un nombre'


            this.ui.territoryNameInput.value =
                territory.name

            return
        }


        if (
            newName === territory.name
        ) {
            return
        }


        const renamed =
            this.territoryManager.rename(
                territory.id,
                newName
            )


        if (
            renamed === null
        ) {
            return
        }


        this.editorBridge
            ?.commitHistory({
                type:
                    'rename-territory',

                territoryId:
                    territory.id,

                name:
                    newName,
            })


        this.ui.statusMessage.textContent =
            `Territorio #${territory.id} renombrado a "${newName}"`


        this.showSelectedTerritory()
    }


    private handleTerritorySaveClick =
        () => {

            this.saveTerritoryName()
        }


    private handleTerritoryCloseClick =
        () => {

            this.clearTerritorySelection()
        }


    private handleTerritoryNameKeyDown =
        (
            event: KeyboardEvent
        ) => {

            if (
                event.key ===
                'Enter'
            ) {

                event.preventDefault()

                this.saveTerritoryName()
            }
        }


    // --------------------------------------------------
    // ELIMINAR TERRITORIO
    // --------------------------------------------------

    private handleDeleteTerritoryClick =
        () => {

            if (
                this.geographyLocked
            ) {

                this.ui.statusMessage.textContent =
                    'Reabrí la geografía para eliminar territorios'

                return
            }


            if (
                this.selectedTerritoryId ===
                null
            ) {
                return
            }


            const territory =
                this.territoryManager.getById(
                    this.selectedTerritoryId
                )


            if (
                territory === null
            ) {
                return
            }


            const shouldDelete =
                window.confirm(
                    `¿Eliminar el territorio "${territory.name}"?`
                )


            if (
                !shouldDelete
            ) {
                return
            }


            const territoryId =
                territory.id


            const deletedTerritory =
                this.territoryManager.delete(
                    territoryId
                )


            if (
                deletedTerritory === null
            ) {
                return
            }


            this.territoryControlManager.assign(
                territoryId,
                null
            )


            this.editorBridge
                ?.commitHistory({
                    type:
                        'delete-territory',

                    territoryId,
                })


            this.clearTerritoryPreview()

            this.clearTerritorySelection()


            this.ui.statusMessage.textContent =
                `Territorio "${deletedTerritory.name}" eliminado`
        }


    // --------------------------------------------------
    // LIMPIAR MAPA
    // --------------------------------------------------

    private handleClearClick =
        () => {

            if (
                this.geographyLocked
            ) {

                this.ui.statusMessage.textContent =
                    'La geografía está finalizada'

                return
            }


            this.editorBridge
                ?.commitHistory({
                    type:
                        'clear',
                })


            this.drawing.clear()

            /*
             * No reseteamos el contador histórico
             * de IDs.
             */
            this.territoryManager.reset(
                false
            )

            this.territoryControlManager.reset()

            this.clearTerritorySelection()

            this.clearTerritoryPreview()


            this.editorBridge
                ?.refreshPoliticsUI()


            this.ui.statusMessage.textContent =
                'Mapa limpiado'
        }


    // --------------------------------------------------
    // PREVIEW
    // --------------------------------------------------

    public scheduleTerritoryPreview(
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
                            'territory'
                    ) {

                        this.preview.clear()

                        return
                    }


                    this.updateTerritoryPreview(
                        position.x,
                        position.y
                    )
                },
                50
            )
    }


    private updateTerritoryPreview(
        x: number,
        y: number
    ) {

        const region =
            this.territoryManager
                .findAvailableRegionAt(
                    x,
                    y,
                    this.drawing.getPixels()
                )


        if (
            region === null
        ) {

            this.preview.clear()

            return
        }


        this.preview.showRegion(
            region,
            TERRITORY_CREATION_PREVIEW_COLOR
        )
    }


    public clearTerritoryPreview() {

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


    // --------------------------------------------------
    // LOCK GEOGRÁFICO
    // --------------------------------------------------

    private handleGeographyLockClick =
        () => {

            if (
                this.geographyLocked
            ) {

                this.unlockGeography()

                return
            }


            this.lockGeography()
        }


    private lockGeography() {

        this.geographyLocked =
            true


        this.timelineController
            .initializeIfNeeded()


        this.clearTerritoryPreview()


        const tool =
            this.editorBridge
                ?.getCurrentTool()


        if (
            tool === 'pencil' ||
            tool === 'eraser' ||
            tool === 'territory' ||
            tool === 'divide-territory'
        ) {

            this.editorBridge?.setTool(
                'select'
            )
        }


        this.updateLockUI()


        this.editorBridge
            ?.updateProjectDirtyState()


        this.ui.statusMessage.textContent =
            'Geografía finalizada'
    }


    private unlockGeography() {

        this.geographyLocked =
            false


        if (
            this.timelineController
                .isInitialized &&
            this.editorBridge
                ?.getCurrentTool() ===
                'assign-country'
        ) {

            this.editorBridge.setTool(
                'select'
            )
        }


        this.updateLockUI()


        this.editorBridge
            ?.updateProjectDirtyState()


        this.ui.statusMessage.textContent =
            'Geografía editable'
    }


    public updateLockUI() {

        const locked =
            this.geographyLocked


        this.ui.pencilButton.disabled =
            locked

        this.ui.eraserButton.disabled =
            locked

        this.ui.territoryButton.disabled =
            locked

        this.ui.brushSizeInput.disabled =
            locked

        this.ui.clearButton.disabled =
            locked

        this.ui.territoryDeleteButton.disabled =
            locked

        this.ui.territoryDivideButton.disabled =
            locked


        this.ui.geographyLockButton.textContent =
            locked
                ? '✏ Editar geografía'
                : '✓ Finalizar geografía'


        this.ui.workspace.classList.toggle(
            'geography-locked',
            locked
        )


        this.timelineController.setVisible(
            locked
        )


        const historicalPoliticsDisabled =
            this.timelineController
                .isInitialized &&
            !locked


        this.ui.assignCountryButton.disabled =
            historicalPoliticsDisabled


        this.ui.territoryCountrySelect.disabled =
            historicalPoliticsDisabled
    }


    // --------------------------------------------------
    // INICIAR DIVISIÓN
    // --------------------------------------------------

    private handleDivideTerritoryClick =
        () => {

            if (
                this.geographyLocked
            ) {

                this.ui.statusMessage.textContent =
                    'Reabrí la geografía para dividir territorios'

                return
            }

            if (
                this.selectedTerritoryIdValue ===
                null
            ) {
                return
            }

            const territory =
                this.territoryManager.getById(
                    this.selectedTerritoryIdValue
                )

            if (
                territory === null
            ) {
                return
            }

            this.splittingTerritoryId =
                territory.id

            this.editorBridge?.setTool(
                'divide-territory'
            )

            this.ui.territoryPanel
                .classList.add(
                    'hidden'
                )

            this.clearTerritoryPreview()

            this.ui.statusMessage.textContent =
                `Dividiendo "${territory.name}": dibujá una línea de borde a borde`
        }


    // --------------------------------------------------
    // INICIAR TRAZO DE DIVISIÓN
    // --------------------------------------------------
    public startTerritorySplitStroke(
        x: number,
        y: number,
        brushSize: number
    ): boolean {

        if (
            this.splittingTerritoryId ===
            null
        ) {
            return false
        }


        this.drawing.startStroke(
            x,
            y,
            'pencil',
            brushSize
        )


        return true
    }


    public cancelTerritorySplit() {

        this.splittingTerritoryId =
            null
    }

    // --------------------------------------------------
    // RESET
    // --------------------------------------------------

    public reset() {

        this.geographyLocked =
            false


        this.selectedTerritoryIdValue =
            null


        this.clearTerritoryPreview()

        this.clearTerritorySelection()

        this.updateLockUI()
    }


    // --------------------------------------------------
    // TERMINAR DIVISIÓN
    // --------------------------------------------------

    public async finishTerritorySplit(
        stroke: StrokeCommand
    ) {

        const territoryId =
            this.splittingTerritoryId


        if (
            territoryId === null
        ) {
            return
        }


        const result =
            this.territoryManager.split(
                territoryId,
                this.drawing.getPixels()
            )


        // --------------------------------
        // DIVISIÓN INVÁLIDA
        // --------------------------------

        if (
            result.status !==
            'split'
        ) {

            await this.editorBridge
                ?.redrawHistory()


            if (
                result.status ===
                'not-divided'
            ) {

                this.ui.statusMessage.textContent =
                    'La línea no divide completamente el territorio. Dibujala de borde a borde.'
            }

            else if (
                result.status ===
                'too-many-parts'
            ) {

                this.ui.statusMessage.textContent =
                    'La línea genera más de dos regiones. Intentá una división más simple.'
            }

            else {

                this.ui.statusMessage.textContent =
                    'No se pudo dividir el territorio'
            }


            /*
            * Seguimos en modo división para
            * permitir otro intento.
            */
            return
        }


        // --------------------------------
        // HISTORIA DEL TERRITORIO NUEVO
        // --------------------------------

        const historicalSplit =
            this.timelineController
                .isInitialized


        if (
            historicalSplit
        ) {

            this.timelineController
                .registerTerritorySplit(
                    result.newTerritoryId,
                    territoryId
                )
        }


        const countryId =
            historicalSplit
                ? this.timelineController
                    .getTerritoryOwnerAtCurrentDate(
                        result.newTerritoryId
                    )
                : this.territoryControlManager
                    .getCountryId(
                        territoryId
                    )


        this.territoryControlManager.assign(
            result.newTerritoryId,
            countryId
        )


        this.editorBridge
            ?.applyTerritoryCountryColor(
                result.newTerritoryId,
                countryId
            )


        // --------------------------------
        // HISTORY
        // --------------------------------

        this.editorBridge
            ?.commitHistory({
                type:
                    'split-territory',

                territoryId,

                newTerritoryId:
                    result.newTerritoryId,

                stroke,
            })


        // --------------------------------
        // SALIR DEL MODO DIVISIÓN
        // --------------------------------

        this.splittingTerritoryId =
            null


        this.clearTerritorySelection()


        this.editorBridge?.setTool(
            'select'
        )


        this.ui.statusMessage.textContent =
            `Territorio dividido: se creó Territorio ${result.newTerritoryId}`
    }


    // --------------------------------------------------
    // RECONCILIAR TERRITORIOS CON FRONTERAS
    // --------------------------------------------------

    public reconcileTerritoriesAfterBorderChange(
        registerTimeline = true
    ) {

        const result =
            this.territoryManager
                .reconcileWithBorders(
                    this.drawing.getPixels()
                )

        if (
            result.status !==
            'reconciled'
        ) {
            return result
        }

        // --------------------------------
        // CAPTURAR HERENCIA POLÍTICA
        // --------------------------------

        const inheritedCountries =
            result.createdTerritories.map(
                created => ({
                    territoryId:
                        created.territoryId,

                    countryId:
                        this.territoryControlManager
                            .getCountryId(
                                created.sourceTerritoryId
                            ),
                })
            )

        // --------------------------------
        // HISTORIA / LINAJE
        // --------------------------------

        if (
            registerTimeline &&
            this.timelineController
                .isInitialized
        ) {

            for (
                const created of
                result.createdTerritories
            ) {

                this.timelineController
                    .registerTerritorySplit(
                        created.territoryId,
                        created.sourceTerritoryId
                    )
            }
        }

        // --------------------------------
        // TERRITORIOS ELIMINADOS
        // --------------------------------

        for (
            const territoryId of
            result.deletedTerritoryIds
        ) {

            this.territoryControlManager.assign(
                territoryId,
                null
            )
        }

        // --------------------------------
        // NUEVOS TERRITORIOS
        // --------------------------------

        for (
            const inherited of
            inheritedCountries
        ) {

            if (
                inherited.countryId ===
                null
            ) {
                continue
            }

            this.territoryControlManager.assign(
                inherited.territoryId,
                inherited.countryId
            )

            this.editorBridge
                ?.applyTerritoryCountryColor(
                    inherited.territoryId,
                    inherited.countryId
                )
        }

        return result
    }


    // --------------------------------------------------
    // TERMINAR EDICIÓN NORMAL DE FRONTERAS
    // --------------------------------------------------

    public async finishBorderStroke(
        stroke: StrokeCommand
    ) {

        const result =
            this.reconcileTerritoriesAfterBorderChange(
                true
            )

        // --------------------------------
        // EDICIÓN INVÁLIDA
        // --------------------------------

        if (
            result.status ===
            'open-region'
        ) {

            await this.editorBridge
                ?.redrawHistory()

            this.ui.statusMessage.textContent =
                'La edición dejaría un territorio abierto. Se descartó el cambio.'

            return
        }

        /*
        * El stroke entra al historial solamente
        * después de comprobar que es válido.
        */
        this.editorBridge
            ?.commitHistory(
                stroke
            )

        this.editorBridge
            ?.refreshPoliticsUI()

        this.refreshTerritorySelection()

        if (
            result.createdTerritories.length >
            0
        ) {

            const createdIds =
                result.createdTerritories
                    .map(
                        item =>
                            `#${item.territoryId}`
                    )
                    .join(
                        ', '
                    )

            this.ui.statusMessage.textContent =
                `Frontera actualizada. Nuevos territorios: ${createdIds}`

            return
        }

        if (
            result.deletedTerritoryIds.length >
            0
        ) {

            this.ui.statusMessage.textContent =
                'Frontera actualizada. Se fusionaron territorios.'

            return
        }

        this.ui.statusMessage.textContent =
            'Frontera actualizada'
    }
}