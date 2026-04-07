import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  runTransaction,
  startAfter,
  where,
  updateDoc,
} from 'firebase/firestore'
import { getUserInfo, formatTimestamp, numberWithCommas, getFixedOrder } from '../common/FunctionBase'
import { db } from '../config'
import { useMemo, useRef, useState, useContext } from 'react'
import { AppContext } from '../common/Reducer.js'

export default function Detail() {
  const context = useContext(AppContext)
  const separateTotalRef = useRef(new Map())
  const allTotalRef = useRef(new Map())
  const [userRecords, setUserRecords] = useState([])
  const [userRecordsStatic, setUserRecordsStatic] = useState([])
  const userRecordsRef = useRef()
  const userRecordsCacheRef = useRef()
  const [selectMode, setSelectMode] = useState('顯示全部')
  const [dateSelectMode, setDateSelectMode] = useState('')
  const [selectDate, setSelectDate] = useState('')
  const [recordsOrderStatus, setRecordsOrderStatus] = useState('desc')
  const getWhetherCorrect = useMemo(() => {
    return context.state.debtData
      .filter((item) => item.debt !== 0)
      .map((item) => item.debt)
      .reduce((sum, current) => sum + current, 0) === userRecordsStatic.reduce((sum, item) => sum + item.shouldGet, 0)
      ? '帳目正確'
      : '帳目有誤'
  }, [context.state.debtData, userRecordsStatic])

  async function saveDatabase(configRecords) {
    const docConfigRef = doc(db, context.userInfo.current.groupId, 'config')
    try {
      await updateDoc(docConfigRef, {
        records: configRecords,
      })
      alert('更改成功')
      console.log('交易成功：總帳與紀錄已同步更新')
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  function firebaseToDate(timestamp) {
    return timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
  }

  function filterData(mode) {
    if (mode === '') {
      setSelectDate(null)
      setDateSelectMode('')
      setUserRecords(userRecordsCacheRef.current)
      return
    }
    if (!selectDate) {
      alert('請先選擇日期')
      return
    }
    const targetDate = new Date(selectDate)

    setUserRecords(() => {
      return userRecordsCacheRef.current.filter((item) => {
        const itemDate = firebaseToDate(item.createdAt)
        if (mode === '之前') {
          return itemDate < targetDate
        } else {
          return itemDate >= targetDate
        }
      })
    })
  }

  async function getDocsByUserId() {
    try {
      const q = query(
        collection(db, context.userInfo.current.groupId),
        where('users', 'array-contains', context.userInfo.current.sub),
        orderBy('createdAt', 'desc'),
      )
      const querySnapshot = await getDocs(q)
      const data = querySnapshot.docs.map((doc) => {
        const docData = doc.data()
        let count = 0
        const borrowerFilter = docData.records.filter((item) => item.borrower === context.userInfo.current.sub)
        const debtorFilter = docData.records.filter((item) => item.debtor === context.userInfo.current.sub)
        borrowerFilter.forEach((item) => (count += item.debt))
        debtorFilter.forEach((item) => (count -= item.debt))
        return {
          id: doc.id,
          title: docData.title,
          description: docData.description,
          createdAt: docData.createdAt,
          detail: [...borrowerFilter, ...debtorFilter],
          users: docData.users,
          shouldGet: count,
        }
      })
      userRecordsRef.current = data
      userRecordsCacheRef.current = data
      setUserRecords(data)
      setUserRecordsStatic(data)
    } catch (error) {
      console.error('查詢失敗：', error)
    }
  }

  async function getAllDocs() {
    try {
      const q = query(collection(db, context.userInfo.current.groupId), orderBy('createdAt', 'desc'))
      const querySnapshot = await getDocs(q)
      querySnapshot.docs.forEach((doc) => {
        const docData = doc.data()
        docData.records.forEach((itemBody) => {
          const fixOrder = getFixedOrder(itemBody.borrower, itemBody.debtor)
          let syntax = 1
          if (fixOrder[0] === itemBody.borrower) {
            syntax = 1
          } else {
            syntax = -1
          }
          const key = `${fixOrder[0]}_${fixOrder[1]}`
          if (allTotalRef.current.has(key)) {
            const keyPreviousData = allTotalRef.current.get(key).debt
            allTotalRef.current.set(key, {
              first: fixOrder[0],
              second: fixOrder[1],
              debt: keyPreviousData + itemBody.debt * syntax,
            })
          } else {
            allTotalRef.current.set(key, {
              first: fixOrder[0],
              second: fixOrder[1],
              debt: itemBody.debt * syntax,
            })
          }
        })
      })
    } catch (error) {
      console.error('查詢失敗：', error)
    }
  }

  return (
    <div className="bg-light rounded border p-2 shadow shadow-sm mt-2">
      <div className="text-start">
        <p className="fs-4 fw-medium mb-0">帳目詳情</p>
        <p className="fw-light m-0" style={{ fontSize: '12px' }}>
          在這裡將顯示所有欠款與還款詳情
        </p>
      </div>
      {userRecordsStatic.length === 0 && (
        <button
          className={`btn btn-link mt-2 w-100 ${userRecords.length !== 0 ? 'd-none' : ''}`}
          type="button"
          onClick={async () => {
            await getDocsByUserId()
          }}
        >
          取得帳目
        </button>
      )}
      {userRecordsStatic.length !== 0 && (
        <div className="text-start mt-2">
          <p className="mb-0 d-flex align-items-center">
            你{userRecords.reduce((sum, item) => sum + item.shouldGet, 0) >= 0 ? '應得' : '應付'}
            <strong className="fs-1 mx-1">
              {Math.abs(userRecords.reduce((sum, item) => sum + item.shouldGet, 0))}
            </strong>
          </p>
          <p
            className={`fw-bold border p-1 text-center rounded shadow-sm mt-2 mb-3 ${getWhetherCorrect === '帳目正確' ? 'bg-success-subtle' : 'bg-danger-subtle'}`}
          >
            {getWhetherCorrect}
          </p>
          <p className="lh-sm">
            {userRecords.map((item, index) => {
              if (item.shouldGet >= 0) {
                return (
                  <>
                    {index === 0 ? '' : ' + '}
                    <strong>{Math.abs(item.shouldGet).toString()}</strong>
                  </>
                )
              } else {
                return (
                  <>
                    {' '}
                    - <strong>{Math.abs(item.shouldGet).toString()}</strong>
                  </>
                )
              }
            })}
          </p>
          {getWhetherCorrect === '帳目有誤' && (
            <button
              className="btn btn-warning w-100"
              onClick={async () => {
                await getAllDocs()
                await saveDatabase(Array.from(allTotalRef.current.values()))
              }}
            >
              一鍵更改
            </button>
          )}
        </div>
      )}
      {userRecordsStatic.length !== 0 && (
        <div className="mt-3">
          <div className="row mx-0 gap-1">
            <button
              className={`btn col btn-sm ${selectMode === '顯示全部' ? 'btn-dark' : 'btn-outline-dark'}`}
              onClick={() => {
                setSelectMode('顯示全部')
                filterData('')
                setUserRecords(userRecordsRef.current)
                userRecordsCacheRef.current = userRecordsRef.current
              }}
            >
              全部
            </button>
            <button
              className={`btn col btn-sm ${selectMode === '只顯示紅色' ? 'btn-danger' : 'btn-outline-danger'}`}
              onClick={() => {
                setSelectMode('只顯示紅色')
                filterData('')
                setUserRecords(() => {
                  const showRed = userRecordsRef.current.filter((item) => item.shouldGet >= 0)
                  userRecordsCacheRef.current = showRed
                  return showRed
                })
              }}
            >
              紅色
            </button>
            <button
              className={`btn col btn-sm ${selectMode === '只顯示綠色' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => {
                setSelectMode('只顯示綠色')
                filterData('')
                setUserRecords(() => {
                  const showGreen = userRecordsRef.current.filter((item) => item.shouldGet < 0)
                  userRecordsCacheRef.current = showGreen
                  return showGreen
                })
              }}
            >
              綠色
            </button>
            <button
              className="btn btn-sm btn-outline-dark col"
              onClick={() => {
                setRecordsOrderStatus((prep) => (prep === 'desc' ? 'asc' : 'desc'))
                setUserRecords((prev) => {
                  const reversed = [...prev].reverse()
                  return reversed
                })
              }}
            >
              更改順序
            </button>
          </div>
          <div className="d-flex mt-1 justify-content-between gap-1 flex-wrap">
            <input
              type="date"
              className="form-control"
              value={selectDate}
              onChange={(e) => {
                setSelectDate(e.target.value)
              }}
            />
            <div className=" w-100 d-flex gap-1">
              <button
                className={`btn flex-fill ${dateSelectMode === '之前' ? 'btn-info' : 'btn-outline-secondary'}`}
                onClick={() => {
                  setDateSelectMode('之前')
                  filterData('之前')
                }}
              >
                之前
              </button>
              <button
                className={`btn flex-fill ${dateSelectMode === '之後' ? 'btn-info' : 'btn-outline-secondary'}`}
                onClick={() => {
                  setDateSelectMode('之後')
                  filterData('之後')
                }}
              >
                之後
              </button>
              <button
                className="btn flex-fill btn-secondary"
                onClick={() => {
                  filterData('')
                }}
              >
                清除
              </button>
            </div>
          </div>
          <p className="text-cemter fs-6 text-secondary p-1 rounded border w-100 shadow-sm bg-white mt-2">
            模式: {selectMode}/{recordsOrderStatus === 'desc' ? '新到舊' : '舊到新'}/
            {selectDate ? selectDate : '未設定日期'}/{dateSelectMode ? dateSelectMode : '未設定日期前後'}
          </p>
        </div>
      )}
      {userRecords.length !== 0 && (
        <div className="list-group mt-2">
          {userRecords.map((item) => (
            <div
              className="list-group-item d-flex flex-column justify-content-start mb-2 bg-light px-1"
              style={{ minHeight: '5rem', border: 'none' }}
            >
              <p
                className="fw-bold user-select-none text-nowrap text-start mb-0"
                style={{ fontSize: '1.1rem', color: '#0d6efd' }}
              >
                {item.title}
              </p>
              <p className="text-muted small text-start user-select-none mb-0" style={{ fontSize: '0.8rem' }}>
                {item.description}
              </p>
              <p className="text-start user-select-none" style={{ fontSize: '0.8rem' }}>
                {formatTimestamp(item.createdAt)}
              </p>
              <p
                className="fs-4"
                style={{
                  backgroundColor: item.shouldGet < 0 ? '#4ade80' : '#f87171',
                }}
              >
                {item.shouldGet < 0 ? '你應付' : '你應得'} {Math.abs(item.shouldGet)}
              </p>
              <div>
                {item.detail.map((itemBody) => {
                  const fixOrder = getFixedOrder(itemBody.borrower, itemBody.debtor)
                  let syntax = 1
                  if (fixOrder[0] === itemBody.borrower) {
                    syntax = 1
                  } else {
                    syntax = -1
                  }
                  const key = `${fixOrder[0]}_${fixOrder[1]}`
                  if (separateTotalRef.current.has(key)) {
                    const keyPreviousData = separateTotalRef.current.get(key).debt
                    separateTotalRef.current.set(key, {
                      first: fixOrder[0],
                      second: fixOrder[1],
                      debt: keyPreviousData + itemBody.debt * syntax,
                    })
                  } else {
                    separateTotalRef.current.set(key, {
                      first: fixOrder[0],
                      second: fixOrder[1],
                      debt: itemBody.debt * syntax,
                    })
                  }
                  return (
                    <div className="d-flex align-items-center justify-content-center mb-4">
                      <div className="text-center" style={{ width: '4rem' }}>
                        <img
                          src={getUserInfo(context.state.configData.users, itemBody.borrower).photo}
                          style={{ height: '2rem' }}
                          alt="user"
                        />
                        <p className="m-0" style={{ fontSize: '12px' }}>
                          {getUserInfo(context.state.configData.users, itemBody.borrower).name}
                        </p>
                      </div>
                      <img src="/arrow.png" style={{ height: '3rem' }} alt="arrow" />
                      <div className="text-center" style={{ width: '4rem', marginRight: '2rem' }}>
                        <img
                          src={getUserInfo(context.state.configData.users, itemBody.debtor).photo}
                          style={{ height: '2rem' }}
                          alt="user"
                        />
                        <p className="m-0" style={{ fontSize: '12px' }}>
                          {getUserInfo(context.state.configData.users, itemBody.debtor).name}
                        </p>
                      </div>
                      <div className="mx-4 d-flex flex-column align-items-center" style={{ width: '6rem' }}>
                        <p className="m-0 fw-bold fs-5">${numberWithCommas(itemBody.debt)}</p>
                        <p className="m-0 text-center" style={{ fontSize: '12px' }}>
                          {itemBody.remark}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
