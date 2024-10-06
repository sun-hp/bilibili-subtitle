import {useAppDispatch, useAppSelector} from './redux'
import React, {useCallback} from 'react'
import {setNeedScroll, setReviewAction, setTempData} from '../redux/envReducer'
import useMessaging from '../messaging/layer2/useMessaging'
const useSubtitle = () => {
  const dispatch = useAppDispatch()
  const reviewed = useAppSelector(state => state.env.tempData.reviewed)
  const reviewAction = useAppSelector(state => state.env.reviewAction)
  const reviewActions = useAppSelector(state => state.env.tempData.reviewActions)
  const {sendInject} = useMessaging()
  
  const move = useCallback((time: number, togglePause: boolean) => {
    sendInject('MOVE', {time, togglePause})

    //review action
    if (reviewed === undefined && !reviewAction) {
      dispatch(setReviewAction(true))
      dispatch(setTempData({
        reviewActions: (reviewActions ?? 0) + 1
      }))
    }
  }, [dispatch, reviewAction, reviewActions, reviewed])

  const scrollIntoView = useCallback((ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({behavior: 'smooth', block: 'center'})
    dispatch(setNeedScroll(false))
  }, [dispatch])

  return {move, scrollIntoView}
}

export default useSubtitle
