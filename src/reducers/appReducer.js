import { createContext } from 'react'

export function appReducer(state, action) {
  switch (action.type) {
    case 'set_loading':
      return {
        ...state,
        loading: action.value,
      }

    case 'change_page':
      if (action.name === 'add_record' || action.name === 'prompt_menu' || action.name === 'none') {
        return {
          ...state,
          pageState: action.name,
        }
      }
      return state

    case 'set_recordMenu':
      if (action.value === null) {
        return {
          ...state,
          recordMenu: null
        }
      } else {
        return {
          ...state,
          recordMenu: {
            title: action.value?.title || '未命名',
            description: action.value?.description || '未命名',
            records: action.value?.records || [],
          },
        }
      }
    case 'set_debtData':
      return {
        ...state,
        debtData: action.value,
      }

    case 'set_configData':
      return {
        ...state,
        configData: action.value,
      }

    case 'set_recordsData':
      return {
        ...state,
        recordsData: action.name === 'accumulate' ? [...state.recordsData, ...action.value] : action.value,
      }

    case 'set_hasMore':
      return {
        ...state,
        hasMore: false,
      }

    default:
      return state
  }
}

export const AppContext = createContext(null)
