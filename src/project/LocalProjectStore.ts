export type LocalProjectRecord = {
    id: string
    name: string
    json: string
    createdAt: number
    updatedAt: number
}


const DATABASE_NAME =
    'map-creator'

const DATABASE_VERSION =
    1

const STORE_NAME =
    'projects'


export class LocalProjectStore {

    private databasePromise:
        Promise<IDBDatabase> | null = null


    // --------------------------------------------------
    // BASE DE DATOS
    // --------------------------------------------------

    private getDatabase():
        Promise<IDBDatabase> {

        if (
            this.databasePromise !== null
        ) {
            return this.databasePromise
        }


        this.databasePromise =
            new Promise(
                (
                    resolve,
                    reject
                ) => {

                    const request =
                        indexedDB.open(
                            DATABASE_NAME,
                            DATABASE_VERSION
                        )


                    request.onupgradeneeded =
                        () => {

                            const database =
                                request.result


                            if (
                                !database.objectStoreNames.contains(
                                    STORE_NAME
                                )
                            ) {

                                const store =
                                    database.createObjectStore(
                                        STORE_NAME,
                                        {
                                            keyPath: 'id',
                                        }
                                    )


                                store.createIndex(
                                    'updatedAt',
                                    'updatedAt'
                                )
                            }
                        }


                    request.onsuccess =
                        () => {

                            resolve(
                                request.result
                            )
                        }


                    request.onerror =
                        () => {

                            reject(
                                request.error
                            )
                        }
                }
            )


        return this.databasePromise
    }


    // --------------------------------------------------
    // GUARDAR
    // --------------------------------------------------

    public async save(
        projectId: string | null,
        name: string,
        json: string
    ): Promise<LocalProjectRecord> {

        const database =
            await this.getDatabase()


        const now =
            Date.now()


        let existing:
            LocalProjectRecord | null = null


        if (
            projectId !== null
        ) {

            existing =
                await this.getById(
                    projectId
                )
        }


        const record:
            LocalProjectRecord = {

            id:
                existing?.id
                ?? crypto.randomUUID(),

            name,

            json,

            createdAt:
                existing?.createdAt
                ?? now,

            updatedAt:
                now,
        }


        await new Promise<void>(
            (
                resolve,
                reject
            ) => {

                const transaction =
                    database.transaction(
                        STORE_NAME,
                        'readwrite'
                    )


                const store =
                    transaction.objectStore(
                        STORE_NAME
                    )


                store.put(
                    record
                )


                transaction.oncomplete =
                    () => resolve()


                transaction.onerror =
                    () => {

                        reject(
                            transaction.error
                        )
                    }
            }
        )


        return record
    }


    // --------------------------------------------------
    // OBTENER UNO
    // --------------------------------------------------

    public async getById(
        projectId: string
    ): Promise<LocalProjectRecord | null> {

        const database =
            await this.getDatabase()


        return new Promise(
            (
                resolve,
                reject
            ) => {

                const transaction =
                    database.transaction(
                        STORE_NAME,
                        'readonly'
                    )


                const store =
                    transaction.objectStore(
                        STORE_NAME
                    )


                const request =
                    store.get(
                        projectId
                    )


                request.onsuccess =
                    () => {

                        resolve(
                            request.result
                            ?? null
                        )
                    }


                request.onerror =
                    () => {

                        reject(
                            request.error
                        )
                    }
            }
        )
    }


    // --------------------------------------------------
    // OBTENER TODOS
    // --------------------------------------------------

    public async getAll():
        Promise<LocalProjectRecord[]> {

        const database =
            await this.getDatabase()


        const records =
            await new Promise<LocalProjectRecord[]>(
                (
                    resolve,
                    reject
                ) => {

                    const transaction =
                        database.transaction(
                            STORE_NAME,
                            'readonly'
                        )


                    const store =
                        transaction.objectStore(
                            STORE_NAME
                        )


                    const request =
                        store.getAll()


                    request.onsuccess =
                        () => {

                            resolve(
                                request.result
                            )
                        }


                    request.onerror =
                        () => {

                            reject(
                                request.error
                            )
                        }
                }
            )


        records.sort(
            (
                a,
                b
            ) =>
                b.updatedAt -
                a.updatedAt
        )


        return records
    }


    // --------------------------------------------------
    // ELIMINAR
    // --------------------------------------------------

    public async delete(
        projectId: string
    ): Promise<void> {

        const database =
            await this.getDatabase()


        await new Promise<void>(
            (
                resolve,
                reject
            ) => {

                const transaction =
                    database.transaction(
                        STORE_NAME,
                        'readwrite'
                    )


                const store =
                    transaction.objectStore(
                        STORE_NAME
                    )


                store.delete(
                    projectId
                )


                transaction.oncomplete =
                    () => resolve()


                transaction.onerror =
                    () => {

                        reject(
                            transaction.error
                        )
                    }
            }
        )
    }
}