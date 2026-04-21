import { useState, useEffect, useRef, useContext, useReducer } from 'react'
import { doc, runTransaction } from 'firebase/firestore'
import { db } from '../config.js'
import {
  getUserInfo,
  checkConflict,
  getFixedOrder,
  mergeDebtArrays,
  numberWithCommas,
  truncateText,
} from '../utils/function.js'
import useSendMessage from '../hooks/useSendMessage.js'
import { AppContext } from '../reducers/app_reducer.js'
import { recordReducer, RecordContext } from '../reducers/record_reducer.js'
import Records from '../classes/Records.js'

export default function SetRecords() {
  const context = useContext(AppContext)
  const [recordState, recordDispatch] = useReducer(recordReducer, {
    newTabOpenState: false,
    addBorrower: '',
    addDebtor: '',
    addDebt: 0,
    addRemark: '',
    addType: '',
    editMode: false
  })
  const send = useSendMessage()
  const recordsInstance = useRef(
    new Records(
      context.state.recordMenu.title,
      context.state.recordMenu.description,
      context.state.recordMenu.records,
      context.dispatch,
    ),
  )
  const firstRef = useRef(true)

  const calculateRecordsDiff = (oldRecords, newRecords) => {
    console.log(oldRecords, newRecords)
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
    const docConfigRef = doc(db, context.userInfo.current.groupId, 'config')
    const docRecordRef = doc(db, context.userInfo.current.groupId, context.state.recordMenu.id)

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
        console.log('old', oldRecords)
        console.log('new', newRecordsArray)

        const resultRecords = mergeDebtArrays(oldRecords, newRecordsArray)

        // --- C. 寫入階段 ---
        // 更新總帳 (原本的 saveDatabaseConfig 部分)
        transaction.update(docConfigRef, { records: resultRecords })
        const uniqueUids = [
          ...new Set(context.state.recordMenu.records.flatMap((item) => [item.borrower, item.debtor])),
        ]
        const recordData = recordDoc.data().records
        if (isDelete) {
          send({
            senderName: context.userInfo.current.name,
            senderPhoto: context.userInfo.current.picture,
            ...recordsInstance.current.getMessageData(recordData, '刪除')
          })
          transaction.delete(docRecordRef)
        } else {
          send({
            senderName: context.userInfo.current.name || '未命名',
            senderPhoto: context.userInfo.current.picture,
            ...recordsInstance.current.getMessageData(recordData, '更改'),
          })
          transaction.update(docRecordRef, {
            title: context.state.recordMenu.title,
            description: context.state.recordMenu.description,
            records: context.state.recordMenu.records,
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

  return (
    <RecordContext.Provider value={{ recordState, recordDispatch }}>
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
                  recordDispatch({ type: 'set_editMode', value: false })
                }}
              ></i>
            </div>
            <p className="fw-light m-0" style={{ fontSize: '12px' }}>
              在這裡將可以設定明細
            </p>
          </div>
          <hr />
          <div className="text-start mt-2">
            {recordState.editMode ? (
              <input
                type="text"
                className="form-control w-50"
                placeholder="標題"
                value={context.state.recordMenu.title}
                onChange={(e) => {
                  recordsInstance.current.title = e.target.value
                }}
              />
            ) : (
              <p className="fs-4 fw-light mb-1 d-inline">
                標題：<strong>{context.state.recordMenu.title || '未命名'}</strong>
              </p>
            )}
            {recordState.editMode ? (
              <input
                type="text"
                className="form-control mt-1"
                placeholder="描述"
                value={context.state.recordMenu.description}
                onChange={(e) => {
                  recordsInstance.current.description = e.target.value
                }}
              />
            ) : (
              <p className="fs-6 text-secondary mb-0">{context.state.recordMenu.description || '未設定'}</p>
            )}
            <button className="btn btn-outline-dark btn-sm mt-1" onClick={() => recordDispatch({ type: 'set_editMode', value: !recordState.editMode })}>
              編輯
            </button>
            <div className="d-flex flex-column">
              {context.state.recordMenu.records.map((item, index) => (
                <div key={item.id}>
                  <hr />
                  <div className="d-flex align-items-center">
                    {recordState.editMode ? (
                      <i
                        className="bi bi-trash-fill text-danger fs-6 mx-1"
                        onClick={() => {
                          recordsInstance.current.deleteRecord(index)
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
                    {!recordState.editMode ? (
                      <div
                        className="mx-4 d-flex flex-column align-items-center"
                        style={{ width: '6rem' }}
                      >
                        <p className="m-0 fw-bold fs-5">${numberWithCommas(item.debt)}</p>
                        <p className="m-0 text-center" style={{ fontSize: '12px' }}>
                          {item.remark}
                        </p>
                      </div>
                    ) : (
                      ''
                    )}
                    {recordState.editMode ? (
                      <div>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="名稱"
                          value={context.state.recordMenu.records[index].remark}
                          onChange={(e) => {
                            recordsInstance.current.updateRecordRemark(index, e.target.value)
                          }}
                        />
                        <input
                          type="number"
                          className="form-control mt-1"
                          placeholder="金額"
                          value={context.state.recordMenu.records[index].debt}
                          onChange={(e) => {
                            recordsInstance.current.updateRecordDebt(
                              index,
                              Number(e.target.value),
                            )
                          }}
                        />
                      </div>
                    ) : (
                      ''
                    )}
                  </div>
                </div>
              ))}
              {recordState.newTabOpenState ? (
                <div className="p-2 rounded bg-light mt-3 shadow-sm border">
                  <div className="d-flex justify-content-between align-items-center">
                    <p className="fs-5 mb-0">新增項目</p>
                    <i
                      className="bi bi-x-lg fw-bold fs-6"
                      onClick={() => {
                        context.dispatch({ type: 'set_recordMenu', value: null })
                        recordDispatch({ type: 'set_newTabOpenState', value: false })
                      }}
                    ></i>
                  </div>
                  <p className="fw-light m-0" style={{ fontSize: '12px' }}>
                    請選擇人員和金額
                  </p>
                  <div className="mt-3 d-flex justify-content-center gap-4">
                    <div className="list-group">
                      {context.state.configData.users.map((item) => (
                        <div
                          className={`list-group-item d-flex align-items-center gap-2 ${recordState.addBorrower === item.uid ? 'bg-info-subtle' : ''}`}
                          key={item.uid}
                          onClick={() => {
                            recordDispatch({ type: 'set_addBorrower', value: item.uid })
                          }}
                        >
                          <img
                            src={item.photo}
                            className="shadow-sm"
                            style={{ height: '1.2rem' }}
                            alt="user"
                          />
                          <p className="m-0 user-select-none" style={{ fontSize: '12px' }}>
                            {truncateText(item.name, 7)}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="d-flex flex-column justify-content-center gap-3">
                      <button
                        className={`btn ${recordState.addType === 'debt' ? 'btn-danger' : 'btn-outline-danger'}`}
                        onClick={() => {
                          recordDispatch({ type: 'set_addType', value: 'debt' })
                        }}
                      >
                        欠
                      </button>
                      <button
                        className={`btn ${recordState.addType === 'return' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => {
                          recordDispatch({ type: 'set_addType', value: 'return' })
                        }}
                      >
                        還
                      </button>
                    </div>
                    <div className="list-group">
                      {context.state.configData.users.map((item) => (
                        <div
                          className={`list-group-item d-flex align-items-center gap-2 ${recordState.addDebtor === item.uid ? 'bg-info-subtle' : ''}`}
                          key={item.uid}
                          onClick={() => {
                            recordDispatch({ type: 'set_addDebtor', value: item.uid })
                          }}
                        >
                          <img
                            src={item.photo}
                            className="shadow-sm"
                            style={{ height: '1.2rem' }}
                            alt="user"
                          />
                          <p className="m-0 user-select-none" style={{ fontSize: '12px' }}>
                            {truncateText(item.name, 7)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 d-flex gap-2">
                    <div>
                      <p className="fs-6 mb-1">名稱：</p>
                      <input
                        className="form-control"
                        placeholder="remark"
                        type="text"
                        value={recordState.addRemark}
                        onChange={(e) => {
                          recordDispatch({ type: 'set_addRemark', value: e.target.value })
                        }}
                      />
                    </div>
                    <div>
                      <p className="fs-6 mb-1">金額：</p>
                      <input
                        className="form-control"
                        placeholder="debt"
                        type="number"
                        value={recordState.addDebt}
                        onChange={(e) => {
                          recordDispatch({ type: 'set_addDebt', value: Number(e.target.value) })
                        }}
                      />
                    </div>
                  </div>
                  <div className="d-flex justify-content-end gap-2 mt-2">
                    <button
                      className="btn btn-outline-dark btn-sm"
                      onClick={() => {
                        if (!recordState.addBorrower || !recordState.addDebtor || !recordState.addDebt || !recordState.addType || !recordState.addRemark)
                          return alert('請填寫完整資料')
                        if (checkConflict(context.state.recordMenu, recordState.addBorrower, recordState.addDebtor)) return
                        recordsInstance.current.records = {
                          borrower: recordState.addType === 'debt' ? recordState.addDebtor : recordState.addBorrower,
                          debtor: recordState.addType === 'debt' ? recordState.addBorrower : recordState.addDebtor,
                          debt: recordState.addDebt,
                          remark: recordState.addRemark,
                        }
                        recordDispatch({ type: 'clear' })
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
                {!recordState.newTabOpenState ? (
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => {
                      recordDispatch({ type: 'set_newTabOpenState', value: true })
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
                    recordsInstance.current.undoAllChanges()
                  }}
                >
                  取消變更
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={async () => {
                    if (!firstRef.current) return
                    firstRef.current = false
                    recordsInstance.current.deleteAllRecords()
                    await saveDatabaseCombined(
                      calculateRecordsDiff(context.state.recordMenu.records, []),
                      true,
                    )
                    alert('紀錄已刪除')
                    context.dispatch({ type: 'set_recordMenu', value: null })
                    recordDispatch({ type: 'clear'})
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
                    if (context.state.recordMenu.records.length === 0)
                      return alert('請至少新增一筆紀錄')
                    if (context.state.recordMenu.title.trim() === '') return alert('請填寫標題')
                    if (context.state.recordMenu.description.trim() === '') return alert('請填寫描述')
                    await saveDatabaseCombined(
                      calculateRecordsDiff(
                        recordsInstance.current.getOldRecords(),
                        context.state.recordMenu.records,
                      ),
                    )
                    alert('紀錄已更新')
                    context.dispatch({ type: 'set_recordMenu', value: null })
                    recordDispatch({ type: 'clear'})
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
    </RecordContext.Provider>
  )
}
