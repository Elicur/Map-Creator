import type {
    HistoryCommand,
} from '../types/editor'

import type {
    EditorUI,
} from '../ui/createUI'

import {
    HistoryManager,
} from './HistoryManager'

import {
    CameraController,
} from '../editor/CameraController'

import {
    DrawingController,
} from '../editor/DrawingController'

import {
    TerritoryManager,
} from '../map/TerritoryManager'

import {
    CountryManager,
} from '../map/CountryManager'

import {
    TerritoryControlManager,
} from '../map/TerritoryControlManager'

import {
    ProjectController,
} from '../project/ProjectController'

import {
    PoliticsController,
} from '../editor/PoliticsController'

import {
    GeographyController,
} from '../editor/GeographyController'


export class EditorHistoryController {

    private ui:
        EditorUI

    private historyManager:
        HistoryManager

    private camera:
        CameraController

    private drawing:
        DrawingController

    private territoryManager:
        TerritoryManager

    private countryManager:
        CountryManager

    private territoryControlManager:
        TerritoryControlManager

    private projectController:
        ProjectController

    private politicsController:
        PoliticsController

    private geographyController:
        GeographyController

    private rebuildingHistory =
        false


    constructor(
        ui: EditorUI,
        historyManager: HistoryManager,
        camera: CameraController,
        drawing: DrawingController,
        territoryManager: TerritoryManager,
        countryManager: CountryManager,
        territoryControlManager:
            TerritoryControlManager,
        projectController:
            ProjectController,
        politicsController:
            PoliticsController,
        geographyController:
            GeographyController
    ) {

        this.ui =
            ui

        this.historyManager =
            historyManager

        this.camera =
            camera

        this.drawing =
            drawing

        this.territoryManager =
            territoryManager

        this.countryManager =
            countryManager

        this.territoryControlManager =
            territoryControlManager

        this.projectController =
            projectController

        this.politicsController =
            politicsController

        this.geographyController =
            geographyController
    }


    // --------------------------------------------------
    // ESTADO
    // --------------------------------------------------

    public get isRebuilding():
        boolean {

        return this.rebuildingHistory
    }


    // --------------------------------------------------
    // REGISTRAR COMANDO
    // --------------------------------------------------

    public commit(
        command: HistoryCommand
    ) {

        this.historyManager.push(
            command
        )


        this.projectController
            .updateDirtyState()
    }


    // --------------------------------------------------
    // UNDO
    // --------------------------------------------------

    public async undo() {

        if (
            this.rebuildingHistory ||
            this.drawing.isDrawing ||
            this.camera.isPanning
        ) {
            return
        }


        const nextCommand =
            this.historyManager.peekUndo()


        if (
            nextCommand === null
        ) {
            return
        }


        if (
            this.geographyController
                .isLocked &&
            this.isGeographyCommand(
                nextCommand
            )
        ) {

            this.ui.statusMessage.textContent =
                'Reabrí la geografía para deshacer este cambio'

            return
        }


        const command =
            this.historyManager.undo()


        if (
            command === null
        ) {
            return
        }


        await this.redrawHistory()


        this.projectController
            .updateDirtyState()


        this.showHistoryMessage(
            command,
            'undo'
        )
    }


    // --------------------------------------------------
    // REDO
    // --------------------------------------------------

    public async redo() {

        if (
            this.rebuildingHistory ||
            this.drawing.isDrawing ||
            this.camera.isPanning
        ) {
            return
        }


        const nextCommand =
            this.historyManager.peekRedo()


        if (
            nextCommand === null
        ) {
            return
        }


        if (
            this.geographyController
                .isLocked &&
            this.isGeographyCommand(
                nextCommand
            )
        ) {

            this.ui.statusMessage.textContent =
                'Reabrí la geografía para rehacer este cambio'

            return
        }


        const command =
            this.historyManager.redo()


        if (
            command === null
        ) {
            return
        }


        await this.redrawHistory()


        this.projectController
            .updateDirtyState()


        this.showHistoryMessage(
            command,
            'redo'
        )
    }


    // --------------------------------------------------
    // RECONSTRUIR HISTORIAL
    // --------------------------------------------------

    public async redrawHistory() {

        if (
            this.rebuildingHistory
        ) {
            return
        }


        this.rebuildingHistory =
            true


        try {

            this.geographyController
                .clearTerritoryPreview()


            this.politicsController
                .clearAssignmentPreview()


            // --------------------------------
            // RESTAURAR ESTADO BASE
            // --------------------------------

            const restoredBase =
                await this.projectController
                    .restoreHistoryBase()


            if (
                !restoredBase
            ) {

                this.drawing.clear()


                /*
                 * No reutilizamos IDs históricos.
                 */
                this.territoryManager.reset(
                    false
                )


                this.countryManager.reset()

                this.territoryControlManager.reset()
            }


            // --------------------------------
            // REPRODUCIR COMANDOS
            // --------------------------------

            for (
                const command of
                this.historyManager.commands
            ) {

                // -----------------------------
                // TRAZO
                // -----------------------------

                if (
                    command.type ===
                    'stroke'
                ) {

                    this.drawing.renderStroke(
                        command
                    )


                    const result =
                        this.geographyController
                            .reconcileTerritoriesAfterBorderChange(
                                false
                            )


                    if (
                        result.status !==
                        'reconciled'
                    ) {

                        throw new Error(
                            'El historial contiene una edición geográfica inválida'
                        )
                    }


                    continue
                }


                // -----------------------------
                // LIMPIAR
                // -----------------------------

                if (
                    command.type ===
                    'clear'
                ) {

                    this.drawing.clear()


                    /*
                     * Importante:
                     *
                     * Clear no vuelve el allocator
                     * histórico de IDs a 1.
                     */
                    this.territoryManager.reset(
                        false
                    )


                    this.territoryControlManager.reset()


                    continue
                }


                // -----------------------------
                // CREAR TERRITORIO
                // -----------------------------

                if (
                    command.type ===
                    'create-territory'
                ) {

                    this.territoryManager.recreate(
                        command.territoryId,
                        command.seedX,
                        command.seedY,
                        this.drawing.getPixels()
                    )


                    continue
                }


                // -----------------------------
                // ELIMINAR TERRITORIO
                // -----------------------------

                if (
                    command.type ===
                    'delete-territory'
                ) {

                    this.territoryManager.delete(
                        command.territoryId
                    )


                    this.territoryControlManager.assign(
                        command.territoryId,
                        null
                    )


                    continue
                }


                // -----------------------------
                // DIVIDIR TERRITORIO
                // -----------------------------

                if (
                    command.type ===
                    'split-territory'
                ) {

                    /*
                     * Recreamos primero la
                     * frontera de división.
                     */
                    this.drawing.renderStroke(
                        command.stroke
                    )


                    const result =
                        this.territoryManager.split(
                            command.territoryId,
                            this.drawing.getPixels(),
                            command.newTerritoryId
                        )


                    if (
                        result.status ===
                        'split'
                    ) {

                        const countryId =
                            this.territoryControlManager
                                .getCountryId(
                                    command.territoryId
                                )


                        this.territoryControlManager.assign(
                            command.newTerritoryId,
                            countryId
                        )


                        this.politicsController
                            .applyTerritoryCountryColor(
                                command.newTerritoryId,
                                countryId
                            )
                    }


                    continue
                }


                // -----------------------------
                // RENOMBRAR TERRITORIO
                // -----------------------------

                if (
                    command.type ===
                    'rename-territory'
                ) {

                    this.territoryManager.rename(
                        command.territoryId,
                        command.name
                    )


                    continue
                }


                // -----------------------------
                // CREAR PAÍS
                // -----------------------------

                if (
                    command.type ===
                    'create-country'
                ) {

                    this.countryManager.recreate(
                        command.countryId,
                        command.name,
                        command.color
                    )


                    continue
                }


                // -----------------------------
                // ASIGNAR PAÍS
                // -----------------------------

                if (
                    command.type ===
                    'assign-territory-country'
                ) {

                    this.territoryControlManager.assign(
                        command.territoryId,
                        command.countryId
                    )


                    this.politicsController
                        .applyTerritoryCountryColor(
                            command.territoryId,
                            command.countryId
                        )


                    continue
                }


                // -----------------------------
                // ACTUALIZAR PAÍS
                // -----------------------------

                if (
                    command.type ===
                    'update-country'
                ) {

                    this.countryManager.update(
                        command.countryId,
                        command.name,
                        command.color
                    )


                    this.politicsController
                        .recolorCountryTerritories(
                            command.countryId
                        )


                    continue
                }


                // -----------------------------
                // ELIMINAR PAÍS
                // -----------------------------

                if (
                    command.type ===
                    'delete-country'
                ) {

                    const territoryIds =
                        this.territoryControlManager
                            .getTerritoryIdsByCountryId(
                                command.countryId
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


                    this.countryManager.delete(
                        command.countryId
                    )
                }
            }


            // --------------------------------
            // REFRESCAR UI
            // --------------------------------

            this.politicsController
                .refreshUI()


            this.geographyController
                .refreshTerritorySelection()
        }

        finally {

            this.rebuildingHistory =
                false
        }
    }


    // --------------------------------------------------
    // COMANDO GEOGRÁFICO
    // --------------------------------------------------

    private isGeographyCommand(
        command: HistoryCommand
    ): boolean {

        return (
            command.type === 'stroke' ||
            command.type === 'create-territory' ||
            command.type === 'clear' ||
            command.type === 'delete-territory' ||
            command.type === 'split-territory'
        )
    }


    // --------------------------------------------------
    // MENSAJE UNDO / REDO
    // --------------------------------------------------

    private showHistoryMessage(
        command: HistoryCommand,
        action: 'undo' | 'redo'
    ) {

        const prefix =
            action === 'undo'
                ? 'Deshecho'
                : 'Rehecho'


        if (
            command.type ===
            'rename-territory'
        ) {

            const territory =
                this.territoryManager.getById(
                    command.territoryId
                )


            if (
                territory !== null
            ) {

                this.ui.statusMessage.textContent =
                    `${prefix}: Territorio #${territory.id} ahora se llama "${territory.name}"`
            }


            return
        }


        if (
            command.type ===
            'create-territory'
        ) {

            this.ui.statusMessage.textContent =
                action === 'undo'
                    ? `Deshecho: creación del Territorio #${command.territoryId}`
                    : `Rehecho: creación del Territorio #${command.territoryId}`

            return
        }


        if (
            command.type ===
            'split-territory'
        ) {

            this.ui.statusMessage.textContent =
                action === 'undo'
                    ? 'División de territorio deshecha'
                    : 'División de territorio rehecha'

            return
        }


        if (
            command.type ===
            'delete-territory'
        ) {

            this.ui.statusMessage.textContent =
                action === 'undo'
                    ? `Deshecho: eliminación del Territorio #${command.territoryId}`
                    : `Rehecho: eliminación del Territorio #${command.territoryId}`

            return
        }


        if (
            command.type ===
            'assign-territory-country'
        ) {

            const currentCountryId =
                this.territoryControlManager
                    .getCountryId(
                        command.territoryId
                    )


            if (
                currentCountryId === null
            ) {

                this.ui.statusMessage.textContent =
                    `${prefix}: Territorio #${command.territoryId} quedó sin país`

                return
            }


            const country =
                this.countryManager.getById(
                    currentCountryId
                )


            if (
                country !== null
            ) {

                this.ui.statusMessage.textContent =
                    `${prefix}: Territorio #${command.territoryId} pertenece a "${country.name}"`
            }


            return
        }


        if (
            command.type ===
            'clear'
        ) {

            this.ui.statusMessage.textContent =
                action === 'undo'
                    ? 'Deshecho: limpiar mapa'
                    : 'Rehecho: limpiar mapa'

            return
        }


        if (
            command.type ===
            'stroke'
        ) {

            this.ui.statusMessage.textContent =
                action === 'undo'
                    ? 'Deshecho: trazo'
                    : 'Rehecho: trazo'

            return
        }


        if (
            command.type ===
            'update-country'
        ) {

            const country =
                this.countryManager.getById(
                    command.countryId
                )


            if (
                country !== null
            ) {

                this.ui.statusMessage.textContent =
                    `${prefix}: "${country.name}" actualizado`
            }


            return
        }


        if (
            command.type ===
            'delete-country'
        ) {

            const country =
                this.countryManager.getById(
                    command.countryId
                )


            if (
                action === 'undo' &&
                country !== null
            ) {

                this.ui.statusMessage.textContent =
                    `Deshecho: volvió "${country.name}"`

                return
            }


            this.ui.statusMessage.textContent =
                'Rehecho: país eliminado'
        }
    }
}