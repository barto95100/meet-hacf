import { useParams } from 'wouter'
import Room from '@/features/rooms/routes/Room'
import { HacfConferenceSupervision } from '../components/HacfConferenceSupervision'

/** Upstream room route, unchanged, plus the HACF supervision link during calls. */
const HacfRoom = () => {
  const { roomId } = useParams()
  return (
    <>
      <Room />
      <HacfConferenceSupervision roomId={roomId} />
    </>
  )
}

export default HacfRoom
