// newRecords = menuChange

export function updateRecordDebt(setNewRecords, index, newDebt) {
  setNewRecords((prev) => ({
    ...prev,
    records: prev.records.map((item, i) => (i === index ? { ...item, debt: newDebt } : item)),
  }))
}

export function updateRecordRemark(setNewRecords, index, newRemark) {
  setNewRecords((prev) => ({
    ...prev,
    records: prev.records.map((item, i) => (i === index ? { ...item, remark: newRemark } : item)),
  }))
} // void

export function deleteRecord(setNewRecords, indexToDelete) {
  setNewRecords((prev) => ({
    ...prev,
    records: prev.records.filter((_, index) => index !== indexToDelete),
  }))
} // void

export function getUserInfo(users, targetUid) {
  const user = users.find((u) => u.uid === targetUid)

  return {
    uid: targetUid,
    name: user ? user.name : '未知用戶',
    photo: user ? user.photo : '/gray-icon.png',
  }
}

export function checkConflict(newRecords, newBorrower, newDebtor) {
  if (newBorrower === newDebtor) {
    alert('債務人與債權人不能為同一人！')
    return true
  }
  const isConflict = newRecords.records.some((record) => {
    const participants = [record.borrower, record.debtor]
    return participants.includes(newBorrower) && participants.includes(newDebtor)
  })
  if (isConflict) {
    alert('這兩個人之間已經有既存的紀錄了')
  }
  return isConflict
}

export function getFixedOrder(str1, str2) {
  return [str1, str2].sort((a, b) => a.localeCompare(b))
} // type [firstUid, secondUid]

export function mergeDebtArrays(oldArray = [], newArray) {
  const map = new Map()
  // 確保 oldArray 是數組，避免 undefined 報錯
  ;(oldArray || []).forEach((item) => {
    const key = `${item.first}_${item.second}`
    map.set(key, { ...item })
  })

  newArray.forEach((newItem) => {
    const key = `${newItem.first}_${newItem.second}`
    if (map.has(key)) {
      const existing = map.get(key)
      existing.debt += newItem.debt
    } else {
      map.set(key, { ...newItem })
    }
  })
  return Array.from(map.values())
}

export function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function formatTimestamp(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${month}/${day} ${hours}:${minutes}`
}
