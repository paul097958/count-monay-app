import { createContext } from 'react'

export function recordReducer(state, action) {
    switch (action.type) {
        case 'set_newTabOpenState':
            return {
                ...state,
                newTabOpenState: action.value ? true : false,
            }

        case 'set_addBorrower':
            return {
                ...state,
                addBorrower: action.value
            }

        case 'set_addDebtor':
            return {
                ...state,
                addDebtor: action.value
            }

        case 'set_addDebt':
            return {
                ...state,
                addDebt: action.value
            }

        case 'set_addRemark':
            return {
                ...state,
                addRemark: action.value
            }

        case 'set_addType':
            return {
                ...state,
                addType: action.value
            }

        case 'set_editMode':
            return {
                ...state,
                editMode: action.value ? true : false
            }
        case 'clear':
            return {
                newTabOpenState: false,
                addBorrower: '',
                addDebtor: '',
                addDebt: 0,
                addRemark: '',
                addType: '',
                editMode: false
            }
        default:
            return state
    }
}

export const RecordContext = createContext(null)
