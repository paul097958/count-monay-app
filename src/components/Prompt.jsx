import { useState, useEffect, useContext } from 'react'
import { getFirestore, doc, addDoc, collection, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../config.js'
import { AppContext } from '../reducers/appReducer.js'

export default function Prompt() {
  const context = useContext(AppContext)
  const [prompt, setPrompt] = useState(context.state.configData.prompt || '')

  const convertUsersToText = context.state.configData.users.map((user) => `- ${user.name} (${user.uid})`).join('\n')
  useEffect(() => {
    setPrompt(context.state.configData.prompt || '')
  }, [context.state.configData.prompt])

  if (context.state.pageState === 'prompt_menu')
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
            <p className="fs-4 fw-medium mb-0">提示詞設定</p>
            <p className="fw-light m-0" style={{ fontSize: '12px' }}>
              在這裡將可以設定每個人的角色
            </p>
          </div>
          <button
            className="btn btn-primary w-100 mt-2"
            onClick={() => {
              setPrompt(convertUsersToText)
            }}
          >
            直接由現有人員名單匯入
          </button>
          <textarea
            className="form-control mt-2"
            rows={10}
            value={prompt}
            placeholder="請輸入提示詞，建議先按匯入按鈕，再更改"
            onChange={(e) => {
              setPrompt(e.target.value)
            }}
          ></textarea>
          <div className="d-flex gap-2">
            <button
              className="btn btn-secondary w-50 mt-2"
              onClick={() => {
                context.dispatch({ type: 'change_page', name: 'none' })
              }}
            >
              關閉視窗
            </button>
            <button
              className="btn btn-warning w-50 mt-2"
              onClick={async () => {
                await updateDoc(doc(db, context.userInfo.current.groupId, 'config'), {
                  prompt: prompt,
                  updatedAt: serverTimestamp(),
                })
                alert('提示詞已更新')
                context.dispatch({ type: 'change_page', name: 'none' })
              }}
            >
              確認變更
            </button>
          </div>
        </div>
      </div>
    )
  else return ''
}
