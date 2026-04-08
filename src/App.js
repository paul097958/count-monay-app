import './App.css'
import { useEffect, useState, useRef, createContext, useReducer } from 'react'
import liff from '@line/liff'
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
  onSnapshot
} from 'firebase/firestore'
import { db } from './config.js'
import { LINE_LIFF } from './config.js'
import SetRecords from './components/SetRecords.jsx'
import Loading from './components/Loading.jsx'
import Prompt from './components/Prompt.jsx'
import AddRecord from './components/AddRecord.jsx'
import { appReducer, AppContext } from './reducers/appReducer.js'
import Detail from './components/Detail.jsx'
import DebtData from './components/DebtData.jsx'
import RecordsData from './components/RecordsData.jsx'

function App() {
  const [state, dispatch] = useReducer(appReducer, {
    configData: { prompt: '', records: [], users: [] },
    debtData: [],
    recordsData: [],
    recordMenu: null,
    loading: true,
    pageState: null,
    hasMore: true,
  })
  const firstRef = useRef(true)
  const userInfo = useRef({})
  const lastVisible = useRef(null)
  const containerRef = useRef()

  useEffect(() => {
    console.log(state.recordMenu);

  }, [state.recordMenu])

  function updateOrAddUser(array, updateData) {
    const { uid } = updateData
    const newArray = [...array]
    const index = newArray.findIndex((item) => item.uid === uid)

    if (index !== -1) {
      newArray[index] = { ...newArray[index], ...updateData }
    } else {
      newArray.push({
        name: '',
        photo: '',
        ...updateData,
      })
    }
    return newArray
  }

  async function updateUsers(identity, userData) {
    const docRef = doc(db, identity, 'config')
    try {
      await runTransaction(db, async (transaction) => {
        const configDoc = await transaction.get(docRef)
        if (!configDoc.exists()) {
          throw '文件不存在！'
        }
        const oldUsers = configDoc.data().users || []
        const newUsers = updateOrAddUser(oldUsers, userData)
        transaction.update(docRef, { users: newUsers })
      })

      console.log('用戶資料更新成功！')
    } catch (e) {
      console.error('交易失敗:', e)
      throw e
    }
  }



  const formatDebtRecords = (users, records, myId) => {
    const formatted = records.flatMap((record) => {
      const isFirstMe = record.first === myId
      const isSecondMe = record.second === myId

      // 1. 過濾邏輯：如果兩者都不是我，直接回傳空陣列
      if (!isFirstMe && !isSecondMe) {
        return []
      }

      // 2. 轉換邏輯
      const targetUid = isFirstMe ? record.second : record.first
      const finalDebt = isFirstMe ? record.debt : record.debt * -1
      const targetUser = users.find((u) => u.uid === targetUid) || {}

      return [
        {
          uid: targetUid,
          name: targetUser.name || '未知用戶',
          photo: targetUser.photo || '',
          debt: finalDebt,
        },
      ]
    })
    return formatted.sort((a, b) => b.debt - a.debt)
  }



  useEffect(() => {
    if (!userInfo.current?.groupId) return;

    const q = query(
      collection(db, userInfo.current.groupId),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const docRef = doc(db, userInfo.current.groupId, 'config');

    const unsubscribeGetConfigData = onSnapshot(docRef, async (docSnap) => {
      dispatch({ type: 'set_loading', value: true })
      if (docSnap.exists()) {
        const data = docSnap.data();
        try {
          const formattedDebt = await formatDebtRecords(
            data.users,
            data.records,
            userInfo.current.sub
          );

          dispatch({ type: 'set_debtData', value: formattedDebt });
          dispatch({ type: 'set_configData', value: data });
          dispatch({ type: 'set_loading', value: false })
        } catch (err) {
          console.error('格式化資料失敗：', err);
        }
      } else {
        console.warn('找不到設定文件 (config)!');
      }
    }, (error) => {
      console.error('監聽 Config 失敗：', error);
    });

    const unsubscribeGetRecentRecords = onSnapshot(q,
      (snapshot) => {
        dispatch({ type: 'set_loading', value: true })
        if (snapshot.empty) {
          dispatch({ type: 'set_hasMore' });
          dispatch({ type: 'set_recordsData', value: [] });
        } else {
          lastVisible.current = snapshot.docs[snapshot.docs.length - 1];
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          dispatch({ type: 'set_recordsData', value: data });
        }
        dispatch({ type: 'set_loading', value: false })
      },
      (error) => {
        console.error('實時讀取資料失敗：', error);
      }
    );
    return () => {
      unsubscribeGetRecentRecords()
      unsubscribeGetConfigData()
    }
  }, [userInfo.current?.groupId]); // 當 groupId 改變時重新監聽



  useEffect(() => {
    // 1. 先防擋重複執行，放在最前面
    if (firstRef.current) {
      firstRef.current = false
    } else {
      return
    }

    // 2. 檢查 ID 是否存在
    if (!LINE_LIFF) {
      console.error('LIFF ID 缺失，請檢查環境變數')
      return
    }

    liff
      .init({ liffId: LINE_LIFF, scope: ['profile', 'chat_message.write'] })
      .then(async () => {
        // 3. 檢查登入狀態
        if (!liff.isLoggedIn()) {
          liff.login()
          return // 登入會跳轉，後面的不用跑
        }

        // 4. 取得身份與網址參數
        const urlParams = new URLSearchParams(window.location.search)
        const identity = urlParams.get('g')

        if (!identity) {
          liff.closeWindow()
          return
        }

        // 5. 取得 Token 並確保它是物件
        const decodedToken = liff.getDecodedIDToken()
        if (!decodedToken) {
          throw new Error('無法取得用戶資訊 (DecodedIDToken is null)')
        }

        // 確保 userInfo.current 已經是一個物件再賦值
        userInfo.current = {
          ...decodedToken,
          groupId: identity,
        }

        console.log('UserInfo loaded:', userInfo.current)

        // 6. 執行後續資料載入
        try {
          await updateUsers(identity, {
            uid: userInfo.current.sub,
            name: userInfo.current.name,
            photo: userInfo.current.picture,
          })
          dispatch({ type: 'set_loading', value: false })
        } catch (err) {
          console.error('資料載入失敗:', err)
        }
      })
      .catch((e) => {
        const errData = {
          message: e.message,
          code: e.code,
          stack: e.stack,
          windowUrl: window.location.href,
          liffIdUsed: LINE_LIFF,
        }
        console.error('Detailed Error:', errData)
        alert(`初始化失敗！\n原因: ${e.message}\nID: ${LINE_LIFF}\n目前網址: ${window.location.href}`)
      })
  }, [])

  return (
    <AppContext.Provider value={{ state, dispatch, userInfo }}>
      <div className="App">
        <Loading />
        <AddRecord />
        <SetRecords />
        <Prompt />
        <nav className="navbar bg-primary-subtle">
          <div className="container-fluid">
            <div className="navbar-brand d-flex align-items-center gap-3">
              <img src="/logo.jpg" alt="Logo" height="35" className="d-inline-block align-text-top" />
              <span className="fs-5">算錢工具 v0.3.0beta</span>
            </div>
          </div>
        </nav>
        <div className="container p-4" ref={containerRef} style={{ maxWidth: '40rem' }}>
          <DebtData containerRef={containerRef} />
          <hr />
          <RecordsData lastVisible={lastVisible} />
          <hr />
          <Detail />
          <hr />
          <div>
            <div className="text-start">
              <p className="fs-2 fw-medium mb-0">設定專區</p>
              <p className="fw-light m-0">
                在這裡將設定算錢工具機器人和權限
              </p>
            </div>
            <div className="mt-2 gap-1 row">
              <button
                className="btn btn-outline-secondary col"
                onClick={() => {
                  dispatch({ type: 'change_page', name: 'prompt_menu' })
                }}
              >
                提示詞設定
              </button>
              <button className="btn btn-outline-secondary col">人員設定</button>
              <button className="btn btn-warning col">權限設定</button>
            </div>
          </div>
        </div>
        <footer className="text-center text-secondary bg-light p-4 mt-4" style={{ fontSize: '12px' }}>
          <p className="m-0">Copyright © 2026 算錢工具 All rights reserved.</p>
        </footer>
      </div>
    </AppContext.Provider>
  )
}

export default App
