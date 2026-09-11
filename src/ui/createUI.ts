import {
    MAP_WIDTH,
    MAP_HEIGHT,
} from '../config/mapConfig'


export type EditorUI = {
    workspace: HTMLElement
    mapContainer: HTMLDivElement

    borderCanvas: HTMLCanvasElement
    previewCanvas: HTMLCanvasElement
    territoryCanvas: HTMLCanvasElement

    pencilButton: HTMLButtonElement
    eraserButton: HTMLButtonElement
    territoryButton: HTMLButtonElement
    selectButton: HTMLButtonElement

    clearButton: HTMLButtonElement
    resetViewButton: HTMLButtonElement

    brushSizeInput: HTMLInputElement
    brushSizeValue: HTMLSpanElement

    zoomValue: HTMLSpanElement
    statusMessage: HTMLSpanElement

    territoryPanel: HTMLElement
    territoryIdValue: HTMLSpanElement
    territoryNameInput: HTMLInputElement
    territorySaveButton: HTMLButtonElement
    territoryCloseButton: HTMLButtonElement

    countriesButton: HTMLButtonElement
    territoryCountrySelect: HTMLSelectElement
    countryPanel: HTMLElement
    countryCloseButton: HTMLButtonElement
    countryNameInput: HTMLInputElement
    countryColorInput: HTMLInputElement
    createCountryButton: HTMLButtonElement
    countryList: HTMLElement
    geographyLockButton: HTMLButtonElement

    selectedCountryEditor: HTMLElement

    selectedCountryNameInput: HTMLInputElement
    selectedCountryColorInput: HTMLInputElement

    saveCountryButton: HTMLButtonElement
    assignCountryButton: HTMLButtonElement
    deleteCountryButton: HTMLButtonElement

    exportMapButton: HTMLButtonElement
    importMapButton: HTMLButtonElement
    importMapInput: HTMLInputElement

    projectNameInput: HTMLInputElement

    saveLocalProjectButton: HTMLButtonElement
    localProjectsButton: HTMLButtonElement

    localProjectsPanel: HTMLElement
    localProjectsCloseButton: HTMLButtonElement
    localProjectsList: HTMLElement
}


export function createUI(): EditorUI {

    const app =
        document.querySelector<HTMLDivElement>('#app')

    if (app === null) {
        throw new Error(
            'No se encontró el elemento #app'
        )
    }


    app.innerHTML = `
        <div class="app">

            <header class="toolbar">

                <!-- ==================================================
                    FILA 1: HERRAMIENTAS DEL MAPA
                    ================================================== -->

                <div class="toolbar-row">

                    <div class="toolbar-group">

                        <button
                            id="pencilButton"
                            class="active"
                        >
                            ✏️ Lápiz
                        </button>

                        <button id="eraserButton">
                            🧽 Borrar
                        </button>

                        <button id="territoryButton">
                            🗺️ Territorio
                        </button>

                        <button id="selectButton">
                            🔍 Seleccionar
                        </button>

                        <button id="countriesButton">
                            🏳️ Países
                        </button>

                    </div>


                    <div class="toolbar-separator"></div>


                    <div class="toolbar-group">

                        <label class="brush-control">
                            Grosor

                            <input
                                id="brushSize"
                                type="range"
                                min="1"
                                max="30"
                                value="3"
                            />

                            <span id="brushSizeValue">
                                3
                            </span>
                        </label>

                    </div>


                    <div class="toolbar-separator"></div>


                    <div class="toolbar-group">

                        <span class="zoom-info">
                            Zoom:
                            <strong id="zoomValue">
                                100%
                            </strong>
                        </span>

                        <button id="resetViewButton">
                            Centrar vista
                        </button>

                    </div>


                    <div class="toolbar-separator"></div>


                    <div class="toolbar-group">

                        <button id="clearButton">
                            Limpiar mapa
                        </button>

                        <button id="geographyLockButton">
                            ✓ Finalizar geografía
                        </button>

                    </div>

                </div>


                <!-- ==================================================
                    FILA 2: PROYECTO / ARCHIVOS
                    ================================================== -->

                <div class="toolbar-row toolbar-project-row">

                    <div class="toolbar-group">

                        <span class="toolbar-label">
                            Proyecto:
                        </span>

                        <input
                            id="projectNameInput"
                            class="project-name-input"
                            type="text"
                            maxlength="100"
                            value="Mi mapa"
                            aria-label="Nombre del mapa"
                        />

                        <button id="saveLocalProjectButton">
                            💾 Guardar
                        </button>

                        <button id="localProjectsButton">
                            📁 Mis mapas
                        </button>

                    </div>


                    <div class="toolbar-separator"></div>


                    <div class="toolbar-group">

                        <button id="exportMapButton">
                            ⬇️ Exportar
                        </button>

                        <button id="importMapButton">
                            ⬆️ Importar
                        </button>

                        <input
                            id="importMapInput"
                            type="file"
                            accept=".json,application/json"
                            hidden
                        />

                    </div>


                    <div class="toolbar-status">

                        <span
                            id="statusMessage"
                            class="status-message"
                        >
                            Herramienta: Lápiz
                        </span>

                    </div>

                </div>

            </header>


            <main
                id="workspace"
                class="workspace"
            >

                <div
                    id="mapContainer"
                    class="map-container"
                >

                    <canvas
                        id="territoryCanvas"
                        width="${MAP_WIDTH}"
                        height="${MAP_HEIGHT}"
                    ></canvas>

                    <canvas
                        id="previewCanvas"
                        width="${MAP_WIDTH}"
                        height="${MAP_HEIGHT}"
                    ></canvas>

                    <canvas
                        id="borderCanvas"
                        width="${MAP_WIDTH}"
                        height="${MAP_HEIGHT}"
                    ></canvas>

                </div>

            </main> 

            <aside
                id="territoryPanel"
                class="territory-panel hidden"
            >
                <div class="territory-panel-header">

                    <strong>
                        Territorio
                    </strong>

                    <button
                        id="territoryCloseButton"
                        class="territory-panel-close"
                        title="Cerrar"
                    >
                        ✕
                    </button>

                </div>

                <div class="territory-field">

                    <label>
                        ID
                    </label>

                    <span id="territoryIdValue">
                        -
                    </span>

                </div>

                <div class="territory-field">

                    <label for="territoryNameInput">
                        Nombre
                    </label>

                    <input
                        id="territoryNameInput"
                        type="text"
                        maxlength="100"
                    />

                </div>

                <div class="territory-field">

                    <label for="territoryCountrySelect">
                        País
                    </label>

                    <select id="territoryCountrySelect">

                        <option value="">
                            Sin país
                        </option>

                    </select>

                </div>

                <button
                    id="territorySaveButton"
                    class="territory-save-button"
                >
                    Guardar nombre
                </button>

            </aside>

            <aside
                id="countryPanel"
                class="country-panel hidden"
            >

                <div class="territory-panel-header">

                    <strong>
                        Países
                    </strong>

                    <button
                        id="countryCloseButton"
                        class="territory-panel-close"
                        title="Cerrar"
                    >
                        ✕
                    </button>

                </div>


                <div class="territory-field">

                    <label for="countryNameInput">
                        Nombre
                    </label>

                    <input
                        id="countryNameInput"
                        type="text"
                        maxlength="100"
                        placeholder="Ej: Reino del Norte"
                    />

                </div>


                <div class="territory-field">

                    <label for="countryColorInput">
                        Color
                    </label>

                    <input
                        id="countryColorInput"
                        type="color"
                        value="#3f7ad6"
                    />

                </div>


                <button
                    id="createCountryButton"
                    class="territory-save-button"
                >
                    Crear país
                </button>


                <div
                    id="countryList"
                    class="country-list"
                ></div>


                <div
                    id="selectedCountryEditor"
                    class="selected-country-editor hidden"
                >

                    <hr />

                    <strong>
                        País seleccionado
                    </strong>


                    <div class="territory-field">

                        <label for="selectedCountryNameInput">
                            Nombre
                        </label>

                        <input
                            id="selectedCountryNameInput"
                            type="text"
                            maxlength="100"
                        />

                    </div>


                    <div class="territory-field">

                        <label for="selectedCountryColorInput">
                            Color
                        </label>

                        <input
                            id="selectedCountryColorInput"
                            type="color"
                        />

                    </div>


                    <button id="saveCountryButton">
                        Guardar cambios
                    </button>


                    <button id="assignCountryButton">
                        Asignar territorios
                    </button>


                    <button
                        id="deleteCountryButton"
                        class="danger-button"
                    >
                        Eliminar país
                    </button>

                </div>

            </aside>

            <aside
                id="localProjectsPanel"
                class="local-projects-panel hidden"
            >

                <div class="territory-panel-header">

                    <strong>
                        Mis mapas
                    </strong>

                    <button
                        id="localProjectsCloseButton"
                        class="territory-panel-close"
                        title="Cerrar"
                    >
                        ✕
                    </button>

                </div>


                <div
                    id="localProjectsList"
                    class="local-projects-list"
                ></div>

            </aside>

        </div>
  `


    return {
        workspace:
            getElement<HTMLElement>(
                '#workspace'
            ),

        mapContainer:
            getElement<HTMLDivElement>(
                '#mapContainer'
            ),

        borderCanvas:
            getElement<HTMLCanvasElement>(
                '#borderCanvas'
            ),

        previewCanvas:
            getElement<HTMLCanvasElement>(
                '#previewCanvas'
            ),

        territoryCanvas:
            getElement<HTMLCanvasElement>(
                '#territoryCanvas'
            ),

        pencilButton:
            getElement<HTMLButtonElement>(
                '#pencilButton'
            ),

        eraserButton:
            getElement<HTMLButtonElement>(
                '#eraserButton'
            ),

        territoryButton:
            getElement<HTMLButtonElement>(
                '#territoryButton'
            ),

        selectButton:
            getElement<HTMLButtonElement>(
                '#selectButton'
            ),

        countriesButton:
            getElement<HTMLButtonElement>(
                '#countriesButton'
            ),
        
        territoryCountrySelect:
            getElement<HTMLSelectElement>(
                '#territoryCountrySelect'
            ),

        clearButton:
            getElement<HTMLButtonElement>(
                '#clearButton'
            ),

        geographyLockButton:
            getElement<HTMLButtonElement>(
                '#geographyLockButton'
            ),

        resetViewButton:
            getElement<HTMLButtonElement>(
                '#resetViewButton'
            ),

        brushSizeInput:
            getElement<HTMLInputElement>(
                '#brushSize'
            ),

        brushSizeValue:
            getElement<HTMLSpanElement>(
                '#brushSizeValue'
            ),

        zoomValue:
            getElement<HTMLSpanElement>(
                '#zoomValue'
            ),

        statusMessage:
            getElement<HTMLSpanElement>(
                '#statusMessage'
            ),

        territoryPanel:
            getElement<HTMLElement>(
                '#territoryPanel'
            ),

        territoryIdValue:
            getElement<HTMLSpanElement>(
                '#territoryIdValue'
            ),

        territoryNameInput:
            getElement<HTMLInputElement>(
                '#territoryNameInput'
            ),

        territorySaveButton:
            getElement<HTMLButtonElement>(
                '#territorySaveButton'
            ),

        territoryCloseButton:
            getElement<HTMLButtonElement>(
                '#territoryCloseButton'
            ),

        countryPanel:
            getElement<HTMLElement>(
                '#countryPanel'
            ),

        countryCloseButton:
            getElement<HTMLButtonElement>(
                '#countryCloseButton'
            ),

        countryNameInput:
            getElement<HTMLInputElement>(
                '#countryNameInput'
            ),

        countryColorInput:
            getElement<HTMLInputElement>(
                '#countryColorInput'
            ),

        createCountryButton:
            getElement<HTMLButtonElement>(
                '#createCountryButton'
            ),

        countryList:
            getElement<HTMLElement>(
                '#countryList'
            ),
        
        selectedCountryEditor:
            getElement<HTMLElement>(
                '#selectedCountryEditor'
            ),

        selectedCountryNameInput:
            getElement<HTMLInputElement>(
                '#selectedCountryNameInput'
            ),

        selectedCountryColorInput:
            getElement<HTMLInputElement>(
                '#selectedCountryColorInput'
            ),

        saveCountryButton:
            getElement<HTMLButtonElement>(
                '#saveCountryButton'
            ),

        assignCountryButton:
            getElement<HTMLButtonElement>(
                '#assignCountryButton'
            ),

        deleteCountryButton:
            getElement<HTMLButtonElement>(
                '#deleteCountryButton'
            ),
        
        exportMapButton:
            getElement<HTMLButtonElement>(
                '#exportMapButton'
            ),

        importMapButton:
            getElement<HTMLButtonElement>(
                '#importMapButton'
            ),

        importMapInput:
            getElement<HTMLInputElement>(
                '#importMapInput'
            ),
        
        projectNameInput:
            getElement<HTMLInputElement>(
                '#projectNameInput'
            ),

        saveLocalProjectButton:
            getElement<HTMLButtonElement>(
                '#saveLocalProjectButton'
            ),

        localProjectsButton:
            getElement<HTMLButtonElement>(
                '#localProjectsButton'
            ),

        localProjectsPanel:
            getElement<HTMLElement>(
                '#localProjectsPanel'
            ),

        localProjectsCloseButton:
            getElement<HTMLButtonElement>(
                '#localProjectsCloseButton'
            ),

        localProjectsList:
            getElement<HTMLElement>(
                '#localProjectsList'
            ),
    }
}


function getElement<T extends Element>(
    selector: string
): T {

    const element =
        document.querySelector<T>(
            selector
        )

    if (element === null) {
        throw new Error(
            `No se encontró el elemento ${selector}`
        )
    }

    return element
}