import { ClipLoader } from 'react-spinners'
import { useContext } from 'react'
import { AppContext } from '../common/Reducer.js'

export default function Loading() {
  const context = useContext(AppContext)
  if (context.state.loading)
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{
          width: '100vw',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          zIndex: 999,
        }}
      >
        <ClipLoader
          color="#000"
          loading={context.state.loading}
          size={150}
          aria-label="Loading Spinner"
          data-testid="loader"
        />
      </div>
    )
  else return <></>
}
