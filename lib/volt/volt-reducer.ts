// lib/volt/volt-reducer.ts
import type { VoltStudioState, VoltStudioAction, VoltElementData } from '@/types/volt'

function pushHistory(state: VoltStudioState): VoltStudioState {
  const history = state.history.slice(0, state.historyIndex + 1)
  const newHistory = [...history, structuredClone(state.element)].slice(-50)
  return {
    ...state,
    history: newHistory,
    historyIndex: Math.min(history.length, 49),
  }
}

export function voltReducer(state: VoltStudioState, action: VoltStudioAction): VoltStudioState {
  switch (action.type) {
    case 'SET_TOOL':
      return { ...state, activeTool: action.tool }

    case 'SET_ACTIVE_STATE':
      return { ...state, activeState: action.state }

    case 'SELECT_LAYER':
      return { ...state, selectedLayerId: action.id }

    case 'ADD_LAYER': {
      const next = pushHistory(state)
      const maxZ = state.element.layers.reduce((m, l) => Math.max(m, l.zIndex), -1)
      const layer = { ...action.layer, zIndex: maxZ + 1 }
      return {
        ...next,
        element: { ...next.element, layers: [...next.element.layers, layer] },
        selectedLayerId: layer.id,
        isDirty: true,
      }
    }

    case 'UPDATE_LAYER': {
      const next = pushHistory(state)
      return {
        ...next,
        element: {
          ...next.element,
          layers: next.element.layers.map(l =>
            l.id === action.id ? { ...l, ...action.updates } : l
          ),
        },
        isDirty: true,
      }
    }

    case 'DELETE_LAYER': {
      const next = pushHistory(state)
      return {
        ...next,
        element: {
          ...next.element,
          layers: next.element.layers.filter(l => l.id !== action.id),
        },
        selectedLayerId: state.selectedLayerId === action.id ? null : state.selectedLayerId,
        isDirty: true,
      }
    }

    case 'REORDER_LAYERS': {
      const next = pushHistory(state)
      return {
        ...next,
        element: { ...next.element, layers: action.layers },
        isDirty: true,
      }
    }

    case 'TOGGLE_LAYER_VISIBILITY': {
      const next = pushHistory(state)
      return {
        ...next,
        element: {
          ...next.element,
          layers: next.element.layers.map(l =>
            l.id === action.id ? { ...l, visible: !l.visible } : l
          ),
        },
        isDirty: true,
      }
    }

    case 'TOGGLE_LAYER_LOCK': {
      const next = pushHistory(state)
      return {
        ...next,
        element: {
          ...next.element,
          layers: next.element.layers.map(l =>
            l.id === action.id ? { ...l, locked: !l.locked } : l
          ),
        },
        isDirty: true,
      }
    }

    case 'SET_ZOOM':
      return { ...state, zoom: Math.min(Math.max(action.zoom, 0.1), 5) }

    case 'SET_PAN':
      return { ...state, panX: action.x, panY: action.y }

    case 'SET_ELEMENT_NAME': {
      const next = pushHistory(state)
      return {
        ...next,
        element: { ...next.element, name: action.name },
        isDirty: true,
      }
    }

    case 'LOAD_ELEMENT':
      return {
        ...state,
        element: action.element,
        selectedLayerId: null,
        activeState: 'rest',
        history: [structuredClone(action.element)],
        historyIndex: 0,
        isDirty: false,
      }

    case 'UNDO': {
      if (state.historyIndex <= 0) return state
      const idx = state.historyIndex - 1
      return {
        ...state,
        element: structuredClone(state.history[idx]),
        historyIndex: idx,
        isDirty: true,
      }
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state
      const idx = state.historyIndex + 1
      return {
        ...state,
        element: structuredClone(state.history[idx]),
        historyIndex: idx,
        isDirty: true,
      }
    }

    case 'MARK_SAVED':
      return { ...state, isDirty: false }

    default:
      return state
  }
}

export function createInitialState(element: VoltElementData): VoltStudioState {
  return {
    element,
    selectedLayerId: null,
    activeState: 'rest',
    activeTool: 'select',
    zoom: 1,
    panX: 0,
    panY: 0,
    isDirty: false,
    history: [structuredClone(element)],
    historyIndex: 0,
  }
}
