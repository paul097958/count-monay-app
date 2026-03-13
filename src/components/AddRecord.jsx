import { useState, useRef } from "react";
import {
    doc,
    addDoc,
    collection,
    runTransaction,
    serverTimestamp
} from "firebase/firestore";
import { db } from '../config.js';
import { updateRecordDebt, updateRecordRemark, deleteRecord, getUserInfo, checkConflict, getFixedOrder, mergeDebtArrays, numberWithCommas } from "../common/RecordFunction.js";


export default function AddRecord({ addRecordMenuState, setAddRecordMenuState, configData, userInfo, getConfigData, getRecentRecords }) {

    const [addBorrower, setAddBorrower] = useState('')
    const [addDebtor, setAddDebtor] = useState('')
    const [addDebt, setAddDebt] = useState(0)
    const [addRemark, setAddRemark] = useState('')
    const [addType, setAddType] = useState('')
    const [newRecords, setNewRecords] = useState({ title: '', description: '', records: [] })
    const [editMode, setEditMode] = useState(false)
    const firstRef = useRef(true)




    async function saveDatabase(recordsData, identity) {
        const newRecords = recordsData.records.map(item => {
            // 假設 getFixedOrder 已經在外部定義好
            let userOrder = getFixedOrder(item.borrower, item.debtor);
            const isFirstBorrower = item.borrower === userOrder[0];

            return {
                first: userOrder[0],
                second: userOrder[1],
                debt: isFirstBorrower ? item.debt : -item.debt
            };
        });
        const uniqueUids = [...new Set(newRecords.flatMap(item => [item.first, item.second]))];
        const docRef = doc(db, identity, 'config');
        const historyColRef = collection(db, identity);

        try {
            // 執行交易 (Transaction)
            await runTransaction(db, async (transaction) => {
                const sfDoc = await transaction.get(docRef);
                if (!sfDoc.exists()) {
                    throw "文件不存在！";
                }

                const oldRecords = sfDoc.data().records || [];
                const resultRecords = mergeDebtArrays(oldRecords, newRecords);

                transaction.update(docRef, { records: resultRecords });
            });

            // 新增歷史紀錄文件
            const recordDocRef = await addDoc(historyColRef, {
                ...recordsData,
                users: uniqueUids,
                createdAt: serverTimestamp() // 使用 Web 版的 serverTimestamp
            });

            console.log("新文件已建立，ID 為:", recordDocRef.id);
        } catch (e) {
            console.error('交易失敗:', e);
            throw e; // 拋出錯誤讓呼叫端可以處理
        }
    }

    if (addRecordMenuState) return (
        <div className="d-flex align-items-center justify-content-center" style={{ position: 'fixed', width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 2 }}>
            <div className="bg-white rounded shadow p-3" style={{ maxWidth: 'calc(100vw - 2rem)', width: '25rem', maxHeight: 'calc(100vh - 5rem)', overflow: 'auto' }}>
                <div className='text-start'>
                    <div className="d-flex justify-content-between align-items-center">
                        <p className='fs-4 fw-medium mb-0'>新增明細</p>
                        <i className="bi bi-x-lg fw-bold fs-6" onClick={() => {
                            setAddRecordMenuState(false);
                            setNewRecords({ title: '', description: '', records: [] });
                        }}></i>
                    </div>
                    <p className='fw-light m-0' style={{ fontSize: '12px' }}>在這裡將可以新增明細</p>
                </div>
                <div className="p-2 rounded bg-light mt-2 shadow-sm border">
                    <p className='fs-5 mb-0'>新增項目</p>
                    <p className='fw-light m-0' style={{ fontSize: '12px' }}>請選擇人員和金額</p>
                    <div className="mt-3 d-flex justify-content-start align-items-center gap-2 flex-wrap">
                        {
                            configData.users.map(item => <div className={`text-center p-1 hover-darken border rounded ${addBorrower === item.uid ? 'bg-info-subtle' : ''}`} key={item.uid} onClick={() => {
                                setAddBorrower(item.uid)
                            }}>
                                <img src={item.photo} className="rounded shadow-sm" style={{ height: '2rem' }} alt="user" />
                                <p className="m-0 user-select-none" style={{ fontSize: '12px' }}>{item.name}</p>
                            </div>)
                        }
                    </div>
                    <div className="d-flex justify-content-center gap-3 mt-2 md-2">
                        <button className={`btn ${addType === 'debt' ? 'btn-danger' : 'btn-outline-danger'}`} onClick={() => {
                            setAddType('debt')
                        }}>欠</button>
                        <button className={`btn ${addType === 'return' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => {
                            setAddType('return')
                        }}>還</button>
                    </div>
                    <div className="mt-3 d-flex justify-content-start align-items-center gap-2 flex-wrap">
                        {
                            configData.users.map(item => <div className={`text-center p-1 hover-darken border rounded ${addDebtor === item.uid ? 'bg-info-subtle' : ''}`} key={item.uid} onClick={() => {
                                setAddDebtor(item.uid)
                            }}>
                                <img src={item.photo} className="rounded shadow-sm" style={{ height: '2rem' }} alt="user" />
                                <p className="m-0 user-select-none" style={{ fontSize: '12px' }}>{item.name}</p>
                            </div>)
                        }
                    </div>
                    <div className="mt-2 d-flex gap-2">
                        <div>
                            <p className="fs-6 mb-1">名稱：</p>
                            <input className="form-control" placeholder="remark" type="text" value={addRemark} onChange={(e) => {
                                setAddRemark(e.target.value)
                            }} />
                        </div>
                        <div>
                            <p className="fs-6 mb-1">金額：</p>
                            <input className="form-control" placeholder="debt" type="number" value={addDebt} onChange={(e) => {
                                setAddDebt(Number(e.target.value))
                            }} />
                        </div>
                    </div>
                    <div className="d-flex justify-content-end gap-2 mt-2">
                        <button className="btn btn-outline-dark btn-sm" onClick={() => {
                            if (!addBorrower || !addDebtor || !addDebt || !addType || !addRemark) return alert('請填寫完整資料')
                            if (checkConflict(newRecords, addBorrower, addDebtor)) return
                            setNewRecords(prev => ({
                                ...prev,
                                records: [...prev.records, {
                                    borrower: addType === 'debt' ? addDebtor : addBorrower,
                                    debtor: addType === 'debt' ? addBorrower : addDebtor,
                                    debt: addDebt,
                                    remark: addRemark
                                }]
                            }));
                            setAddBorrower('')
                            setAddDebtor('')
                            setAddDebt(0)
                            setAddRemark('')
                            setAddType('')
                        }}>新增</button>
                    </div>
                </div>
                <div>
                    <input type="text" className="form-control mt-3" placeholder="標題" value={newRecords.title} onChange={(e) => {
                        setNewRecords(prev => ({ ...prev, title: e.target.value }))
                    }} />
                    <textarea className="form-control mt-2" rows={3} placeholder="描述" value={newRecords.description} onChange={(e) => {
                        setNewRecords(prev => ({ ...prev, description: e.target.value }))
                    }}></textarea>
                </div>
                <div className="text-start mt-3">
                    <div className="d-flex align-items-center justify-content-between">
                        <p className="fs-5 mb-0">明細列表</p>
                        <button className={`btn btn-outline-${editMode ? 'secondary' : 'success'} btn-sm`} onClick={() => setEditMode(!editMode)}>{editMode ? '關閉編輯' : '開啟編輯'}</button>
                    </div>
                    <p className="fw-light m-0" style={{ fontSize: '12px' }}>在下方可以看到目前新增的明細</p>
                </div>
                {newRecords.records.map((item, index) => <div key={item.id}>
                    <hr />
                    <div className="d-flex align-items-center">
                        {
                            editMode ? <i className="bi bi-trash-fill text-danger fs-6 mx-1" onClick={() => {
                                deleteRecord(setNewRecords, index)
                            }}></i> : ''
                        }
                        <div className="text-center" style={{ width: '4rem' }}>
                            <img src={getUserInfo(configData.users, item.borrower).photo} style={{ height: '2rem' }} alt="user" />
                            <p className="m-0" style={{ fontSize: '12px' }}>{getUserInfo(configData.users, item.borrower).name}</p>
                        </div>
                        <img src="/arrow.png" style={{ height: '3rem' }} alt="arrow" />
                        <div className="text-center" style={{ width: '4rem', marginRight: '2rem' }}>
                            <img src={getUserInfo(configData.users, item.debtor).photo} style={{ height: '2rem' }} alt="user" />
                            <p className="m-0" style={{ fontSize: '12px' }}>{getUserInfo(configData.users, item.debtor).name}</p>
                        </div>
                        {
                            !editMode ? <div className="mx-4 d-flex flex-column align-items-center" style={{ width: '6rem' }}>
                                <p className="m-0 fw-bold fs-5">${numberWithCommas(item.debt)}</p>
                                <p className="m-0 text-center" style={{ fontSize: '12px' }}>{item.remark}</p>
                            </div> : ''
                        }

                        {
                            editMode ? <div>
                                <input type="text" className="form-control" placeholder="名稱" value={newRecords.records[index].remark} onChange={(e) => {
                                    updateRecordRemark(setNewRecords, index, e.target.value)
                                }} />
                                <input type="number" className="form-control mt-1" placeholder="金額" value={newRecords.records[index].debt} onChange={(e) => {
                                    updateRecordDebt(setNewRecords, index, Number(e.target.value))
                                }} />
                            </div> : ''
                        }

                    </div>
                </div>)}
                <div className="mt-3 mb-3">
                    <button className="btn btn-primary w-100 mt-3" onClick={async () => {
                        if (!newRecords.title || !newRecords.description || newRecords.records.length === 0) return alert('請填寫標題、描述並新增至少一筆紀錄')
                        if (!firstRef.current) return
                        firstRef.current = false
                        await saveDatabase(newRecords, userInfo.current.groupId)
                        alert('紀錄新增成功')
                        setNewRecords({ title: '', description: '', records: [] })
                        setAddRecordMenuState(false)
                        await getConfigData()// section1
                        await getRecentRecords()// section2
                        firstRef.current = true
                    }}>確認新增</button>
                </div>
            </div>
        </div>
    )
    else return ''
}