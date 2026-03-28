import { ClipLoader } from 'react-spinners'

export default function Loading({ loading }) {
  if (loading)
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
        <ClipLoader color="#000" loading={loading} size={150} aria-label="Loading Spinner" data-testid="loader" />
      </div>
    )
  else return <></>
}
