import type {
    EditorUI,
} from '../ui/createUI'

import {
    ProjectManager,
} from './ProjectManager'

import {
    LocalProjectStore,
} from './LocalProjectStore'

import type {
    LocalProjectRecord,
} from './LocalProjectStore'

import {
    HistoryManager,
} from '../history/HistoryManager'


const LAST_LOCAL_PROJECT_KEY =
    'map-creator-last-project-id'


export type ProjectEditorBridge = {

    getGeographyLocked:
        () => boolean

    applyLoadedProject:
        (
            geographyLocked: boolean
        ) => void

    resetForNewProject:
        () => void
}


export class ProjectController {

    private ui:
        EditorUI

    private projectManager:
        ProjectManager

    private localProjectStore:
        LocalProjectStore

    private historyManager:
        HistoryManager

    private editorBridge:
        ProjectEditorBridge | null =
        null

    private started =
        false

    private historyBaseProjectJson:
        string | null = null

    private currentLocalProjectId:
        string | null = null

    private projectDirty =
        false

    private savedHistoryStateId =
        0

    private savedGeographyLocked =
        false

    private savedProjectName =
        'Mi mapa'

    private requiresLocalSave =
        false


    constructor(
        ui: EditorUI,
        projectManager: ProjectManager,
        localProjectStore:
            LocalProjectStore,
        historyManager:
            HistoryManager
    ) {

        this.ui =
            ui

        this.projectManager =
            projectManager

        this.localProjectStore =
            localProjectStore

        this.historyManager =
            historyManager
    }


    // --------------------------------------------------
    // CONEXIÓN CON EL EDITOR
    // --------------------------------------------------

    public setEditorBridge(
        bridge: ProjectEditorBridge
    ) {

        this.editorBridge =
            bridge
    }


    // --------------------------------------------------
    // INICIAR
    // --------------------------------------------------

    public start() {

        if (
            this.started
        ) {
            return
        }


        this.started =
            true


        this.ui.exportMapButton
            .addEventListener(
                'click',
                this.handleExportMapClick
            )


        this.ui.importMapButton
            .addEventListener(
                'click',
                this.handleImportMapClick
            )


        this.ui.importMapInput
            .addEventListener(
                'change',
                this.handleImportMapChange
            )


        this.ui.saveLocalProjectButton
            .addEventListener(
                'click',
                this.handleSaveLocalProjectClick
            )


        this.ui.localProjectsButton
            .addEventListener(
                'click',
                this.handleLocalProjectsClick
            )


        this.ui.localProjectsCloseButton
            .addEventListener(
                'click',
                this.handleLocalProjectsCloseClick
            )


        this.ui.projectNameInput
            .addEventListener(
                'input',
                this.handleProjectNameInput
            )


        this.ui.newProjectButton
            .addEventListener(
                'click',
                this.handleNewProjectClick
            )


        window.addEventListener(
            'beforeunload',
            this.handleBeforeUnload
        )


        this.markCurrentStateAsSaved()


        void this.restoreLastLocalProject()
    }


    // --------------------------------------------------
    // DETENER
    // --------------------------------------------------

    public stop() {

        if (
            !this.started
        ) {
            return
        }


        this.started =
            false


        this.ui.exportMapButton
            .removeEventListener(
                'click',
                this.handleExportMapClick
            )


        this.ui.importMapButton
            .removeEventListener(
                'click',
                this.handleImportMapClick
            )


        this.ui.importMapInput
            .removeEventListener(
                'change',
                this.handleImportMapChange
            )


        this.ui.saveLocalProjectButton
            .removeEventListener(
                'click',
                this.handleSaveLocalProjectClick
            )


        this.ui.localProjectsButton
            .removeEventListener(
                'click',
                this.handleLocalProjectsClick
            )


        this.ui.localProjectsCloseButton
            .removeEventListener(
                'click',
                this.handleLocalProjectsCloseClick
            )


        this.ui.projectNameInput
            .removeEventListener(
                'input',
                this.handleProjectNameInput
            )


        this.ui.newProjectButton
            .removeEventListener(
                'click',
                this.handleNewProjectClick
            )


        window.removeEventListener(
            'beforeunload',
            this.handleBeforeUnload
        )
    }


    // --------------------------------------------------
    // RESTAURAR BASE PARA UNDO / REDO
    // --------------------------------------------------

    public async restoreHistoryBase():
        Promise<boolean> {

        if (
            this.historyBaseProjectJson ===
            null
        ) {
            return false
        }


        await this.projectManager
            .importFromJson(
                this.historyBaseProjectJson
            )


        return true
    }


    // --------------------------------------------------
    // ESTADO DIRTY
    // --------------------------------------------------

    public updateDirtyState() {

        const geographyLocked =
            this.editorBridge
                ?.getGeographyLocked()
            ?? false


        this.projectDirty =
            this.requiresLocalSave
            ||
            (
                this.historyManager.stateId !==
                this.savedHistoryStateId
            )
            ||
            (
                geographyLocked !==
                this.savedGeographyLocked
            )
            ||
            (
                this.getProjectName() !==
                this.savedProjectName
            )


        this.updateProjectSaveStateUI()
    }


    private markCurrentStateAsSaved() {

        this.savedHistoryStateId =
            this.historyManager.stateId


        this.savedGeographyLocked =
            this.editorBridge
                ?.getGeographyLocked()
            ?? false


        this.savedProjectName =
            this.getProjectName()


        this.projectDirty =
            false


        this.updateProjectSaveStateUI()
    }


    private updateProjectSaveStateUI() {

        this.ui.projectSaveState
            .classList.toggle(
                'dirty',
                this.projectDirty
            )


        if (
            this.projectDirty
        ) {

            this.ui.projectSaveState.textContent =
                '● Sin guardar'

            return
        }


        if (
            this.currentLocalProjectId !==
            null
        ) {

            this.ui.projectSaveState.textContent =
                'Guardado'

            return
        }


        this.ui.projectSaveState.textContent =
            'Sin cambios'
    }


    // --------------------------------------------------
    // NOMBRE
    // --------------------------------------------------

    private getProjectName():
        string {

        const name =
            this.ui.projectNameInput
                .value
                .trim()


        if (
            name.length === 0
        ) {
            return 'Mi mapa'
        }


        return name
    }


    private handleProjectNameInput =
        () => {

            this.updateDirtyState()
        }


    // --------------------------------------------------
    // EXPORTAR
    // --------------------------------------------------

    private handleExportMapClick =
        () => {

            try {

                const json =
                    this.projectManager
                        .exportToJson(
                            this.editorBridge
                                ?.getGeographyLocked()
                            ?? false,

                            this.getProjectName()
                        )


                const blob =
                    new Blob(
                        [
                            json,
                        ],
                        {
                            type:
                                'application/json',
                        }
                    )


                const url =
                    URL.createObjectURL(
                        blob
                    )


                const link =
                    document.createElement(
                        'a'
                    )


                link.href =
                    url


                const safeName =
                    this.getProjectName()
                        .replace(
                            /[^a-z0-9áéíóúüñ_-]+/gi,
                            '-'
                        )
                        .replace(
                            /^-+|-+$/g,
                            ''
                        )


                link.download =
                    `${safeName || 'mapa'}.json`


                link.click()


                URL.revokeObjectURL(
                    url
                )


                this.ui.statusMessage.textContent =
                    'Mapa exportado correctamente'
            }

            catch (error) {

                console.error(
                    error
                )


                this.ui.statusMessage.textContent =
                    'No se pudo exportar el mapa'
            }
        }


    // --------------------------------------------------
    // IMPORTAR
    // --------------------------------------------------

    private handleImportMapClick =
        () => {

            this.ui.importMapInput.click()
        }


    private handleImportMapChange =
        async () => {

            const file =
                this.ui.importMapInput
                    .files?.[0]


            if (
                file === undefined
            ) {
                return
            }


            const shouldImport =
                this.confirmDiscardUnsavedChanges(
                    `Importar "${file.name}"`
                )


            if (
                !shouldImport
            ) {

                this.ui.importMapInput.value =
                    ''

                return
            }


            try {

                const json =
                    await file.text()


                const result =
                    await this.projectManager
                        .importFromJson(
                            json
                        )


                this.currentLocalProjectId =
                    null


                this.forgetLastLocalProject()


                this.ui.projectNameInput.value =
                    result.name


                this.historyBaseProjectJson =
                    this.projectManager
                        .exportToJson(
                            result.geographyLocked,
                            result.name
                        )


                this.historyManager.reset()


                this.editorBridge
                    ?.applyLoadedProject(
                        result.geographyLocked
                    )


                this.savedHistoryStateId =
                    this.historyManager.stateId


                this.savedGeographyLocked =
                    result.geographyLocked


                this.savedProjectName =
                    this.getProjectName()


                /*
                 * Está importado, pero todavía
                 * no está guardado en IndexedDB.
                 */
                this.requiresLocalSave =
                    true


                this.updateDirtyState()


                this.ui.statusMessage.textContent =
                    `Mapa "${file.name}" importado correctamente`
            }

            catch (error) {

                console.error(
                    error
                )


                this.ui.statusMessage.textContent =
                    'No se pudo importar el mapa'
            }

            finally {

                this.ui.importMapInput.value =
                    ''
            }
        }


    // --------------------------------------------------
    // GUARDAR LOCAL
    // --------------------------------------------------

    private handleSaveLocalProjectClick =
        async () => {

            try {

                const name =
                    this.getProjectName()


                const json =
                    this.projectManager
                        .exportToJson(
                            this.editorBridge
                                ?.getGeographyLocked()
                            ?? false,

                            name
                        )


                const record =
                    await this.localProjectStore
                        .save(
                            this.currentLocalProjectId,
                            name,
                            json
                        )


                this.currentLocalProjectId =
                    record.id


                this.rememberLastLocalProject(
                    record.id
                )


                this.ui.projectNameInput.value =
                    record.name


                this.requiresLocalSave =
                    false


                this.markCurrentStateAsSaved()


                this.ui.statusMessage.textContent =
                    `Mapa "${record.name}" guardado`


                if (
                    !this.ui.localProjectsPanel
                        .classList
                        .contains(
                            'hidden'
                        )
                ) {

                    await this.refreshLocalProjectsUI()
                }
            }

            catch (error) {

                console.error(
                    error
                )


                this.ui.statusMessage.textContent =
                    'No se pudo guardar el mapa'
            }
        }


    // --------------------------------------------------
    // PANEL DE MAPAS LOCALES
    // --------------------------------------------------

    private handleLocalProjectsClick =
        async () => {

            const isOpen =
                !this.ui.localProjectsPanel
                    .classList
                    .contains(
                        'hidden'
                    )


            if (
                isOpen
            ) {

                this.ui.localProjectsPanel
                    .classList.add(
                        'hidden'
                    )

                return
            }


            await this.refreshLocalProjectsUI()


            this.ui.localProjectsPanel
                .classList.remove(
                    'hidden'
                )
        }


    private handleLocalProjectsCloseClick =
        () => {

            this.ui.localProjectsPanel
                .classList.add(
                    'hidden'
                )
        }


    private async refreshLocalProjectsUI() {

        const projects =
            await this.localProjectStore
                .getAll()


        this.ui.localProjectsList
            .replaceChildren()


        if (
            projects.length === 0
        ) {

            const empty =
                document.createElement(
                    'span'
                )


            empty.textContent =
                'Todavía no hay mapas guardados.'


            this.ui.localProjectsList
                .append(
                    empty
                )


            return
        }


        for (
            const project of
            projects
        ) {

            this.ui.localProjectsList
                .append(
                    this.createLocalProjectItem(
                        project
                    )
                )
        }
    }


    private createLocalProjectItem(
        project: LocalProjectRecord
    ): HTMLElement {

        const item =
            document.createElement(
                'div'
            )


        item.className =
            'local-project-item'


        const info =
            document.createElement(
                'div'
            )


        info.className =
            'local-project-info'


        const name =
            document.createElement(
                'span'
            )


        name.className =
            'local-project-name'

        name.textContent =
            project.name


        const date =
            document.createElement(
                'span'
            )


        date.className =
            'local-project-date'

        date.textContent =
            `Modificado: ${
                new Date(
                    project.updatedAt
                ).toLocaleString()
            }`


        info.append(
            name,
            date
        )


        const actions =
            document.createElement(
                'div'
            )


        actions.className =
            'local-project-actions'


        const loadButton =
            document.createElement(
                'button'
            )


        loadButton.type =
            'button'

        loadButton.textContent =
            'Abrir'


        loadButton.addEventListener(
            'click',
            () => {

                void this.loadLocalProject(
                    project
                )
            }
        )


        const deleteButton =
            document.createElement(
                'button'
            )


        deleteButton.type =
            'button'

        deleteButton.textContent =
            '🗑'


        deleteButton.addEventListener(
            'click',
            () => {

                void this.deleteLocalProject(
                    project
                )
            }
        )


        actions.append(
            loadButton,
            deleteButton
        )


        item.append(
            info,
            actions
        )


        return item
    }


    // --------------------------------------------------
    // CARGAR
    // --------------------------------------------------

    private async loadLocalProject(
        project: LocalProjectRecord,
        askBeforeReplace = true
    ) {

        if (
            askBeforeReplace
        ) {

            const shouldLoad =
                this.confirmDiscardUnsavedChanges(
                    `Abrir "${project.name}"`
                )


            if (
                !shouldLoad
            ) {
                return
            }
        }


        try {

            const result =
                await this.projectManager
                    .importFromJson(
                        project.json
                    )


            this.historyBaseProjectJson =
                this.projectManager
                    .exportToJson(
                        result.geographyLocked,
                        result.name
                    )


            this.historyManager.reset()


            this.currentLocalProjectId =
                project.id


            this.requiresLocalSave =
                false


            this.rememberLastLocalProject(
                project.id
            )


            this.ui.projectNameInput.value =
                result.name


            this.editorBridge
                ?.applyLoadedProject(
                    result.geographyLocked
                )


            this.markCurrentStateAsSaved()


            this.ui.localProjectsPanel
                .classList.add(
                    'hidden'
                )


            this.ui.statusMessage.textContent =
                `Mapa "${result.name}" cargado`
        }

        catch (error) {

            console.error(
                error
            )


            this.ui.statusMessage.textContent =
                'No se pudo cargar el mapa'
        }
    }


    // --------------------------------------------------
    // ELIMINAR GUARDADO
    // --------------------------------------------------

    private async deleteLocalProject(
        project: LocalProjectRecord
    ) {

        const shouldDelete =
            window.confirm(
                `¿Eliminar "${project.name}" de los mapas guardados?`
            )


        if (
            !shouldDelete
        ) {
            return
        }


        try {

            await this.localProjectStore
                .delete(
                    project.id
                )


            if (
                this.currentLocalProjectId ===
                project.id
            ) {

                this.currentLocalProjectId =
                    null


                this.requiresLocalSave =
                    true


                this.forgetLastLocalProject()


                this.updateDirtyState()
            }


            await this.refreshLocalProjectsUI()


            this.ui.statusMessage.textContent =
                `Mapa "${project.name}" eliminado del almacenamiento`
        }

        catch (error) {

            console.error(
                error
            )


            this.ui.statusMessage.textContent =
                'No se pudo eliminar el mapa'
        }
    }


    // --------------------------------------------------
    // NUEVO PROYECTO
    // --------------------------------------------------

    private handleNewProjectClick =
        () => {

            const shouldCreate =
                this.confirmDiscardUnsavedChanges(
                    'Crear un mapa nuevo'
                )


            if (
                !shouldCreate
            ) {
                return
            }


            this.createNewProject()
        }


    private createNewProject() {

        this.editorBridge
            ?.resetForNewProject()


        this.currentLocalProjectId =
            null


        this.requiresLocalSave =
            false


        this.forgetLastLocalProject()


        this.historyBaseProjectJson =
            null


        this.historyManager.reset()


        this.ui.projectNameInput.value =
            'Mi mapa'


        this.ui.localProjectsPanel
            .classList.add(
                'hidden'
            )


        this.markCurrentStateAsSaved()


        this.ui.statusMessage.textContent =
            'Nuevo mapa creado'
    }


    // --------------------------------------------------
    // CAMBIOS SIN GUARDAR
    // --------------------------------------------------

    private confirmDiscardUnsavedChanges(
        action: string
    ): boolean {

        if (
            !this.projectDirty
        ) {
            return true
        }


        return window.confirm(
            `Hay cambios sin guardar.\n\n${action} descartará esos cambios.\n\n¿Continuar?`
        )
    }


    private handleBeforeUnload =
        (
            event: BeforeUnloadEvent
        ) => {

            if (
                !this.projectDirty
            ) {
                return
            }


            event.preventDefault()

            event.returnValue =
                ''
        }


    // --------------------------------------------------
    // ÚLTIMO PROYECTO
    // --------------------------------------------------

    private rememberLastLocalProject(
        projectId: string
    ) {

        localStorage.setItem(
            LAST_LOCAL_PROJECT_KEY,
            projectId
        )
    }


    private forgetLastLocalProject() {

        localStorage.removeItem(
            LAST_LOCAL_PROJECT_KEY
        )
    }


    private getLastLocalProjectId():
        string | null {

        return localStorage.getItem(
            LAST_LOCAL_PROJECT_KEY
        )
    }


    private async restoreLastLocalProject() {

        const projectId =
            this.getLastLocalProjectId()


        if (
            projectId === null
        ) {
            return
        }


        try {

            const project =
                await this.localProjectStore
                    .getById(
                        projectId
                    )


            if (
                project === null
            ) {

                this.forgetLastLocalProject()

                return
            }


            await this.loadLocalProject(
                project,
                false
            )


            this.ui.statusMessage.textContent =
                `Mapa "${project.name}" restaurado`
        }

        catch (error) {

            console.error(
                'No se pudo restaurar el último mapa',
                error
            )


            this.ui.statusMessage.textContent =
                'No se pudo restaurar el último mapa'
        }
    }
}