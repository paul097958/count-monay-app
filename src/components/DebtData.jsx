import { useContext, useEffect, useState } from 'react'
import { AppContext } from '../reducers/appReducer.js'
import useClientWidth from '../hooks/useClientWidth.jsx'
import BarChart from './BarChart.jsx'

export default function DebtData({ containerRef }) {
    const context = useContext(AppContext)
    const width = useClientWidth(containerRef);
    const [imgWidth, setImgWidth] = useState((width / context.state.debtData.length) > 30 ? 30 : (width / context.state.debtData.length))
    const [rawData, setRawData] = useState(context.state.debtData.filter((item) => item.debt !== 0).map((item) => item.debt))
    const [labels, setLabels] = useState(context.state.debtData.filter((item) => item.debt !== 0).map((item) => item.name))
    useEffect(() => {
        setImgWidth((width / context.state.debtData.length) > 30 ? 30 : (width / context.state.debtData.length))
        setRawData(context.state.debtData.filter((item) => item.debt !== 0).map((item) => item.debt))
        setLabels(context.state.debtData.filter((item) => item.debt !== 0).map((item) => item.name))
    }, [width, context.state.debtData])

    return (
        <div className='mb-3'>
            <div className="text-start">
                <p className="fs-2 fw-medium mb-0">欠款專區</p>
                <p className="fw-light">
                    紅色為欠你錢、綠色為你欠別人錢
                </p>
                <div className="mt-3 d-flex flex-wrap">
                    {context.state.debtData
                        .filter((item) => item.debt !== 0)
                        .map((item) => (
                            <img
                                src={item.photo || '/gray-icon.png'}
                                alt={item.name}
                                className="rounded shadow-sm border"
                                style={{ width: `${imgWidth}px`, height: `${imgWidth}px`, marginRight: `${(width / context.state.debtData.length / 5)}px` }}
                            />
                        ))}
                </div>
            </div>
            {
                (rawData.length === 0) ? <div>
                    <p className='fs-4 text-secondary'>太棒了，你沒有任何債務</p>
                </div> : <div style={{ position: 'relative', left: '-1rem' }}>
                    <BarChart
                        rawData={context.state.debtData.filter((item) => item.debt !== 0).map((item) => item.debt)}
                        labels={context.state.debtData.filter((item) => item.debt !== 0).map((item) => item.name)}
                    />
                </div>
            }
        </div>
    )
}