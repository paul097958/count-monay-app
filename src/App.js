import './App.css';
import { useEffect, useState, useRef } from 'react';
import liff from "@line/liff";
import { doc, getDoc, collection, getDocs, query, orderBy, limit, runTransaction } from "firebase/firestore";
import { db } from './config.js';
import { LINE_LIFF } from './config.js';
import BarChart from './components/BarChart.jsx';
import SetRecords from './components/SetRecords.jsx';
import Loading from './components/Loading.jsx';
import Prompt from './components/Prompt.jsx';
import AddRecord from './components/AddRecord.jsx';



function App() {

  const [configData, setConfigData] = useState({ prompt: '', records: [], users: [] });
  const [debtData, setDebtData] = useState([])
  const [recordsData, setRecordData] = useState([])
  const [recordMenuState, setRecordMenuState] = useState(false)
  const [menu, setMenu] = useState({ title: '', description: '', records: [] })
  const [loading, setLoading] = useState(true)
  const [promptMenuState, setPromptMenuState] = useState(false)
  const [addRecordMenuState, setAddRecordMenuState] = useState(false)
  const firstRef = useRef(true)
  const userInfo = useRef({})

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
        limit(20)
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecordData(data)
    } catch (error) {
      console.error("讀取資料失敗：", error);
    }
  };

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

    liff.init({ liffId: LINE_LIFF })
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
            <span className='fs-5'>算錢工具 v0.1.1</span>
          </a>
        </div>
      </nav>
      <div className='container'>
        <div className='m-3'>
          <div className='bg-light rounded border p-2 shadow shadow-sm'>
            <div className='text-start'>
              <p className='fs-6 fw-medium mb-0'>欠款專區</p>
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
              <p className='fs-6 fw-medium mb-0'>明細專區</p>
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
