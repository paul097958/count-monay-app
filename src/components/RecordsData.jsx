import { useContext } from 'react'
import { AppContext } from '../reducers/appReducer.js'
import { formatTimestamp, truncateText } from '../utils/function.js'
import { collection, orderBy, startAfter, limit, query, getDocs } from 'firebase/firestore'
import { db } from '../config.js'

export default function RecordsData({ lastVisible }) {
    const context = useContext(AppContext)

    async function getNextData() {
        try {
            if (context.state.loading || !context.state.hasMore) return
            context.dispatch({ type: 'set_loading', value: true })
            if (!lastVisible.current) {
                console.log('沒有更多資料了')
                return
            }
            const q = query(
                collection(db, context.userInfo.current.groupId),
                orderBy('createdAt', 'desc'),
                startAfter(lastVisible.current),
                limit(5),
            )
            const snapshot = await getDocs(q)
            if (snapshot.empty) {
                context.dispatch({ type: 'set_hasMore' })
            } else {
                lastVisible.current = snapshot.docs[snapshot.docs.length - 1]
                const newData = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }))
                context.dispatch({ type: 'set_recordsData', value: newData, name: 'accumulate' })
            }
        } catch (error) {
            console.error('讀取下一頁失敗：', error)
        } finally {
            context.dispatch({ type: 'set_loading', value: false })
        }
    }

    return (<div className='mb-3'>
        <div className="text-start">
            <p className="fs-2 fw-medium mb-0">明細專區</p>
            <p className="fw-light m-0">
                在這裡將顯示所有交易的明細紀錄
            </p>
        </div>
        <button
            className="btn btn-primary w-100 mt-2 mb-2"
            onClick={() => {
                context.dispatch({ type: 'change_page', name: 'add_record' })
            }}
        >
            新增明細
        </button>
        <div className="mt-2 list-group">
            {context.state.recordsData.map((item) => (
                <div
                    className="list-group-item list-group-item-action d-flex align-items-center p-1 shadow-sm mb-2 rounded border"
                    onClick={() => {
                        context.dispatch({ type: 'set_recordMenu', value: { ...item } })
                    }}
                    style={{ height: '5rem' }}
                >
                    <div className="d-flex flex-column align-items-start mx-2">
                        <div
                            className="fw-bold user-select-none text-center text-nowrap"
                            style={{ fontSize: '1.1rem', color: '#0d6efd' }}
                        >
                            {truncateText(item.title || '未命名', 12)}
                        </div>
                        <div className="text-muted small text-start user-select-none" style={{ fontSize: '0.8rem' }}>
                            {truncateText(item.description || '未設定', 15)}
                        </div>
                    </div>
                    <span
                        className="text-muted small ms-auto fw-light user-select-none mx-2"
                        style={{ fontSize: '10px' }}
                    >
                        {formatTimestamp(item.createdAt)}
                    </span>
                </div>
            ))}
        </div>
        <div>
            {context.state.hasMore && (
                <button
                    className="fs-6 btn btn-link p-0"
                    type="button"
                    onClick={async () => {
                        await getNextData()
                    }}
                >
                    加載更多...
                </button>
            )}
        </div>
    </div>)
}