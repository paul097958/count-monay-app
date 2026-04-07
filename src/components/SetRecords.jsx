import { useState, useEffect, useRef, useContext } from 'react'
import { doc, runTransaction } from 'firebase/firestore'
import { db } from '../config.js'
import {
  updateRecordDebt,
  updateRecordRemark,
  deleteRecord,
  getUserInfo,
  checkConflict,
  getFixedOrder,
  mergeDebtArrays,
  numberWithCommas,
} from '../common/FunctionBase.js'
import sendMessage from '../common/SendMessage.js'
import { AppContext } from '../common/Reducer.js'

export default function SetRecords({ getConfigData, getRecentRecords }) {
  const context = useContext(AppContext)
  const [menuChange, setMenuChange] = useState(context.state.recordMenu)
  const [newTabOpenState, setNewTabOpenState] = useState(false)
  const [addBorrower, setAddBorrower] = useState('')
  const [addDebtor, setAddDebtor] = useState('')
  const [addDebt, setAddDebt] = useState(0)
  const [addRemark, setAddRemark] = useState('')
  const [addType, setAddType] = useState('')
  const [editMode, setEditMode] = useState(false)
  const firstRef = useRef(true)

  useEffect(() => {
    setMenuChange(context.state.recordMenu)
  }, [context.state.recordMenu])

  const calculateRecordsDiff = (oldRecords, newRecords) => {
    const nameOldRecords = oldRecords.map((item) => {
      const fixOrder = getFixedOrder(item.borrower, item.debtor)
      const key = `${fixOrder[0]}_${fixOrder[1]}`
      return {
        ...item,
        id: key,
      }
    })
    const nameNewRecords = newRecords.map((item) => {
      const fixOrder = getFixedOrder(item.borrower, item.debtor)
      const key = `${fixOrder[0]}_${fixOrder[1]}`
      return {
        ...item,
        id: key,
      }
    })
    const deleteArray = nameOldRecords
      .filter((item) => nameNewRecords.find((element) => element.id === item.id) === undefined)
      .map((item) => ({
        ...item,
        borrower: item.debtor,
        debtor: item.borrower,
      }))
    const changeArray = nameOldRecords
      .filter((item) => {
        if (nameNewRecords.some((element) => element.id === item.id)) {
          const newElement = nameNewRecords.find((element) => element.id === item.id)
          return item.debt !== newElement.debt
        } else {
          return false
        }
      })
      .map((item) => {
        const newElement = nameNewRecords.find((element) => element.id === item.id)
        const sub = newElement.debt - item.debt
        const add = newElement.debt + item.debt
        if (newElement.borrower !== item.borrower || newElement.debtor !== item.debtor) {
          return {
            ...item,
            borrower: item.debtor,
            debtor: item.borrower,
            debt: add,
          }
        }
        if (sub >= 0) {
          return {
            ...item,
            debt: sub,
          }
        } else {
          return {
            ...item,
            borrower: item.debtor,
            debtor: item.borrower,
            debt: Math.abs(sub),
          }
        }
      })
    const addArray = nameNewRecords.filter(
      (item) => nameOldRecords.find((element) => element.id === item.id) === undefined,
    )
    return [...deleteArray, ...changeArray, ...addArray]
  }

  async function saveDatabaseCombined(recordsData, isDelete = false) {
    console.log(recordsData)

    const docConfigRef = doc(db, context.userInfo.current.groupId, 'config')
    const docRecordRef = doc(db, context.userInfo.current.groupId, menuChange.id)

    // 1. 預處理資料 (在 Transaction 外處理以保持交易簡潔)
    const newRecordsArray = recordsData.map((item) => {
      let userOrder = getFixedOrder(item.borrower, item.debtor)
      return {
        first: userOrder[0],
        second: userOrder[1],
        debt: item.borrower === userOrder[0] ? Number(item.debt) : -Number(item.debt),
      }
    })

    try {
      await runTransaction(db, async (transaction) => {
        // --- A. 讀取階段 (所有的 Get 必須在 Update 之前) ---
        const configDoc = await transaction.get(docConfigRef)
        const recordDoc = await transaction.get(docRecordRef)
        if (!configDoc.exists()) {
          throw new Error('Config 文件不存在！')
        }
        if (!recordDoc.exists()) {
          throw new Error('Record 文件不存在！')
        }

        // --- B. 計算階段 ---
        const oldRecords = configDoc.data().records || []
        const resultRecords = mergeDebtArrays(oldRecords, newRecordsArray)

        // --- C. 寫入階段 ---
        // 更新總帳 (原本的 saveDatabaseConfig 部分)
        transaction.update(docConfigRef, { records: resultRecords })
        const uniqueUids = [...new Set(menuChange.records.flatMap((item) => [item.borrower, item.debtor]))]
        const recordData = recordDoc.data().records
        if (isDelete) {
          sendMessage(
            context.userInfo.current.name,
            context.userInfo.current.picture,
            menuChange.title,
            menuChange.description,
            recordData,
            [],
            '刪除',
            context.state.configData.users,
            context.userInfo,
          )
          transaction.delete(docRecordRef)
        } else {
          sendMessage(
            context.userInfo.current.name,
            context.userInfo.current.picture,
            menuChange.title,
            menuChange.description,
            recordData,
            menuChange.records,
            '更改',
            context.state.configData.users,
            context.userInfo,
          )
          transaction.update(docRecordRef, {
            title: menuChange.title,
            description: menuChange.description,
            records: menuChange.records,
            users: uniqueUids,
          })
        }
      })

      console.log('交易成功：總帳與紀錄已同步更新')
    } catch (e) {
      console.error('交易失敗 (兩者皆未更改):', e)
      throw e // 拋出錯誤供 UI 層處理
    }
  }

  if (context.state.recordMenu !== null)
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{
          position: 'fixed',
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 2,
        }}
      >
        <div
          className="bg-white rounded shadow p-3"
          style={{
            maxWidth: 'calc(100vw - 2rem)',
            width: '25rem',
            maxHeight: 'calc(100vh - 5rem)',
            overflow: 'auto',
          }}
        >
          <div className="text-start">
            <div className="d-flex justify-content-between">
              <p className="fs-4 fw-medium mb-0">明細設定</p>
              <i
                className="bi bi-x-lg fw-bold fs-6"
                onClick={() => {
                  context.dispatch({ type: 'set_recordMenu', value: null })
                  setEditMode(false)
                }}
              ></i>
            </div>
            <p className="fw-light m-0" style={{ fontSize: '12px' }}>
              在這裡將可以設定明細
            </p>
          </div>
          <hr />
          <div className="text-start mt-2">
            {editMode ? (
              <input
                type="text"
                className="form-control w-50"
                placeholder="標題"
                value={menuChange.title}
                onChange={(e) => {
                  setMenuChange({ ...menuChange, title: e.target.value })
                }}
              />
            ) : (
              <p className="fs-4 fw-light mb-1 d-inline">
                標題：<strong>{menuChange.title || '未命名'}</strong>
              </p>
            )}
            {editMode ? (
              <input
                type="text"
                className="form-control mt-1"
                placeholder="描述"
                value={menuChange.description}
                onChange={(e) => {
                  setMenuChange({ ...menuChange, description: e.target.value })
                }}
              />
            ) : (
              <p className="fs-6 text-secondary mb-0">{menuChange.description || '未設定'}</p>
            )}
            <button className="btn btn-outline-dark btn-sm mt-1" onClick={() => setEditMode(!editMode)}>
              編輯
            </button>
            <div className="d-flex flex-column">
              {menuChange.records.map((item, index) => (
                <div key={item.id}>
                  <hr />
                  <div className="d-flex align-items-center">
                    {editMode ? (
                      <i
                        className="bi bi-trash-fill text-danger fs-6 mx-1"
                        onClick={() => {
                          deleteRecord(setMenuChange, index)
                        }}
                      ></i>
                    ) : (
                      ''
                    )}
                    <div className="text-center" style={{ width: '4rem' }}>
                      <img
                        src={getUserInfo(context.state.configData.users, item.borrower).photo}
                        style={{ height: '2rem' }}
                        alt="user"
                      />
                      <p className="m-0" style={{ fontSize: '12px' }}>
                        {getUserInfo(context.state.configData.users, item.borrower).name}
                      </p>
                    </div>
                    <img src="/arrow.png" style={{ height: '3rem' }} alt="arrow" />
                    <div className="text-center" style={{ width: '4rem', marginRight: '2rem' }}>
                      <img
                        src={getUserInfo(context.state.configData.users, item.debtor).photo}
                        style={{ height: '2rem' }}
                        alt="user"
                      />
                      <p className="m-0" style={{ fontSize: '12px' }}>
                        {getUserInfo(context.state.configData.users, item.debtor).name}
                      </p>
                    </div>
                    {!editMode ? (
                      <div className="mx-4 d-flex flex-column align-items-center" style={{ width: '6rem' }}>
                        <p className="m-0 fw-bold fs-5">${numberWithCommas(item.debt)}</p>
                        <p className="m-0 text-center" style={{ fontSize: '12px' }}>
                          {item.remark}
                        </p>
                      </div>
                    ) : (
                      ''
                    )}
                    {editMode ? (
                      <div>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="名稱"
                          value={menuChange.records[index].remark}
                          onChange={(e) => {
                            updateRecordRemark(setMenuChange, index, e.target.value)
                          }}
                        />
                        <input
                          type="number"
                          className="form-control mt-1"
                          placeholder="金額"
                          value={menuChange.records[index].debt}
                          onChange={(e) => {
                            updateRecordDebt(setMenuChange, index, Number(e.target.value))
                          }}
                        />
                      </div>
                    ) : (
                      ''
                    )}
                  </div>
                </div>
              ))}
              {newTabOpenState ? (
                <div className="p-2 rounded bg-light mt-2 shadow-sm border">
                  <p className="fs-5 mb-0">新增項目</p>
                  <p className="fw-light m-0" style={{ fontSize: '12px' }}>
                    請選擇人員和金額
                  </p>
                  <div className="mt-3 d-flex justify-content-start align-items-center gap-2 flex-wrap">
                    {context.state.configData.users.map((item) => (
                      <div
                        className={`text-center p-1 hover-darken border rounded ${addBorrower === item.uid ? 'bg-info-subtle' : ''}`}
                        key={item.uid}
                        onClick={() => {
                          setAddBorrower(item.uid)
                        }}
                      >
                        <img src={item.photo} className="rounded shadow-sm" style={{ height: '2rem' }} alt="user" />
                        <p className="m-0 user-select-none" style={{ fontSize: '12px' }}>
                          {item.name}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="d-flex justify-content-center gap-3 mt-2 md-2">
                    <button
                      className={`btn ${addType === 'debt' ? 'btn-danger' : 'btn-outline-danger'}`}
                      onClick={() => {
                        setAddType('debt')
                      }}
                    >
                      欠
                    </button>
                    <button
                      className={`btn ${addType === 'return' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => {
                        setAddType('return')
                      }}
                    >
                      還
                    </button>
                  </div>
                  <div className="mt-3 d-flex justify-content-start align-items-center gap-2 flex-wrap">
                    {context.state.configData.users.map((item) => (
                      <div
                        className={`text-center p-1 hover-darken border rounded ${addDebtor === item.uid ? 'bg-info-subtle' : ''}`}
                        key={item.uid}
                        onClick={() => {
                          setAddDebtor(item.uid)
                        }}
                      >
                        <img src={item.photo} className="rounded shadow-sm" style={{ height: '2rem' }} alt="user" />
                        <p className="m-0 user-select-none" style={{ fontSize: '12px' }}>
                          {item.name}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 d-flex gap-2">
                    <div>
                      <p className="fs-6 mb-1">名稱：</p>
                      <input
                        className="form-control"
                        placeholder="remark"
                        type="text"
                        value={addRemark}
                        onChange={(e) => {
                          setAddRemark(e.target.value)
                        }}
                      />
                    </div>
                    <div>
                      <p className="fs-6 mb-1">金額：</p>
                      <input
                        className="form-control"
                        placeholder="debt"
                        type="number"
                        value={addDebt}
                        onChange={(e) => {
                          setAddDebt(Number(e.target.value))
                        }}
                      />
                    </div>
                  </div>
                  <div className="d-flex justify-content-end gap-2 mt-2">
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => {
                        setNewTabOpenState(false)
                      }}
                    >
                      關閉
                    </button>
                    <button
                      className="btn btn-outline-dark btn-sm"
                      onClick={() => {
                        if (!addBorrower || !addDebtor || !addDebt || !addType || !addRemark)
                          return alert('請填寫完整資料')
                        if (checkConflict(menuChange, addBorrower, addDebtor)) return
                        setMenuChange((prev) => ({
                          ...prev,
                          records: [
                            ...prev.records,
                            {
                              borrower: addType === 'debt' ? addDebtor : addBorrower,
                              debtor: addType === 'debt' ? addBorrower : addDebtor,
                              debt: addDebt,
                              remark: addRemark,
                            },
                          ],
                        }))
                        setNewTabOpenState(false)
                        setAddBorrower('')
                        setAddDebtor('')
                        setAddDebt(0)
                        setAddRemark('')
                        setAddType('')
                      }}
                    >
                      新增
                    </button>
                  </div>
                </div>
              ) : (
                ''
              )}
              <hr />
              <div className="d-flex justify-content-end gap-2 mt-1">
                {!newTabOpenState ? (
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => {
                      setNewTabOpenState(true)
                    }}
                  >
                    新增項目
                  </button>
                ) : (
                  ''
                )}
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    setMenuChange(context.state.recordMenu)
                  }}
                >
                  取消變更
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={async () => {
                    if (!firstRef.current) return
                    firstRef.current = false
                    await saveDatabaseCombined(calculateRecordsDiff(context.state.recordMenu.records, []), true)
                    await getConfigData() // section1
                    await getRecentRecords() // section2
                    alert('紀錄已刪除')
                    context.dispatch({ type: 'set_recordMenu', value: null })
                    setEditMode(false)
                    firstRef.current = true
                  }}
                >
                  刪除明細
                </button>
                <button
                  className="btn btn-warning btn-sm"
                  onClick={async () => {
                    if (!firstRef.current) return
                    firstRef.current = false
                    if (menuChange.records.length === 0) return alert('請至少新增一筆紀錄')
                    if (menuChange.title.trim() === '') return alert('請填寫標題')
                    if (menuChange.description.trim() === '') return alert('請填寫描述')
                    await saveDatabaseCombined(calculateRecordsDiff(context.records, menuChange.records))
                    await getConfigData() // section1
                    await getRecentRecords() // section2
                    alert('紀錄已更新')
                    context.dispatch({ type: 'set_recordMenu', value: null })
                    setEditMode(false)
                    firstRef.current = true
                  }}
                >
                  確認更改
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  else return ''
}
