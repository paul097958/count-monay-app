export default class Records {
    #title
    #description
    #records
    #titleStore
    #descriptionStore
    #recordsStore
    #dispatch

    constructor(title, description, records, dispatch) {
        this.#title = title
        this.#description = description
        this.#records = records
        this.#titleStore = title
        this.#descriptionStore = description
        this.#recordsStore = [...records]
        this.users = []
        this.#dispatch = dispatch
    }

    get title() {
        return this.#title
    }

    get description() {
        return this.#description
    }

    get records() {
        return this.#records
    }

    set title(input) {
        this.#title = input
        this.#setState()
    }

    set description(input) {
        this.#description = input
        this.#setState()
    }

    set records({ borrower, debtor, debt, remark }) {
        if (this.records) {
            const conflict = this.#checkConflict(borrower, debtor)
            if (conflict.status) {
                this.#records.push({ borrower, debtor, debt, remark })
                const users = [...new Set(this.#records.flatMap((item) => [item.borrower, item.debtor]))]
                this.users = users
                this.#setState()
                return conflict
            } else {
                return conflict
            }
        }
    }

    getMessageData(recordData, method) {
        return {
            title: this.#title,
            description: this.#description,
            origin: recordData,
            change: this.#records,
            method: method
        }
    }

    getOldRecords() {
        return this.#recordsStore
    }

    undoAllChanges() {
        const users = [...new Set(this.#records.flatMap((item) => [item.borrower, item.debtor]))]
        this.#dispatch({
            action: 'set_recordMenu_incomplete',
            value: {
                title: this.#titleStore,
                description: this.#descriptionStore,
                records: this.#recordsStore,
            },
        })
        this.#title = this.#titleStore
        this.#description = this.#descriptionStore
        this.#records = this.#recordsStore
        this.users = users
        this.#setState()
    }

    deleteAllRecords() {
        this.#records = []
    }

    deleteRecord(indexOfData, borrower, debtor) {
        let recordsTmp = []
        if (indexOfData !== null) {
            recordsTmp = this.#records.filter((_, index) => index !== indexOfData)
        } else {
            recordsTmp = this.#records.filter((item) => item.borrower !== borrower && item.debtor !== debtor)
        }
        if (this.#areEqual(this.#records, recordsTmp)) {
            return {
                status: false,
                message: '未有任何更改',
            }
        } else {
            this.#records = recordsTmp
            const users = [...new Set(this.#records.flatMap((item) => [item.borrower, item.debtor]))]
            this.users = users
            this.#setState()
            return {
                status: true,
            }
        }
    }

    updateRecordDebt(indexOfData, newDebt, borrower, debtor) {
        let recordsTmp = []
        if (indexOfData !== null) {
            recordsTmp = this.#records.map((item, i) => (i === indexOfData ? { ...item, debt: newDebt } : item))
        } else {
            recordsTmp = this.#records.map((item) => {
                if (item.borrower === borrower && item.debtor === debtor) {
                    return { ...item, debt: newDebt }
                } else {
                    return item
                }
            })
        }
        this.#records = recordsTmp
        this.#setState()
        if (this.#areEqual(this.#records, recordsTmp)) {
            return {
                status: false,
                message: '未有任何更改',
            }
        } else {
            return {
                status: true,
            }
        }
    }

    updateRecordRemark(indexOfData, newRemark, borrower, debtor) {
        let recordsTmp = []
        if (indexOfData !== null) {
            recordsTmp = this.#records.map((item, i) => (i === indexOfData ? { ...item, remark: newRemark } : item))
        } else {
            recordsTmp = this.#records.map((item) => {
                if (item.borrower === borrower && item.debtor === debtor) {
                    return { ...item, remark: newRemark }
                } else {
                    return item
                }
            })
        }
        this.#records = recordsTmp
        this.#setState()
        if (this.#areEqual(this.#records, recordsTmp)) {
            return {
                status: false,
                message: '未有任何更改',
            }
        } else {
            return {
                status: true,
            }
        }
    }

    #setState() {
        this.#dispatch({
            type: 'set_recordMenu_incomplete',
            value: {
                title: this.#title,
                description: this.#description,
                records: this.#records,
            },
        })
    }

    #checkConflict(newBorrower, newDebtor) {
        if (newBorrower === newDebtor) {
            return {
                status: false,
                message: '債務人與債權人不能為同一人！',
            }
        }
        const isConflict = this.#records.some((record) => {
            const participants = [record.borrower, record.debtor]
            return participants.includes(newBorrower) && participants.includes(newDebtor)
        })
        if (isConflict)
            return {
                status: false,
                message: '這兩個人之間已經有既存的紀錄了',
            }
        return {
            status: true,
        }
    }

    #areEqual(a, b) {
        a.length === b.length && a.every((val, index) => val === b[index])
    }
}
