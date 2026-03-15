import './App.css';
import { useEffect, useState, useRef } from 'react';
import liff from "@line/liff";
import { doc, getDoc, collection, getDocs, query, orderBy, limit, runTransaction, startAfter, where } from "firebase/firestore";
import { db } from './config.js';
import { LINE_LIFF } from './config.js';
import BarChart from './components/BarChart.jsx';
import SetRecords from './components/SetRecords.jsx';
import Loading from './components/Loading.jsx';
import Prompt from './components/Prompt.jsx';
import AddRecord from './components/AddRecord.jsx';
import { getUserInfo, numberWithCommas } from './common/RecordFunction.js';



function App() {

  const [configData, setConfigData] = useState({ prompt: '', records: [], users: [] });
  const [debtData, setDebtData] = useState([])
  const [recordsData, setRecordData] = useState([])
  const [recordMenuState, setRecordMenuState] = useState(false)
  const [menu, setMenu] = useState({ title: '', description: '', records: [] })
  const [loading, setLoading] = useState(true)
  const [promptMenuState, setPromptMenuState] = useState(false)
  const [addRecordMenuState, setAddRecordMenuState] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [userRecords, setUserRecords] = useState([])
  const showTotalRef = useRef(0)
  const firstRef = useRef(true)
  const userInfo = useRef({})
  const lastVisible = useRef(null)

  function updateOrAddUser(array, updateData) {
    const { uid } = updateData;
    const newArray = [...array];
    const index = newArray.findIndex(item => item.uid === uid);

    if (index !== -1) {
      newArray[index] = { ...newArray[index], ...updateData };
    } else {
      newArray.push({
        name: '',
        photo: '',
        ...updateData
      });
    }
    return newArray;
  }

  async function updateUsers(identity, userData) {
    const docRef = doc(db, identity, 'config');
    try {
      await runTransaction(db, async (transaction) => {
        const configDoc = await transaction.get(docRef);
        if (!configDoc.exists()) {
          throw "文件不存在！";
        }
        const oldUsers = configDoc.data().users || [];
        const newUsers = updateOrAddUser(oldUsers, userData);
        transaction.update(docRef, { users: newUsers });
      });

      console.log("用戶資料更新成功！");
    } catch (e) {
      console.error('交易失敗:', e);
      throw e;
    }
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  };

  async function getConfigData() {
    const docRef = doc(db, userInfo.current.groupId, 'config');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data()
      setDebtData(await formatDebtRecords(data.users, data.records, userInfo.current.sub))
      setConfigData(data);
    } else {
      alert("No such document!");
    }
  };

  const formatDebtRecords = (users, records, myId) => {
    const formatted = records.flatMap(record => {
      const isFirstMe = record.first === myId;
      const isSecondMe = record.second === myId;

      // 1. 過濾邏輯：如果兩者都不是我，直接回傳空陣列
      if (!isFirstMe && !isSecondMe) {
        return [];
      }

      // 2. 轉換邏輯
      const targetUid = isFirstMe ? record.second : record.first;
      const finalDebt = isFirstMe ? record.debt : record.debt * -1;
      const targetUser = users.find(u => u.uid === targetUid) || {};

      return [{
        uid: targetUid,
        name: targetUser.name || '未知用戶',
        photo: targetUser.photo || '',
        debt: finalDebt
      }];
    });
    return formatted.sort((a, b) => b.debt - a.debt);
  };

  async function getRecentRecords() {
    try {
      const q = query(
        collection(db, userInfo.current.groupId),
        orderBy("createdAt", "desc"),
        limit(10)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setHasMore(false);
      } else {
        lastVisible.current = snapshot.docs[snapshot.docs.length - 1];
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecordData(data);
      }
    } catch (error) {
      console.error("讀取資料失敗：", error);
    }
  };

  async function getNextData() {
    try {
      if (loading || !hasMore) return;
      setLoading(true);
      // 如果沒有上一次的最後一份文件，代表已經沒資料了或還沒開始
      if (!lastVisible.current) {
        console.log("沒有更多資料了");
        return;
      }

      const q = query(
        collection(db, userInfo.current.groupId),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible.current), // 從上一次的結尾開始
        limit(5)
      );

      const snapshot = await getDocs(q);

      // 更新最後一份文件的位置
      if (snapshot.empty) {
        setHasMore(false);
      } else {
        lastVisible.current = snapshot.docs[snapshot.docs.length - 1];
        const newData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 累加資料
        setRecordData(prev => [...prev, ...newData]);
      }

    } catch (error) {
      console.error("讀取下一頁失敗：", error);
    } finally {
      setLoading(false);
    }
  };

  async function getDocsByUserId() {
    try {
      const q = query(
        collection(db, userInfo.current.groupId),
        where("users", "array-contains", userInfo.current.sub),
        orderBy("createdAt", "asc")
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => {
        const docData = doc.data();
        let count = 0;
        const borrowerFilter = docData.records.filter(item => item.borrower === userInfo.current.sub);
        const debtorFilter = docData.records.filter(item => item.debtor === userInfo.current.sub);
        borrowerFilter.forEach(item => count += item.debt)
        debtorFilter.forEach(item => count -= item.debt)
        console.log(count);
        // Return an object or relevant data for each doc
        return {
          id: doc.id,
          title: docData.title,
          description: docData.description,
          createdAt: docData.createdAt,
          detail: [...borrowerFilter, ...debtorFilter],
          users: docData.users,
          shouldGet: count
        };
      });
      setUserRecords(data);
    } catch (error) {
      console.error("查詢失敗：", error);
    }
  }

  function truncateText(str, maxLength) {
    if (!str) return '';
    return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
  };



  useEffect(() => {
    // 1. 先防擋重複執行，放在最前面
    if (firstRef.current) {
      firstRef.current = false;
    } else {
      return;
    }

    // 2. 檢查 ID 是否存在
    if (!LINE_LIFF) {
      console.error("LIFF ID 缺失，請檢查環境變數");
      return;
    }

    liff.init({ liffId: LINE_LIFF, scope: ['profile', 'chat_message.write'] })
      .then(async () => {
        // 3. 檢查登入狀態
        if (!liff.isLoggedIn()) {
          liff.login();
          return; // 登入會跳轉，後面的不用跑
        }

        // 4. 取得身份與網址參數
        const urlParams = new URLSearchParams(window.location.search);
        const identity = urlParams.get('g');

        if (!identity) {
          liff.closeWindow();
          return;
        }

        // 5. 取得 Token 並確保它是物件
        const decodedToken = liff.getDecodedIDToken();
        if (!decodedToken) {
          throw new Error("無法取得用戶資訊 (DecodedIDToken is null)");
        }

        // 確保 userInfo.current 已經是一個物件再賦值
        userInfo.current = {
          ...decodedToken,
          groupId: identity
        };

        console.log("UserInfo loaded:", userInfo.current);

        // 6. 執行後續資料載入
        try {
          await Promise.all([
            getConfigData(),
            getRecentRecords(),
            updateUsers(identity, {
              uid: userInfo.current.sub,
              name: userInfo.current.name,
              photo: userInfo.current.picture
            })
          ]);
          setLoading(false);
        } catch (err) {
          console.error("資料載入失敗:", err);
        }
      })
      .catch((e) => {
        const errData = {
          message: e.message,
          code: e.code,
          stack: e.stack,
          windowUrl: window.location.href,
          liffIdUsed: LINE_LIFF
        };
        console.error("Detailed Error:", errData);
        alert(`初始化失敗！\n原因: ${e.message}\nID: ${LINE_LIFF}\n目前網址: ${window.location.href}`);
      });
  }, []);

  return (
    <div className="App">
      <Loading loading={loading} />
      <AddRecord
        addRecordMenuState={addRecordMenuState}
        setAddRecordMenuState={setAddRecordMenuState}
        configData={configData}
        userInfo={userInfo}
        getConfigData={getConfigData}
        getRecentRecords={getRecentRecords}
        users={configData.users}
      />
      <SetRecords
        recordMenuState={recordMenuState}
        setRecordMenuState={setRecordMenuState}
        menu={menu}
        setMenu={setMenu}
        users={configData.users}
        userInfo={userInfo}
        getConfigData={getConfigData}
        getRecentRecords={getRecentRecords}
      />
      <Prompt
        promptMenuState={promptMenuState}
        setPromptMenuState={setPromptMenuState}
        configData={configData}
        userInfo={userInfo}
      />
      <nav className="navbar bg-primary-subtle">
        <div className="container-fluid">
          <a className="navbar-brand d-flex align-items-center gap-3" href="#">
            <img src="/logo.jpg" alt="Logo" height="35" className="d-inline-block align-text-top" />
            <span className='fs-5'>算錢工具 v0.1.3</span>
          </a>
        </div>
      </nav>
      <div className='container'>
        <div className='m-3'>
          <div className='bg-light rounded border p-2 shadow shadow-sm'>
            <div className='text-start'>
              <p className='fs-4 fw-medium mb-0'>欠款專區</p>
              <p className='fw-light m-0' style={{ fontSize: '12px' }}>紅色為欠你錢、綠色為你欠別人錢</p>
              <div className='mt-2 d-flex flex-wrap gap-2'>
                {debtData.filter(item => item.debt !== 0).map(item => <img src={item.photo || '/gray-icon.png'} alt={item.name} className='rounded shadow-sm border' style={{ height: '2rem' }} />)}
              </div>
            </div>
            <div>
              <BarChart
                rawData={debtData.filter(item => item.debt !== 0).map(item => item.debt)}
                labels={debtData.filter(item => item.debt !== 0).map(item => item.name)} />
            </div>
          </div>
          <div className='bg-light rounded border p-2 shadow shadow-sm mt-2'>
            <div className='text-start'>
              <p className='fs-4 fw-medium mb-0'>明細專區</p>
              <p className='fw-light m-0' style={{ fontSize: '12px' }}>在這裡將顯示所有交易的明細紀錄</p>
            </div>
            <button className='btn btn-outline-primary w-100 mt-2' onClick={() => {
              setAddRecordMenuState(true)
            }}>新增明細</button>
            <div className='mt-2 list-group'>
              {
                recordsData.map(item => <div className='list-group-item list-group-item-action d-flex align-items-center p-1 shadow-sm mb-2 rounded border' onClick={() => {
                  setMenu({ ...item })
                  setRecordMenuState(true)
                }} style={{ height: '5rem' }}>
                  <div className='d-flex flex-column align-items-start mx-2'>
                    <div className="fw-bold user-select-none text-center text-nowrap" style={{ fontSize: '1.1rem', color: '#0d6efd' }}>
                      {truncateText(item.title || '未命名', 12)}
                    </div>
                    <div className="text-muted small text-start user-select-none" style={{ fontSize: '0.8rem' }}>
                      {truncateText(item.description || '未設定', 15)}
                    </div>
                  </div>
                  <span className="text-muted small ms-auto fw-light user-select-none mx-2" style={{ fontSize: '10px' }}>
                    {formatTimestamp(item.createdAt)}
                  </span>
                </div>)
              }
            </div>
            <div>
              {
                hasMore ? <button className="fs-6 btn btn-link p-0" type="button" onClick={async () => {
                  await getNextData()
                }}>加載更多...</button> : ''
              }
            </div>
          </div>
          <div className='bg-light rounded border p-2 shadow shadow-sm mt-2'>
            <div className='text-start'>
              <p className='fs-4 fw-medium mb-0'>帳目詳情</p>
              <p className='fw-light m-0' style={{ fontSize: '12px' }}>在這裡將顯示所有欠款與還款詳情</p>
            </div>
            <button
              className={`btn btn-link mt-2 w-100 ${userRecords.length !== 0 ? 'd-none' : ''}`}
              type="button"
              onClick={async () => {
                await getDocsByUserId()
              }}
            >取得帳目</button>
            <div className={`text-start mt-2 ${userRecords.length === 0 ? 'd-none' : 'd-block'}`}>
              <p className={`mb-0 d-flex align-items-center ${userRecords.length === 0 ? 'd-none' : ''}`}>你{userRecords.reduce((sum, item) => sum + item.shouldGet, 0) >= 0 ? '應得' : '應付'}<strong className='fs-1 mx-1'>{userRecords.reduce((sum, item) => sum + item.shouldGet, 0)}</strong></p>
              <p className={userRecords.length === 0 ? 'd-none' : `fw-bold border p-1 text-center rounded shadow-sm mt-2 mb-3 ${userRecords.reduce((sum, item) => sum + item.shouldGet, 0) ? 'bg-success-subtle' : 'bg-danger-subtle'}`}>{debtData
                .filter(item => item.debt !== 0)
                .map(item => item.debt)
                .reduce((sum, current) => sum + current, 0) === userRecords.reduce((sum, item) => sum + item.shouldGet, 0) ? '帳目正確' : '帳目有誤'}</p>
              <p>{userRecords.map((item, index) => {
                showTotalRef.current += item.shouldGet
                if (item.shouldGet >= 0) {
                  return (index === 0 ? '' : ' + ') + Math.abs(item.shouldGet).toString()
                } else {
                  return ' - ' + Math.abs(item.shouldGet).toString()
                }
              })}</p>
            </div>
            <div className={`list-group mt-2 ${userRecords.length === 0 ? 'd-none' : ''}`}>
              {
                userRecords.map(item => <div className='list-group-item d-flex flex-column justify-content-start mb-2 bg-light px-1' style={{ minHeight: '5rem', border: 'none' }}>
                  <p className="fw-bold user-select-none text-nowrap text-start mb-0" style={{ fontSize: '1.1rem', color: '#0d6efd' }}>{item.title}</p>
                  <p className="text-muted small text-start user-select-none mb-0" style={{ fontSize: '0.8rem' }}>{item.description}</p>
                  <p className="text-start user-select-none" style={{ fontSize: '0.8rem' }}>
                    {formatTimestamp(item.createdAt)}
                  </p>
                  <p className='fs-4' style={{ backgroundColor: item.shouldGet < 0 ? '#4ade80' : '#f87171' }}>{item.shouldGet < 0 ? '你應付' : '你應得'} {Math.abs(item.shouldGet)}</p>
                  <div>
                    {
                      item.detail.map(itemBody => {
                        return <div className="d-flex align-items-center justify-content-center mb-4">
                          <div className="text-center" style={{ width: '4rem' }}>
                            <img src={getUserInfo(configData.users, itemBody.borrower).photo} style={{ height: '2rem' }} alt="user" />
                            <p className="m-0" style={{ fontSize: '12px' }}>{getUserInfo(configData.users, itemBody.borrower).name}</p>
                          </div>
                          <img src="/arrow.png" style={{ height: '3rem' }} alt="arrow" />
                          <div className="text-center" style={{ width: '4rem', marginRight: '2rem' }}>
                            <img src={getUserInfo(configData.users, itemBody.debtor).photo} style={{ height: '2rem' }} alt="user" />
                            <p className="m-0" style={{ fontSize: '12px' }}>{getUserInfo(configData.users, itemBody.debtor).name}</p>
                          </div>
                          <div className="mx-4 d-flex flex-column align-items-center" style={{ width: '6rem' }}>
                            <p className="m-0 fw-bold fs-5">${numberWithCommas(itemBody.debt)}</p>
                            <p className="m-0 text-center" style={{ fontSize: '12px' }}>{itemBody.remark}</p>
                          </div>
                        </div>
                      })
                    }
                  </div>
                </div>)
              }
            </div>
          </div>
          <div className='bg-light rounded border p-2 shadow shadow-sm mt-2'>
            <div className='text-start'>
              <p className='fs-6 fw-medium mb-0'>設定專區</p>
              <p className='fw-light m-0' style={{ fontSize: '12px' }}>在這裡將設定算錢工具機器人和權限</p>
            </div>
            <div className='mt-2 d-flex gap-1'>
              <button className='btn btn-secondary' onClick={() => {
                setPromptMenuState(true)
              }}>提示詞設定</button>
              <button className='btn btn-secondary'>人員設定</button>
              <button className='btn btn-warning'>權限設定</button>
            </div>
          </div>
        </div>
      </div>
      <footer className='text-center text-secondary bg-light p-4 mt-4' style={{ fontSize: '12px' }}>
        <p className='m-0'>Copyright © 2026 算錢工具 All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
