import type {
    HistoryCommand,
} from '../types/editor'


export class HistoryManager {

    private history: HistoryCommand[] = []
    private redoHistory: HistoryCommand[] = []

    private historyStateIds: number[] = []
    private redoStateIds: number[] = []

    private baseStateId = 0
    private nextStateId = 1


    // --------------------------------------------------
    // ESTADO ACTUAL
    // --------------------------------------------------

    public get stateId(): number {

        if (
            this.historyStateIds.length === 0
        ) {
            return this.baseStateId
        }


        return this.historyStateIds[
            this.historyStateIds.length - 1
        ]
    }


    // --------------------------------------------------
    // AGREGAR ACCIÓN
    // --------------------------------------------------

    public push(
        command: HistoryCommand
    ) {
        this.history.push(
            command
        )

        
        this.historyStateIds.push(
            this.nextStateId++
        )

        /*
         * Si hacemos una acción nueva después
         * de haber usado Undo, ya no podemos
         * rehacer las acciones anteriores.
         */
        this.redoHistory = []

        this.redoStateIds = []
    }


    // --------------------------------------------------
    // UNDO
    // --------------------------------------------------

    public undo(): HistoryCommand | null {

        const command =
            this.history.pop()

        const stateId =
            this.historyStateIds.pop()

        if (command === undefined || 
            stateId === undefined
        ) {
            return null
        }

        this.redoHistory.push(
            command
        )

        this.redoStateIds.push(
            stateId
        )

        return command
    }


    // --------------------------------------------------
    // REDO
    // --------------------------------------------------

    public redo(): HistoryCommand | null {

        const command =
            this.redoHistory.pop()

        const stateId =
            this.redoStateIds.pop()

        if (
            command === undefined ||
            stateId === undefined
        ) {
            return null
        }

        this.history.push(
            command
        )

        this.historyStateIds.push(
            stateId
        )

        return command
    }


    // --------------------------------------------------
    // COMANDOS ACTIVOS
    // --------------------------------------------------

    public get commands(): readonly HistoryCommand[] {

        return this.history
    }


    // --------------------------------------------------
    // ESTADO
    // --------------------------------------------------

    public get canUndo(): boolean {

        return (
            this.history.length > 0
        )
    }


    public get canRedo(): boolean {

        return (
            this.redoHistory.length > 0
        )
    }


    // --------------------------------------------------
    // RESET COMPLETO
    // --------------------------------------------------

    public reset() {

        this.history = []
        this.redoHistory = []

        this.historyStateIds = []
        this.redoStateIds = []

        /*
         * Un nuevo baseline nunca comparte
         * identidad con el anterior.
         */
        this.baseStateId = this.nextStateId++
    }


    // --------------------------------------------------
    // PEEK
    // --------------------------------------------------

    public peekUndo(): HistoryCommand | null {

        return (
            this.history[
                this.history.length - 1
            ]
            ?? null
        )
    }


    public peekRedo(): HistoryCommand | null {

        return (
            this.redoHistory[
                this.redoHistory.length - 1
            ]
            ?? null
        )
    }
}