import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import { REDUCED_MOTION_QUERY } from './device'

/** Keeps `calm` in the store in step with the system's reduced-motion setting, if it changes during the visit. */
export function useReducedMotionSync() {
  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION_QUERY)
    const update = () => useStore.getState().setCalm(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
}
