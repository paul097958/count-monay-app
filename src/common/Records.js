class Records {
  constructor(title, description) {
    this.title = title
    this.description = description
    this.records = []
    this.users = []
  }

  setRecord(borrower, debtor, debt, remark) {
    if (this.records) {
      const conflict = this.#checkConflict()
      if (conflict.status) {
        this.records.push({ borrower, debtor, debt, remark })
        const users = [...new Set(this.records.flatMap((item) => [item.borrower, item.debtor]))]
        this.users = users
        return conflict
      } else {
        return conflict
      }
    }
  }

  deleteRecord(borrower, debtor, indexOfData) {
    let recordsTmp = []
    if (indexOfData) {
      recordsTmp = this.records.filter((_, index) => index !== indexOfData)
    } else {
      recordsTmp = this.records.filter((item) => item.borrower !== borrower && item.debtor !== debtor)
    }
    if (this.records === recordsTmp) {
      return {
        status: false,
        message: '未有任何更改',
      }
    } else {
      const users = [...new Set(this.records.flatMap((item) => [item.borrower, item.debtor]))]
      this.users = users
      return {
        status: true,
      }
    }
  }

  updateRecordDebt(borrower, debtor, indexOfData, newDebt) {
    let recordsTmp = []
    if (indexOfData) {
      recordsTmp = this.records.map((item, i) => (i === indexOfData ? { ...item, remark: newDebt } : item))
    } else {
      recordsTmp = this.records.map((item) => {
        if (item.borrower === borrower && item.debtor === debtor) {
          return { ...item, debt: newDebt }
        } else {
          return item
        }
      })
    }
    if (this.records === recordsTmp) {
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

  updateRecordRemark(borrower, debtor, indexOfData, newRemark) {
    let recordsTmp = []
    if (indexOfData) {
      recordsTmp = this.records.map((item, i) => (i === indexOfData ? { ...item, remark: newRemark } : item))
    } else {
      recordsTmp = this.records.map((item) => {
        if (item.borrower === borrower && item.debtor === debtor) {
          return { ...item, debt: newRemark }
        } else {
          return item
        }
      })
    }
    if (this.records === recordsTmp) {
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

  #checkConflict(newBorrower, newDebtor) {
    if (newBorrower === newDebtor) {
      return {
        status: false,
        message: '債務人與債權人不能為同一人！',
      }
    }
    const isConflict = this.records.some((record) => {
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
}
